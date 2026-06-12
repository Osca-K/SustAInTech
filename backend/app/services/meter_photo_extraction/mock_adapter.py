import os
from pathlib import Path

from .base import MeterPhotoExtractionResult


EXTRACTION_METHOD = "development_mock_adapter"
DEVELOPMENT_NOTE = "Development placeholder adapter. No real image analysis was performed."


class DevelopmentMockMeterPhotoExtractionAdapter:
    """Development-only placeholder; does not inspect or understand the image."""

    def extract(self, image_path: Path) -> MeterPhotoExtractionResult:
        _ = image_path
        return MeterPhotoExtractionResult(
            is_water_meter_image=_env_bool("SUSTAINTECH_MOCK_METER_IS_WATER_IMAGE", True),
            meter_number=_env_optional_string("SUSTAINTECH_MOCK_METER_NUMBER"),
            reading_kL=_env_optional_float("SUSTAINTECH_MOCK_METER_READING_KL"),
            confidence_score=_env_float("SUSTAINTECH_MOCK_METER_CONFIDENCE", 0.0),
            image_quality_status=os.getenv(
                "SUSTAINTECH_MOCK_METER_IMAGE_QUALITY", "acceptable"
            ),
            extraction_notes=[DEVELOPMENT_NOTE],
            extraction_method=EXTRACTION_METHOD,
        )


def _env_optional_string(name: str) -> str | None:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else None


def _env_optional_float(name: str) -> float | None:
    value = os.getenv(name)
    if not value or not value.strip():
        return None
    return float(value)


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if not value or not value.strip():
        return default
    return float(value)


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if not value:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y"}
