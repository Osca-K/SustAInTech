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


def seed_impact_data(db_path: Path) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.execute(
            """
            INSERT INTO ingestion_batches (
              batch_id, input_folder, processed_at, total_pdf_files,
              import_ready_count, review_required_count, failed_count,
              duplicate_skipped_count
            ) VALUES ('impact_batch', 'input', '2026-01-31T10:00:00', 1, 1, 0, 0, 0)
            """
        )
        connection.execute(
            """
            INSERT INTO statement_uploads (
              upload_id, batch_id, source_pdf_filename, file_hash_sha256,
              processing_status, extraction_status, validation_status,
              requires_manual_review, review_reasons_json, extracted_json_path,
              imported_at
            ) VALUES (
              'impact_upload', 'impact_batch', 'statement.pdf', 'impact_hash',
              'import_ready', 'success', 'passed', 0, '[]', NULL,
              '2026-01-31T10:00:00'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (
              'impact_household', '810260001', 'IMPACT RESIDENT',
              '1 IMPACT STREET', 'SV2001 - 0001', 'PROTEA GLEN EXT.28',
              'Region D', 'WARD 53'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO water_meters (meter_id, household_id, meter_number, resource_type, unit)
            VALUES ('impact_meter', 'impact_household', '662001', 'water', 'kL')
            """
        )
        connection.execute(
            """
            INSERT INTO monthly_water_readings (
              reading_id, meter_id, household_id, statement_month,
              reading_period_start, reading_period_end, billing_days,
              opening_reading_kL, closing_reading_kL, consumption_kL,
              average_daily_consumption_kL, reading_type, source_upload_id
            ) VALUES (
              'impact_reading', 'impact_meter', 'impact_household',
              '2026-01', '2026/01/01', '2026/01/31', 31,
              100.0, 125.0, 25.0, 0.806, 'Actual Readings', 'impact_upload'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO household_meter_submissions (
              submission_id, household_id, meter_id, submitted_at,
              image_path, image_original_filename, image_content_type,
              image_size_bytes, image_hash_sha256, image_freshness_status,
              submitted_reading_kL, reading_source, validation_status,
              validation_notes_json, resident_confirmed
            ) VALUES (
              'impact_meter_submission', 'impact_household', 'impact_meter',
              '2026-02-01T08:00:00+00:00', 'private/path.jpg', 'meter.jpg',
              'image/jpeg', 123, 'impact_image_hash', 'metadata_missing',
              126.0, 'resident_manual', 'review_required', '[]', 1
            )
            """
        )
        connection.execute(
            """
            INSERT INTO household_waste_queries (
              query_id, household_id, submitted_at, item_name,
              item_description, selected_category, classification,
              disposal_guidance, preparation_steps_json, confidence_level,
              source
            ) VALUES (
              'impact_waste_query', 'impact_household',
              '2026-02-01T09:00:00+00:00', 'plastic bottle', '',
              'Plastic', 'recyclable', 'Recycle if available.',
              ?, 'high', 'manual_rule_engine'
            )
            """,
            (json.dumps(["Rinse if needed."]),),
        )
        connection.commit()


@pytest.fixture()
def impact_client(tmp_path, monkeypatch):
    db_path = tmp_path / "impact_test.db"
    initialize_database(db_path, reset=True)
    seed_impact_data(db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return TestClient(app)


@pytest.fixture()
def empty_impact_client(tmp_path, monkeypatch):
    db_path = tmp_path / "impact_empty_test.db"
    initialize_database(db_path, reset=True)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return TestClient(app)


def test_impact_summary_returns_200(impact_client):
    response = impact_client.get("/api/impact/summary")

    assert response.status_code == 200


def test_impact_summary_water_fields_exist(impact_client):
    data = impact_client.get("/api/impact/summary").json()

    assert data["total_households"] == 1
    assert data["total_water_statements"] == 1
    assert data["total_meter_submissions"] == 1
    assert data["review_required_meter_submissions"] == 1
    assert data["total_water_usage_kL"] == 25.0
    assert data["water_review_rate_percent"] == 100.0


def test_impact_summary_waste_fields_exist(impact_client):
    data = impact_client.get("/api/impact/summary").json()

    assert data["total_waste_queries"] == 1
    assert data["recyclable_queries"] == 1
    assert data["waste_diversion_awareness_percent"] == 100.0


def test_impact_percentages_handle_zero_denominators(empty_impact_client):
    data = empty_impact_client.get("/api/impact/summary").json()

    assert data["water_review_rate_percent"] == 0.0
    assert data["waste_diversion_awareness_percent"] == 0.0


def test_recent_water_activity_does_not_expose_internal_image_fields(impact_client):
    serialized = str(impact_client.get("/api/impact/summary").json()).lower()

    assert "image_path" not in serialized
    assert "image_hash" not in serialized
    assert "exif" not in serialized
    assert "private/path.jpg" not in serialized


def test_recent_waste_activity_returns_safe_fields(impact_client):
    activity = impact_client.get("/api/impact/summary").json()["recent_waste_activity"][0]

    assert set(activity) == {
        "submitted_at",
        "household_id",
        "item_name",
        "classification",
        "confidence_level",
    }
