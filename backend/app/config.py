import os
from pathlib import Path


APP_NAME = "SustAInTech API"
APP_VERSION = "0.1.0"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = REPO_ROOT / "database" / "local" / "sustaintech_dev.db"
DEFAULT_METER_UPLOADS_PATH = REPO_ROOT / "storage" / "household-meter-uploads"


def get_database_path() -> Path:
    return DEFAULT_DATABASE_PATH


def get_meter_uploads_path() -> Path:
    configured = os.getenv("SUSTAINTECH_METER_UPLOADS_PATH")
    return Path(configured) if configured else DEFAULT_METER_UPLOADS_PATH


def get_meter_extraction_provider() -> str:
    return os.getenv("SUSTAINTECH_METER_EXTRACTION_PROVIDER", "mock").strip().lower()


def get_openai_api_key() -> str | None:
    configured = os.getenv("OPENAI_API_KEY")
    return configured.strip() if configured and configured.strip() else None


def get_openai_vision_model() -> str:
    return os.getenv("SUSTAINTECH_OPENAI_VISION_MODEL", "gpt-5.5").strip() or "gpt-5.5"
