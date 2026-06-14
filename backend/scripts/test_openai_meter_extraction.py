import argparse
import os
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
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
    load_root_env()
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


def load_root_env() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip())


if __name__ == "__main__":
    main()
