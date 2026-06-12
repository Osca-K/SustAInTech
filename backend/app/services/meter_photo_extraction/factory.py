from ... import config
from .base import MeterPhotoExtractionAdapter
from .mock_adapter import DevelopmentMockMeterPhotoExtractionAdapter
from .openai_vision_adapter import OpenAIVisionMeterPhotoExtractionAdapter


def get_meter_photo_extraction_adapter() -> MeterPhotoExtractionAdapter:
    provider = config.get_meter_extraction_provider()
    if provider == "mock":
        return DevelopmentMockMeterPhotoExtractionAdapter()
    if provider == "openai_vision":
        return OpenAIVisionMeterPhotoExtractionAdapter()
    raise RuntimeError(
        "Unsupported meter extraction provider. "
        "Use SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock or openai_vision."
    )
