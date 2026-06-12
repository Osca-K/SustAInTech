from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


HIGH_CONFIDENCE_THRESHOLD = 0.85
LOW_CONFIDENCE_THRESHOLD = 0.60
IMAGE_QUALITY_STATUSES = {
    "clear",
    "acceptable",
    "blurry",
    "meter_not_visible",
    "reading_not_visible",
    "unsupported",
}
FAILED_IMAGE_QUALITY_STATUSES = {
    "meter_not_visible",
    "reading_not_visible",
    "unsupported",
}


@dataclass(frozen=True)
class MeterPhotoExtractionResult:
    is_water_meter_image: bool
    meter_number: str | None
    reading_kL: float | None
    confidence_score: float
    image_quality_status: str
    extraction_notes: list[str]
    extraction_method: str


class MeterPhotoExtractionAdapter(Protocol):
    def extract(self, image_path: Path) -> MeterPhotoExtractionResult:
        ...


def extraction_status_for_result(result: MeterPhotoExtractionResult) -> str:
    if (
        not result.is_water_meter_image
        or result.image_quality_status in FAILED_IMAGE_QUALITY_STATUSES
    ):
        return "failed"
    if (
        result.confidence_score >= HIGH_CONFIDENCE_THRESHOLD
        and result.meter_number
        and result.reading_kL is not None
        and result.image_quality_status in {"clear", "acceptable"}
    ):
        return "completed"
    return "low_confidence"
