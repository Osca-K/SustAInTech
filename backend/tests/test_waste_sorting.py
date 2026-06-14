import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DATABASE_ROOT = REPO_ROOT / "database"
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(DATABASE_ROOT / "scripts"))

from app.main import app  # noqa: E402
from init_database import initialize_database  # noqa: E402


def seed_households(db_path: Path) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (
              'household_waste_one', '810250001', 'WASTE RESIDENT ONE',
              '1 TEST STREET, PROTEA GLEN EXT.28', 'SV1001 - 0001',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (
              'household_waste_two', '810250002', 'WASTE RESIDENT TWO',
              '2 TEST STREET, PROTEA GLEN EXT.28', 'SV1002 - 0002',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53'
            )
            """
        )
        connection.commit()


@pytest.fixture()
def waste_client(tmp_path, monkeypatch):
    db_path = tmp_path / "waste_test.db"
    initialize_database(db_path, reset=True)
    seed_households(db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return TestClient(app)


def sort_item(client: TestClient, household_id: str, item_name: str, category: str | None = None):
    payload = {
        "item_name": item_name,
        "item_description": "",
        "selected_category": category,
    }
    return client.post(f"/api/households/{household_id}/waste-sort", json=payload)


def test_plastic_bottle_classified_recyclable(waste_client):
    response = sort_item(waste_client, "household_waste_one", "plastic bottle")

    assert response.status_code == 200
    assert response.json()["classification"] == "recyclable"


def test_food_scraps_classified_organic(waste_client):
    response = sort_item(waste_client, "household_waste_one", "food scraps")

    assert response.status_code == 200
    assert response.json()["classification"] == "organic"


def test_phone_charger_classified_e_waste(waste_client):
    response = sort_item(waste_client, "household_waste_one", "phone charger")

    assert response.status_code == 200
    assert response.json()["classification"] == "e_waste"


def test_paint_classified_hazardous(waste_client):
    response = sort_item(waste_client, "household_waste_one", "paint")

    assert response.status_code == 200
    assert response.json()["classification"] == "hazardous"


def test_clothes_classified_reuse_or_donate(waste_client):
    response = sort_item(waste_client, "household_waste_one", "old clothes")

    assert response.status_code == 200
    assert response.json()["classification"] == "reuse_or_donate"


def test_unknown_item_classified_safely(waste_client):
    response = sort_item(waste_client, "household_waste_one", "unknown broken thing")

    assert response.status_code == 200
    assert response.json()["classification"] in {"unknown", "general_waste"}
    assert "Check local municipal guidance" in response.json()["disposal_guidance"]


def test_query_saved_to_database(waste_client):
    response = sort_item(waste_client, "household_waste_one", "glass bottle")

    history = waste_client.get("/api/households/household_waste_one/waste-queries")

    assert response.status_code == 200
    assert history.status_code == 200
    assert history.json()[0]["item_name"] == "glass bottle"


def test_household_history_returns_only_that_household(waste_client):
    sort_item(waste_client, "household_waste_one", "paper")
    sort_item(waste_client, "household_waste_two", "battery")

    history = waste_client.get("/api/households/household_waste_one/waste-queries")

    assert history.status_code == 200
    assert len(history.json()) == 1
    assert history.json()[0]["household_id"] == "household_waste_one"


def test_municipal_summary_returns_counts(waste_client):
    sort_item(waste_client, "household_waste_one", "paper", "Paper/Cardboard")
    sort_item(waste_client, "household_waste_one", "battery", "Battery")

    response = waste_client.get("/api/waste/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_queries"] == 2
    assert {item["classification"] for item in data["classification_counts"]} == {
        "recyclable",
        "e_waste",
    }
    assert data["recent_queries"]
