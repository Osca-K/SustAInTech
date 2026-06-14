import sqlite3
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"

CREATE_TABLE_SQL = """
CREATE TABLE household_waste_queries (
  query_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  selected_category TEXT,
  classification TEXT NOT NULL CHECK (classification IN ('recyclable', 'general_waste', 'organic', 'hazardous', 'e_waste', 'reuse_or_donate', 'unknown')),
  disposal_guidance TEXT NOT NULL,
  preparation_steps_json TEXT NOT NULL,
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
  source TEXT NOT NULL CHECK (source IN ('resident_selected', 'manual_rule_engine', 'future_ai')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(household_id)
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
        if table_exists(connection, "household_waste_queries"):
            return "household_waste_queries already exists; no changes made."
        connection.execute(CREATE_TABLE_SQL)
        connection.commit()
        return "household_waste_queries created successfully."


def main() -> None:
    print(migrate())


if __name__ == "__main__":
    main()
