import argparse
import sqlite3
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"
SCHEMA_PATH = DATABASE_ROOT / "schemas" / "schema.sqlite.sql"


def initialize_database(db_path: Path = DEFAULT_DB_PATH, reset: bool = False) -> Path:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if reset and db_path.exists():
        db_path.unlink()

    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.executescript(schema_sql)
        connection.commit()
    return db_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialise the local SustAInTech SQLite database.")
    parser.add_argument("--reset", action="store_true", help="Delete and recreate the local database.")
    parser.add_argument("--db-path", help="Optional database path.")
    args = parser.parse_args()

    db_path = initialize_database(Path(args.db_path) if args.db_path else DEFAULT_DB_PATH, reset=args.reset)
    print(f"Database initialised successfully: {db_path}")


if __name__ == "__main__":
    main()
