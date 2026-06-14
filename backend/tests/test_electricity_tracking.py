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
              'electricity_household_one', '810270001', 'ELECTRICITY RESIDENT ONE',
              '1 TEST STREET, PROTEA GLEN EXT.28', 'SV2001 - 0001',
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
              'electricity_household_two', '810270002', 'ELECTRICITY RESIDENT TWO',
              '2 TEST STREET, PROTEA GLEN EXT.28', 'SV2002 - 0002',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53'
            )
            """
        )
        connection.commit()


@pytest.fixture()
def electricity_client(tmp_path, monkeypatch):
    db_path = tmp_path / "electricity_test.db"
    initialize_database(db_path, reset=True)
    seed_households(db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return TestClient(app)


def create_topup(client: TestClient, household_id: str, **overrides):
    payload = {
        "purchase_date": "2026-06-01",
        "amount_zar": 100,
        "units_kWh": 45,
        "meter_balance_kWh": 20,
        "supplier": "City Power",
        "token_reference_last4": "1234567890",
        "notes": "resident note",
    }
    payload.update(overrides)
    return client.post(f"/api/households/{household_id}/electricity-topups", json=payload)


def test_create_topup_returns_saved_record(electricity_client):
    response = create_topup(electricity_client, "electricity_household_one")

    assert response.status_code == 200
    data = response.json()
    assert data["household_id"] == "electricity_household_one"
    assert data["amount_zar"] == 100
    assert data["units_kWh"] == 45


def test_token_reference_is_truncated_to_last_four(electricity_client):
    response = create_topup(electricity_client, "electricity_household_one")

    assert response.status_code == 200
    assert response.json()["token_reference_last4"] == "7890"


def test_negative_amount_is_rejected(electricity_client):
    response = create_topup(electricity_client, "electricity_household_one", amount_zar=-1)

    assert response.status_code == 400


def test_negative_units_are_rejected(electricity_client):
    response = create_topup(electricity_client, "electricity_household_one", units_kWh=-1)

    assert response.status_code == 400


def test_household_history_is_scoped(electricity_client):
    create_topup(electricity_client, "electricity_household_one")
    create_topup(electricity_client, "electricity_household_two", amount_zar=50)

    response = electricity_client.get(
        "/api/households/electricity_household_one/electricity-topups"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["household_id"] == "electricity_household_one"


def test_household_summary_totals(electricity_client):
    create_topup(electricity_client, "electricity_household_one", purchase_date="2026-06-01")
    create_topup(
        electricity_client,
        "electricity_household_one",
        purchase_date="2026-06-03",
        amount_zar=150,
        units_kWh=68,
        meter_balance_kWh=8,
    )

    response = electricity_client.get(
        "/api/households/electricity_household_one/electricity-summary"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_spend"] == 250
    assert data["total_units"] == 113
    assert data["average_cost_per_kWh"] == round(250 / 113, 3)
    assert data["latest_balance_kWh"] == 8
    assert data["low_balance_warning"] is True


def test_zero_units_average_is_safe(electricity_client):
    create_topup(electricity_client, "electricity_household_one", units_kWh=0)

    response = electricity_client.get(
        "/api/households/electricity_household_one/electricity-summary"
    )

    assert response.status_code == 200
    assert response.json()["average_cost_per_kWh"] == 0


def test_low_balance_warning_requires_latest_balance_below_threshold(electricity_client):
    create_topup(
        electricity_client,
        "electricity_household_one",
        purchase_date="2026-06-01",
        meter_balance_kWh=20,
    )
    create_topup(
        electricity_client,
        "electricity_household_one",
        purchase_date="2026-06-02",
        meter_balance_kWh=9,
    )

    response = electricity_client.get(
        "/api/households/electricity_household_one/electricity-summary"
    )

    assert response.status_code == 200
    assert response.json()["low_balance_warning"] is True


def test_municipal_summary_aggregates(electricity_client):
    create_topup(electricity_client, "electricity_household_one")
    create_topup(electricity_client, "electricity_household_two", amount_zar=50, units_kWh=20)

    response = electricity_client.get("/api/electricity/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_households_with_topups"] == 2
    assert data["total_topups"] == 2
    assert data["total_spend_zar"] == 150
    assert data["total_units_kWh"] == 65


def test_municipal_summary_does_not_expose_token_or_notes(electricity_client):
    create_topup(electricity_client, "electricity_household_one")

    response = electricity_client.get("/api/electricity/summary")

    assert response.status_code == 200
    serialized = str(response.json())
    assert "token_reference_last4" not in serialized
    assert "7890" not in serialized
    assert "resident note" not in serialized
