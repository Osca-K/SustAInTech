from pathlib import Path


APP_NAME = "SustAInTech API"
APP_VERSION = "0.1.0"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = REPO_ROOT / "database" / "local" / "sustaintech_dev.db"


def get_database_path() -> Path:
    return DEFAULT_DATABASE_PATH
