import logging
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.meter_photo_extraction.base import extraction_status_for_result
from app.services.meter_photo_extraction.factory import get_meter_photo_extraction_adapter
from app.services.meter_photo_extraction.mock_adapter import (
    DevelopmentMockMeterPhotoExtractionAdapter,
)
from app.services.meter_photo_extraction.openai_vision_adapter import (
    OpenAIVisionMeterPhotoExtractionAdapter,
    image_to_data_url,
)
from test_meter_submissions import image_bytes, meter_client  # noqa: F401


class FakeResponses:
    def __init__(self, response=None, error: Exception | None = None):
        self.response = response
        self.error = error
        self.last_kwargs = None

    def parse(self, **kwargs):
        self.last_kwargs = kwargs
        if self.error:
            raise self.error
        return self.response


class FakeClient:
    def __init__(self, response=None, error: Exception | None = None):
        self.responses = FakeResponses(response, error)


def write_image(tmp_path: Path, filename: str = "meter.jpg") -> Path:
    image_path = tmp_path / filename
    image_path.write_bytes(image_bytes("JPEG"))
    return image_path


def payload(**overrides):
    base = {
        "is_water_meter_image": True,
        "meter_number": "650200",
        "reading_kL": 1284.7,
        "confidence_score": 0.93,
        "image_quality_status": "clear",
        "extraction_notes": [
            "Meter display is visible.",
            "Reading extracted from the main display.",
        ],
    }
    base.update(overrides)
    return base


def test_factory_returns_mock_adapter_by_default(monkeypatch):
    monkeypatch.delenv("SUSTAINTECH_METER_EXTRACTION_PROVIDER", raising=False)

    adapter = get_meter_photo_extraction_adapter()

    assert isinstance(adapter, DevelopmentMockMeterPhotoExtractionAdapter)


def test_factory_returns_openai_adapter_when_configured(monkeypatch):
    monkeypatch.setenv("SUSTAINTECH_METER_EXTRACTION_PROVIDER", "openai_vision")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    adapter = get_meter_photo_extraction_adapter()

    assert isinstance(adapter, OpenAIVisionMeterPhotoExtractionAdapter)


def test_missing_api_key_raises_clear_configuration_error(monkeypatch):
    monkeypatch.setenv("SUSTAINTECH_METER_EXTRACTION_PROVIDER", "openai_vision")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="OPENAI_API_KEY is required"):
        get_meter_photo_extraction_adapter()


def test_valid_structured_openai_response_maps_correctly(tmp_path):
    image_path = write_image(tmp_path)
    client = FakeClient(SimpleNamespace(output_parsed=payload()))
    adapter = OpenAIVisionMeterPhotoExtractionAdapter(
        api_key="test-key",
        model="test-model",
        client=client,
    )

    result = adapter.extract(image_path)

    assert result.extraction_method == "openai_vision"
    assert result.is_water_meter_image is True
    assert result.meter_number == "650200"
    assert result.reading_kL == 1284.7
    assert result.confidence_score == 0.93
    assert result.image_quality_status == "clear"
    assert client.responses.last_kwargs["model"] == "test-model"
    assert "data:image/jpeg;base64," in client.responses.last_kwargs["input"][1]["content"][1]["image_url"]


def test_unclear_response_returns_nullable_values_safely(tmp_path):
    image_path = write_image(tmp_path)
    client = FakeClient(
        SimpleNamespace(
            output_parsed=payload(
                meter_number=None,
                reading_kL=None,
                confidence_score=0.62,
                image_quality_status="reading_not_visible",
                extraction_notes=["Reading is not visible."],
            )
        )
    )
    adapter = OpenAIVisionMeterPhotoExtractionAdapter(api_key="test-key", client=client)

    result = adapter.extract(image_path)

    assert result.meter_number is None
    assert result.reading_kL is None
    assert extraction_status_for_result(result) == "failed"


def test_invalid_schema_is_handled_safely(tmp_path):
    image_path = write_image(tmp_path)
    client = FakeClient(SimpleNamespace(output_parsed={**payload(), "unexpected": "field"}))
    adapter = OpenAIVisionMeterPhotoExtractionAdapter(api_key="test-key", client=client)

    result = adapter.extract(image_path)

    assert result.extraction_method == "openai_vision"
    assert result.is_water_meter_image is False
    assert result.image_quality_status == "unsupported"


def test_api_error_is_handled_safely(tmp_path):
    image_path = write_image(tmp_path)
    client = FakeClient(error=RuntimeError("network down"))
    adapter = OpenAIVisionMeterPhotoExtractionAdapter(api_key="test-key", client=client)

    result = adapter.extract(image_path)

    assert result.is_water_meter_image is False
    assert result.confidence_score == 0.0
    assert "failed" in result.extraction_notes[0].lower()


def test_confidence_thresholds_map_to_extraction_status():
    high = adapter_result(0.93, meter_number="650200", reading_kL=1284.7)
    medium = adapter_result(0.7, meter_number="650200", reading_kL=1284.7)
    missing_value = adapter_result(0.93, meter_number=None, reading_kL=1284.7)
    not_meter = adapter_result(0.95, is_water_meter_image=False)

    assert extraction_status_for_result(high) == "completed"
    assert extraction_status_for_result(medium) == "low_confidence"
    assert extraction_status_for_result(missing_value) == "low_confidence"
    assert extraction_status_for_result(not_meter) == "failed"


def test_raw_base64_image_is_never_logged(tmp_path, caplog):
    image_path = write_image(tmp_path)
    data_url = image_to_data_url(image_path)
    client = FakeClient(error=RuntimeError("service unavailable"))
    adapter = OpenAIVisionMeterPhotoExtractionAdapter(api_key="test-key", client=client)

    with caplog.at_level(logging.WARNING):
        adapter.extract(image_path)

    assert data_url not in caplog.text
    assert "base64" not in caplog.text


def test_resident_confirmation_is_still_required(meter_client, monkeypatch):
    client, ids = meter_client
    from app.routes import meter_submissions

    class HighConfidenceAdapter:
        def extract(self, image_path):
            return adapter_result(0.93, meter_number="659999", reading_kL=111.0)

    monkeypatch.setattr(
        meter_submissions,
        "get_meter_photo_extraction_adapter",
        lambda: HighConfidenceAdapter(),
    )

    response = client.post(
        f"/api/households/{ids['household_id']}/meter-photo-extractions",
        data={"browser_last_modified_at": "2026-06-12T10:00:00Z"},
        files={"image": ("meter.jpg", image_bytes("JPEG"), "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["ai_extraction_status"] == "completed"
    assert response.json()["requires_resident_confirmation"] is True


def test_trusted_database_reading_is_not_created_before_confirmation(
    meter_client,
    monkeypatch,
):
    client, ids = meter_client
    from app.routes import meter_submissions

    class HighConfidenceAdapter:
        def extract(self, image_path):
            return adapter_result(0.93, meter_number="659999", reading_kL=111.0)

    monkeypatch.setattr(
        meter_submissions,
        "get_meter_photo_extraction_adapter",
        lambda: HighConfidenceAdapter(),
    )

    client.post(
        f"/api/households/{ids['household_id']}/meter-photo-extractions",
        data={"browser_last_modified_at": "2026-06-12T10:00:00Z"},
        files={"image": ("meter.jpg", image_bytes("JPEG"), "image/jpeg")},
    )
    history = client.get(f"/api/households/{ids['household_id']}/meter-submissions")
    summary = client.get(f"/api/households/{ids['household_id']}/meter-tracking-summary")

    assert history.json() == []
    assert summary.json()["accepted_submission_count"] == 0


def adapter_result(
    confidence_score: float,
    *,
    is_water_meter_image: bool = True,
    meter_number: str | None = "650200",
    reading_kL: float | None = 1284.7,
):
    from app.services.meter_photo_extraction.base import MeterPhotoExtractionResult

    return MeterPhotoExtractionResult(
        is_water_meter_image=is_water_meter_image,
        meter_number=meter_number,
        reading_kL=reading_kL,
        confidence_score=confidence_score,
        image_quality_status="clear",
        extraction_notes=["Test extraction."],
        extraction_method="openai_vision",
    )
