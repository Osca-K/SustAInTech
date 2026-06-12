import argparse
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app import config  # noqa: E402
from app.services.meter_photo_extraction.openai_vision_adapter import (  # noqa: E402
    OpenAIVisionMeterPhotoExtractionAdapter,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a live OpenAI water-meter photo extraction smoke test."
    )
    parser.add_argument("--image", required=True, help="Path to a water-meter image file.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not config.get_openai_api_key():
        raise SystemExit("OPENAI_API_KEY is required for this live smoke test.")

    result = OpenAIVisionMeterPhotoExtractionAdapter().extract(Path(args.image))
    print(f"is_water_meter_image: {result.is_water_meter_image}")
    print(f"meter_number: {result.meter_number}")
    print(f"reading_kL: {result.reading_kL}")
    print(f"confidence_score: {result.confidence_score}")
    print(f"image_quality_status: {result.image_quality_status}")
    print("extraction_notes:")
    for note in result.extraction_notes:
        print(f"- {note}")


if __name__ == "__main__":
    main()
