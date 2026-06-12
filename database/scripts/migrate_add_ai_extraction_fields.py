import sqlite3
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"
TABLE_NAME = "household_meter_submissions"

AI_EXTRACTION_COLUMNS = {
    "ai_extraction_status": (
        "TEXT NOT NULL DEFAULT 'not_requested' "
        "CHECK (ai_extraction_status IN "
        "('not_requested', 'pending', 'completed', 'low_confidence', 'failed'))"
    ),
    "ai_extraction_notes_json": "TEXT NOT NULL DEFAULT '[]'",
    "ai_extraction_method": "TEXT",
    "ai_extracted_at": "TEXT",
}


def table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def existing_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    return {row[1] for row in connection.execute(f"PRAGMA table_info({table_name})")}


def migrate(db_path: Path = DEFAULT_DB_PATH) -> str:
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database does not exist: {db_path}")

    with sqlite3.connect(db_path) as connection:
        if not table_exists(connection, TABLE_NAME):
            raise RuntimeError(
                "household_meter_submissions does not exist. "
                "Run migrate_add_household_meter_submissions.py first."
            )

        current_columns = existing_columns(connection, TABLE_NAME)
        added_columns = []
        for column_name, column_definition in AI_EXTRACTION_COLUMNS.items():
            if column_name in current_columns:
                continue
            connection.execute(
                f"ALTER TABLE {TABLE_NAME} ADD COLUMN {column_name} {column_definition}"
            )
            added_columns.append(column_name)
        connection.commit()

    if not added_columns:
        return "AI extraction fields already exist; no changes made."
    return f"Added AI extraction fields: {', '.join(added_columns)}."


def main() -> None:
    print(migrate())


if __name__ == "__main__":
    main()
