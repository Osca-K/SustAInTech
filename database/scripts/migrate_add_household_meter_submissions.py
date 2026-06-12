import sqlite3
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"

CREATE_TABLE_SQL = """
CREATE TABLE household_meter_submissions (
  submission_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  meter_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_original_filename TEXT NOT NULL,
  image_content_type TEXT NOT NULL,
  image_size_bytes INTEGER NOT NULL CHECK (image_size_bytes > 0),
  image_hash_sha256 TEXT NOT NULL UNIQUE,
  browser_last_modified_at TEXT,
  exif_datetime_original TEXT,
  image_age_minutes REAL,
  image_freshness_status TEXT NOT NULL CHECK (image_freshness_status IN ('recent', 'stale', 'metadata_missing', 'metadata_inconsistent')),
  submitted_reading_kL REAL NOT NULL CHECK (submitted_reading_kL >= 0),
  usage_since_previous_reading_kL REAL,
  elapsed_hours_since_previous_reading REAL,
  estimated_daily_usage_kL REAL,
  reading_source TEXT NOT NULL CHECK (reading_source IN ('resident_manual', 'ai_extracted_resident_confirmed', 'ai_extracted_resident_corrected')),
  validation_status TEXT NOT NULL CHECK (validation_status IN ('accepted', 'review_required', 'rejected', 'duplicate_image', 'retake_required')),
  validation_notes_json TEXT NOT NULL,
  resident_confirmed INTEGER NOT NULL CHECK (resident_confirmed IN (0, 1)),
  resident_corrected_value REAL,
  ai_extracted_meter_number TEXT,
  ai_extracted_reading_kL REAL,
  ai_confidence_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(household_id),
  FOREIGN KEY (meter_id) REFERENCES water_meters(meter_id)
);
"""


def table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def migrate(db_path: Path = DEFAULT_DB_PATH) -> str:
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database does not exist: {db_path}")

    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        if table_exists(connection, "household_meter_submissions"):
            return "household_meter_submissions already exists; no changes made."
        connection.execute(CREATE_TABLE_SQL)
        connection.commit()
        return "household_meter_submissions created successfully."


def main() -> None:
    print(migrate())


if __name__ == "__main__":
    main()
