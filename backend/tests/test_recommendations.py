import json
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


HOUSEHOLD_ONE = "recommendation_household_one"
HOUSEHOLD_TWO = "recommendation_household_two"
METER_ONE = "recommendation_meter_one"
METER_TWO = "recommendation_meter_two"


@pytest.fixture()
def recommendations_client(tmp_path, monkeypatch):
    db_path = tmp_path / "recommendations_test.db"
    initialize_database(db_path, reset=True)
    seed_households(db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return TestClient(app)


def seed_households(db_path: Path) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (?, '810280001', 'RECOMMENDATION RESIDENT ONE',
              '1 TEST STREET, PROTEA GLEN EXT.28', 'SV3001 - 0001',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53')
            """,
            (HOUSEHOLD_ONE,),
        )
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (?, '810280002', 'RECOMMENDATION RESIDENT TWO',
              '2 TEST STREET, PROTEA GLEN EXT.28', 'SV3002 - 0002',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53')
            """,
            (HOUSEHOLD_TWO,),
        )
        connection.execute(
            """
            INSERT INTO water_meters (
              meter_id, household_id, meter_number, resource_type, unit
            ) VALUES (?, ?, '680001', 'water', 'kL')
            """,
            (METER_ONE, HOUSEHOLD_ONE),
        )
        connection.execute(
            """
            INSERT INTO water_meters (
              meter_id, household_id, meter_number, resource_type, unit
            ) VALUES (?, ?, '680002', 'water', 'kL')
            """,
            (METER_TWO, HOUSEHOLD_TWO),
        )
        connection.commit()


def insert_meter_submission(
    db_path: Path,
    household_id: str = HOUSEHOLD_ONE,
    meter_id: str = METER_ONE,
    validation_status: str = "review_required",
    estimated_daily_usage: float | None = 6.2,
    suffix: str = "one",
) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            INSERT INTO household_meter_submissions (
              submission_id, household_id, meter_id, submitted_at,
              image_path, image_original_filename, image_content_type,
              image_size_bytes, image_hash_sha256, image_freshness_status,
              submitted_reading_kL, estimated_daily_usage_kL, reading_source,
              validation_status, validation_notes_json, resident_confirmed
            ) VALUES (?, ?, ?, ?, ?, 'meter.jpg', 'image/jpeg',
              123, ?, 'metadata_missing', 126.0, ?, 'resident_manual',
              ?, '[]', 1)
            """,
            (
                f"recommendation_submission_{suffix}",
                household_id,
                meter_id,
                f"2026-03-0{1 if suffix == 'one' else 2}T08:00:00+00:00",
                f"private/{suffix}/meter.jpg",
                f"recommendation_hash_{suffix}",
                estimated_daily_usage,
                validation_status,
            ),
        )
        connection.commit()


def insert_electricity_topup(
    db_path: Path,
    household_id: str = HOUSEHOLD_ONE,
    balance: float = 8.0,
) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            INSERT INTO household_electricity_topups (
              topup_id, household_id, submitted_at, purchase_date,
              amount_zar, units_kWh, meter_balance_kWh, supplier,
              token_reference_last4, notes
            ) VALUES (
              'recommendation_topup', ?, '2026-03-01T09:00:00+00:00',
              '2026-03-01', 50.0, 20.0, ?, 'City Power',
              '9999', 'private electricity note'
            )
            """,
            (household_id, balance),
        )
        connection.commit()


def insert_waste_query(
    db_path: Path,
    household_id: str = HOUSEHOLD_ONE,
    classification: str = "hazardous",
    suffix: str = "one",
) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            INSERT INTO household_waste_queries (
              query_id, household_id, submitted_at, item_name,
              item_description, selected_category, classification,
              disposal_guidance, preparation_steps_json, confidence_level,
              source
            ) VALUES (?, ?, '2026-03-01T10:00:00+00:00',
              'paint tin', 'private waste description', 'Chemical/Paint',
              ?, 'Use safe disposal.', ?, 'high', 'manual_rule_engine')
            """,
            (
                f"recommendation_waste_{suffix}",
                household_id,
                classification,
                json.dumps(["Keep separate."]),
            ),
        )
        connection.commit()


def db_path_from_client(client: TestClient) -> Path:
    from app.config import get_database_path

    return get_database_path()


def recommendation_titles(response) -> set[str]:
    return {item["title"] for item in response.json()["recommendations"]}


def test_household_without_meter_submissions_gets_water_tracking_recommendation(
    recommendations_client,
):
    response = recommendations_client.get(f"/api/households/{HOUSEHOLD_ONE}/recommendations")

    assert response.status_code == 200
    assert "Start tracking your water meter" in recommendation_titles(response)


def test_low_electricity_balance_creates_recommendation(recommendations_client):
    db_path = db_path_from_client(recommendations_client)
    insert_electricity_topup(db_path)

    response = recommendations_client.get(f"/api/households/{HOUSEHOLD_ONE}/recommendations")

    assert response.status_code == 200
    assert "Electricity balance is low" in recommendation_titles(response)


def test_hazardous_waste_query_creates_special_waste_recommendation(
    recommendations_client,
):
    db_path = db_path_from_client(recommendations_client)
    insert_waste_query(db_path)

    response = recommendations_client.get(f"/api/households/{HOUSEHOLD_ONE}/recommendations")

    assert response.status_code == 200
    assert "Handle special waste safely" in recommendation_titles(response)


def test_review_required_water_and_low_electricity_creates_combined_high_recommendation(
    recommendations_client,
):
    db_path = db_path_from_client(recommendations_client)
    insert_meter_submission(db_path)
    insert_electricity_topup(db_path)

    response = recommendations_client.get(f"/api/households/{HOUSEHOLD_ONE}/recommendations")

    assert response.status_code == 200
    combined = [
        item
        for item in response.json()["recommendations"]
        if item["title"] == "Multiple resource alerts need attention"
    ]
    assert combined
    assert combined[0]["severity"] == "high"


def test_municipal_water_review_rate_recommendation_appears(recommendations_client):
    db_path = db_path_from_client(recommendations_client)
    insert_meter_submission(db_path)
    insert_meter_submission(
        db_path,
        household_id=HOUSEHOLD_TWO,
        meter_id=METER_TWO,
        validation_status="accepted",
        estimated_daily_usage=1.0,
        suffix="two",
    )

    response = recommendations_client.get("/api/recommendations/municipal")

    assert response.status_code == 200
    assert "Water review workload is increasing" in recommendation_titles(response)


def test_municipal_electricity_low_balance_recommendation_appears(
    recommendations_client,
):
    insert_electricity_topup(db_path_from_client(recommendations_client))

    response = recommendations_client.get("/api/recommendations/municipal")

    assert response.status_code == 200
    assert (
        "Some households may need electricity top-up reminders"
        in recommendation_titles(response)
    )


def test_municipal_special_waste_recommendation_appears(recommendations_client):
    insert_waste_query(db_path_from_client(recommendations_client))

    response = recommendations_client.get("/api/recommendations/municipal")

    assert response.status_code == 200
    assert "Special waste education opportunity" in recommendation_titles(response)


def test_recommendations_do_not_expose_internal_private_fields(recommendations_client):
    db_path = db_path_from_client(recommendations_client)
    insert_meter_submission(db_path)
    insert_electricity_topup(db_path)
    insert_waste_query(db_path)

    household = recommendations_client.get(f"/api/households/{HOUSEHOLD_ONE}/recommendations")
    municipal = recommendations_client.get("/api/recommendations/municipal")

    serialized = f"{household.json()} {municipal.json()}".lower()
    assert "image_path" not in serialized
    assert "private/one/meter.jpg" not in serialized
    assert "recommendation_hash" not in serialized
    assert "token_reference" not in serialized
    assert "9999" not in serialized
    assert "private electricity note" not in serialized
    assert "private waste description" not in serialized
