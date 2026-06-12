from ... import config
from .base import MeterPhotoExtractionAdapter
from .mock_adapter import DevelopmentMockMeterPhotoExtractionAdapter


def get_meter_photo_extraction_adapter() -> MeterPhotoExtractionAdapter:
    provider = config.get_meter_extraction_provider()
    if provider == "mock":
        return DevelopmentMockMeterPhotoExtractionAdapter()
    raise RuntimeError(
        "Unsupported meter extraction provider. "
        "Set SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock for local development."
    )
