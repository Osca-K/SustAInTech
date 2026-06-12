from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


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
