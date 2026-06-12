import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .config import get_database_path


class DatabaseNotFoundError(FileNotFoundError):
    pass


@contextmanager
def get_connection(database_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    path = database_path or get_database_path()
    if not path.exists():
        raise DatabaseNotFoundError(f"SQLite database file does not exist: {path}")

    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    try:
        yield connection
    finally:
        connection.close()
