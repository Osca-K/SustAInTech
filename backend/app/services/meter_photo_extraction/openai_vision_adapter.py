import base64
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any

from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ... import config
from .base import IMAGE_QUALITY_STATUSES, MeterPhotoExtractionResult


EXTRACTION_METHOD = "openai_vision"
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
logger = logging.getLogger(__name__)

EXTRACTION_INSTRUCTIONS = """You are analysing a household water-meter photo.

Extract only what is visibly supported by the image.

Determine:
1. whether the image shows a water meter;
2. the visible meter number if readable;
3. the visible cumulative meter reading in kL if readable;
4. image quality;
5. a confidence score from 0.0 to 1.0;
6. short extraction notes.

Important:
- Do not guess unreadable digits.
- Return null for values that cannot be read reliably.
- Do not infer a reading from prior household data.
- Do not claim the image is recent.
- Do not validate plausibility.
- Do not classify leaks.
- Do not use external information.
"""


class OpenAIMeterExtractionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_water_meter_image: bool
    meter_number: str | None
    reading_kL: float | None
    confidence_score: float = Field(ge=0.0, le=1.0)
    image_quality_status: str
    extraction_notes: list[str]


class OpenAIVisionMeterPhotoExtractionAdapter:
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        client: OpenAI | None = None,
    ) -> None:
        resolved_api_key = api_key if api_key is not None else config.get_openai_api_key()
        if not resolved_api_key and client is None:
            raise RuntimeError(
                "OPENAI_API_KEY is required when "
                "SUSTAINTECH_METER_EXTRACTION_PROVIDER=openai_vision."
            )
        self.model = model or config.get_openai_vision_model()
        self.client = client or OpenAI(api_key=resolved_api_key)

    def extract(self, image_path: Path) -> MeterPhotoExtractionResult:
        try:
            data_url = image_to_data_url(image_path)
            response = self.client.responses.parse(
                model=self.model,
                input=[
                    {
                        "role": "system",
                        "content": EXTRACTION_INSTRUCTIONS,
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": "Extract the visible water-meter details as structured JSON.",
                            },
                            {
                                "type": "input_image",
                                "image_url": data_url,
                                "detail": "high",
                            },
                        ],
                    },
                ],
                text_format=OpenAIMeterExtractionPayload,
            )
            payload = parse_response_payload(response)
            return result_from_payload(payload)
        except (OSError, ValueError, ValidationError) as exc:
            logger.warning("OpenAI meter extraction returned an untrusted result: %s", exc)
            return failed_result("OpenAI vision extraction result could not be trusted.")
        except Exception as exc:
            logger.warning("OpenAI meter extraction failed: %s", exc.__class__.__name__)
            return failed_result("OpenAI vision extraction failed. Resident confirmation is required.")


def image_to_data_url(image_path: Path) -> str:
    if not image_path.exists() or not image_path.is_file():
        raise ValueError("Meter image file does not exist.")

    content_type = mimetypes.guess_type(image_path.name)[0]
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise ValueError("Unsupported image MIME type for OpenAI vision extraction.")

    content = image_path.read_bytes()
    if not content:
        raise ValueError("Meter image file is empty.")

    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def parse_response_payload(response: Any) -> OpenAIMeterExtractionPayload:
    parsed = getattr(response, "output_parsed", None)
    if isinstance(parsed, OpenAIMeterExtractionPayload):
        return parsed
    if isinstance(parsed, dict):
        return OpenAIMeterExtractionPayload.model_validate(parsed)

    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return OpenAIMeterExtractionPayload.model_validate_json(output_text)

    return OpenAIMeterExtractionPayload.model_validate_json(json.dumps(response))


def result_from_payload(payload: OpenAIMeterExtractionPayload) -> MeterPhotoExtractionResult:
    if payload.image_quality_status not in IMAGE_QUALITY_STATUSES:
        raise ValueError("Unsupported image quality status.")
    return MeterPhotoExtractionResult(
        is_water_meter_image=payload.is_water_meter_image,
        meter_number=payload.meter_number,
        reading_kL=payload.reading_kL,
        confidence_score=payload.confidence_score,
        image_quality_status=payload.image_quality_status,
        extraction_notes=payload.extraction_notes,
        extraction_method=EXTRACTION_METHOD,
    )


def failed_result(note: str) -> MeterPhotoExtractionResult:
    return MeterPhotoExtractionResult(
        is_water_meter_image=False,
        meter_number=None,
        reading_kL=None,
        confidence_score=0.0,
        image_quality_status="unsupported",
        extraction_notes=[note],
        extraction_method=EXTRACTION_METHOD,
    )
