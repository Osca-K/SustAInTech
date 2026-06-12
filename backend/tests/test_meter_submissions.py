from datetime import datetime, timedelta, timezone
from io import BytesIO
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DATABASE_ROOT = REPO_ROOT / "database"
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(DATABASE_ROOT / "scripts"))

from app.main import app  # noqa: E402
from app.services.meter_submission_validation import inspect_image  # noqa: E402
from init_database import initialize_database  # noqa: E402


PROTECTED_FIELDS = (
    "image_path",
    "image_hash_sha256",
    "browser_last_modified_at",
    "exif_datetime_original",
    "ai_extracted_meter_number",
    "ai_extracted_reading_kl",
    "ai_confidence_score",
)


def image_bytes(fmt: str = "JPEG", exif_datetime: datetime | None = None) -> bytes:
    image = Image.new("RGB", (24, 24), color=(20, 120, 110))
    output = BytesIO()
    save_kwargs = {}
    if exif_datetime and fmt == "JPEG":
        exif = Image.Exif()
        exif[36867] = exif_datetime.strftime("%Y:%m:%d %H:%M:%S")
        save_kwargs["exif"] = exif
    image.save(output, format=fmt, **save_kwargs)
    return output.getvalue()


def seed_operational_data(db_path: Path) -> dict:
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.execute(
            """
            INSERT INTO ingestion_batches (
              batch_id, input_folder, processed_at, total_pdf_files,
              import_ready_count, review_required_count, failed_count, duplicate_skipped_count
            ) VALUES ('batch_meter_test', 'test/input', '2026-01-31T10:00:00', 1, 1, 0, 0, 0)
            """
        )
        connection.execute(
            """
            INSERT INTO statement_uploads (
              upload_id, batch_id, source_pdf_filename, file_hash_sha256,
              processing_status, extraction_status, validation_status,
              requires_manual_review, review_reasons_json, extracted_json_path, imported_at
            ) VALUES (
              'upload_meter_test', 'batch_meter_test', 'statement.pdf', 'meter_test_hash',
              'import_ready', 'success', 'passed', 0, '[]', NULL, '2026-01-31T10:00:00'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (
              'household_meter_test', '810249999', 'TEST RESIDENT',
              '1 TEST STREET, PROTEA GLEN EXT.28', 'SV9999 - 0000',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO water_meters (meter_id, household_id, meter_number, resource_type, unit)
            VALUES ('meter_meter_test', 'household_meter_test', '659999', 'water', 'kL')
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
              'reading_meter_test', 'meter_meter_test', 'household_meter_test',
              '2026-01', '2026/01/01', '2026/01/31', 31,
              100.0, 110.0, 10.0, 0.323, 'Actual Readings', 'upload_meter_test'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO monthly_statements (
              statement_id, household_id, source_upload_id, invoice_number,
              statement_month, statement_month_label, statement_date, due_date,
              next_reading_date, water_charge_excluding_vat,
              extended_social_package_grant, demand_management_levy,
              sewer_monthly_charge, water_vat, water_total_including_vat,
              property_rates_total, refuse_total, current_charges_excluding_vat,
              current_vat_total, current_charges_including_vat,
              previous_account_balance, incoming_payment, subtotal, total_due
            ) VALUES (
              'statement_meter_test', 'household_meter_test', 'upload_meter_test',
              '260409999001', '2026-01', 'January 2026', '2026/01/31',
              '2026/02/20', '2026/02/28', 100.0, 0.0, 47.8, 197.2,
              40.26, 385.26, 126.0, 63.05, 448.0, 48.48, 496.48,
              687.45, -687.45, 0.0, 496.48
            )
            """
        )
        connection.commit()
    return {"household_id": "household_meter_test", "meter_id": "meter_meter_test"}


@pytest.fixture()
def meter_client(tmp_path, monkeypatch):
    db_path = tmp_path / "meter_test.db"
    initialize_database(db_path, reset=True)
    ids = seed_operational_data(db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    monkeypatch.setattr(config, "DEFAULT_METER_UPLOADS_PATH", tmp_path / "meter-uploads")
    monkeypatch.setattr(config, "get_meter_uploads_path", lambda: tmp_path / "meter-uploads")
    return TestClient(app), ids


def submit(client: TestClient, household_id: str, content: bytes, filename: str, content_type: str, reading: float):
    return client.post(
        f"/api/households/{household_id}/meter-submissions",
        data={
            "submitted_reading_kL": str(reading),
            "resident_confirmed": "true",
            "browser_last_modified_at": "2026-06-12T10:00:00Z",
        },
        files={"image": (filename, content, content_type)},
    )


def test_valid_jpeg_upload_is_accepted(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], image_bytes("JPEG"), "meter.jpg", "image/jpeg", 111.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "accepted"


def test_valid_png_upload_is_accepted(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], image_bytes("PNG"), "meter.png", "image/png", 111.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "accepted"


def test_unsupported_file_type_is_rejected(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], b"hello", "note.txt", "text/plain", 111.0)

    assert response.status_code == 400


def test_empty_image_is_rejected(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], b"", "empty.jpg", "image/jpeg", 111.0)

    assert response.status_code == 400


def test_oversized_image_is_rejected_service_level():
    with pytest.raises(ValueError, match="larger than 10 MB"):
        inspect_image(b"0" * (10 * 1024 * 1024 + 1), "image/jpeg")


def test_duplicate_image_hash_returns_duplicate_image(meter_client):
    client, ids = meter_client
    content = image_bytes("JPEG")
    first = submit(client, ids["household_id"], content, "meter.jpg", "image/jpeg", 111.0)
    second = submit(client, ids["household_id"], content, "meter-again.jpg", "image/jpeg", 112.0)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["validation_status"] == "duplicate_image"


def test_stale_exif_image_returns_retake_required(meter_client):
    client, ids = meter_client
    stale = datetime.now(timezone.utc) - timedelta(days=3)

    response = submit(client, ids["household_id"], image_bytes("JPEG", stale), "old.jpg", "image/jpeg", 111.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "retake_required"


def test_missing_exif_does_not_reject_plausible_reading(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], image_bytes("JPEG"), "no-exif.jpg", "image/jpeg", 111.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "accepted"
    assert response.json()["image_freshness_status"] == "metadata_missing"


def test_future_exif_beyond_tolerance_returns_review_required(meter_client):
    client, ids = meter_client
    future = datetime.now(timezone.utc) + timedelta(hours=2)

    response = submit(client, ids["household_id"], image_bytes("JPEG", future), "future.jpg", "image/jpeg", 111.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "review_required"


def test_reading_below_trusted_baseline_returns_rejected(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], image_bytes("JPEG"), "lower.jpg", "image/jpeg", 90.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "rejected"


def test_extreme_short_period_increase_returns_review_required(meter_client):
    client, ids = meter_client

    response = submit(client, ids["household_id"], image_bytes("JPEG"), "extreme.jpg", "image/jpeg", 4000.0)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "review_required"
    assert any("Extreme usage" in note for note in response.json()["validation_notes"])


def test_accepted_submission_appears_in_household_history(meter_client):
    client, ids = meter_client
    submit(client, ids["household_id"], image_bytes("JPEG"), "meter.jpg", "image/jpeg", 111.0)

    response = client.get(f"/api/households/{ids['household_id']}/meter-submissions")

    assert response.status_code == 200
    assert response.json()[0]["submitted_reading_kL"] == 111.0


def test_tracking_summary_returns_latest_accepted_values(meter_client):
    client, ids = meter_client
    submit(client, ids["household_id"], image_bytes("JPEG"), "meter.jpg", "image/jpeg", 111.0)

    response = client.get(f"/api/households/{ids['household_id']}/meter-tracking-summary")

    assert response.status_code == 200
    assert response.json()["latest_reading_kL"] == 111.0
    assert response.json()["accepted_submission_count"] == 1


def test_municipal_overview_returns_household_context(meter_client):
    client, ids = meter_client
    submit(client, ids["household_id"], image_bytes("JPEG"), "meter.jpg", "image/jpeg", 111.0)

    response = client.get("/api/meter-submissions")

    assert response.status_code == 200
    assert response.json()[0]["account_number"] == "810249999"


def test_protected_internal_fields_are_not_exposed(meter_client):
    client, ids = meter_client
    submit(client, ids["household_id"], image_bytes("JPEG"), "meter.jpg", "image/jpeg", 111.0)

    serialized = str(client.get("/api/meter-submissions").json()).lower()

    assert not any(field in serialized for field in PROTECTED_FIELDS)
