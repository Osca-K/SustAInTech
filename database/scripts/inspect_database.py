import argparse
import sqlite3
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"
TABLES = [
    "ingestion_batches",
    "statement_uploads",
    "households",
    "water_meters",
    "monthly_water_readings",
    "monthly_statements",
]


def connect_database(db_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


def inspect_database(db_path: Path = DEFAULT_DB_PATH) -> None:
    with connect_database(db_path) as connection:
        for table in TABLES:
            count = connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()["count"]
            print(f"{table} count: {count}")

        print("")
        print("Statements:")
        rows = connection.execute(
            """
            SELECT h.account_number, ms.statement_month, wm.meter_number,
                   mwr.consumption_kL, ms.water_total_including_vat, ms.total_due
            FROM monthly_statements ms
            JOIN households h ON h.household_id = ms.household_id
            JOIN monthly_water_readings mwr
              ON mwr.household_id = h.household_id
             AND mwr.statement_month = ms.statement_month
            JOIN water_meters wm ON wm.meter_id = mwr.meter_id
            ORDER BY h.account_number, ms.statement_month
            """
        ).fetchall()
        for row in rows:
            print(
                f"{row['account_number']} {row['statement_month']} "
                f"{row['meter_number']} {row['consumption_kL']} "
                f"{row['water_total_including_vat']} {row['total_due']}"
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect the local SustAInTech SQLite database.")
    parser.add_argument("--db-path", help="Optional SQLite database path.")
    args = parser.parse_args()
    inspect_database(Path(args.db_path) if args.db_path else DEFAULT_DB_PATH)


if __name__ == "__main__":
    main()
