import sqlite3
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"

CREATE_TABLE_SQL = """
CREATE TABLE household_electricity_topups (
  topup_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  amount_zar REAL NOT NULL CHECK (amount_zar >= 0),
  units_kWh REAL NOT NULL CHECK (units_kWh >= 0),
  meter_balance_kWh REAL CHECK (meter_balance_kWh IS NULL OR meter_balance_kWh >= 0),
  supplier TEXT,
  token_reference_last4 TEXT CHECK (token_reference_last4 IS NULL OR length(token_reference_last4) <= 4),
  notes TEXT,
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
        if table_exists(connection, "household_electricity_topups"):
            return "household_electricity_topups already exists; no changes made."
        connection.execute(CREATE_TABLE_SQL)
        connection.commit()
        return "household_electricity_topups created successfully."


def main() -> None:
    print(migrate())


if __name__ == "__main__":
    main()
