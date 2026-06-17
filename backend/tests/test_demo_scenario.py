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


@pytest.fixture()
def demo_client(tmp_path, monkeypatch):
    db_path = tmp_path / "demo_scenario_test.db"
    initialize_database(db_path, reset=True)
    seed_demo_data(db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return TestClient(app)


def seed_demo_data(db_path: Path) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.execute(
            """
            INSERT INTO households (
              household_id, account_number, customer_name, physical_address,
              stand_number, township, region, ward
            ) VALUES (
              'demo_household_one', '810290001', 'DEMO RESIDENT ONE',
              '1 TEST STREET, PROTEA GLEN EXT.28', 'SV4001 - 0001',
              'PROTEA GLEN EXT.28', 'Region D', 'WARD 53'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO water_meters (
              meter_id, household_id, meter_number, resource_type, unit
            ) VALUES ('demo_meter_one', 'demo_household_one', '690001', 'water', 'kL')
            """
        )
        connection.execute(
            """
            INSERT INTO ingestion_batches (
              batch_id, input_folder, processed_at, total_pdf_files,
              import_ready_count, review_required_count, failed_count,
              duplicate_skipped_count
            ) VALUES (
              'demo_batch', 'demo/input', '2026-03-01T07:00:00+00:00',
              1, 1, 0, 0, 0
            )
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
              'demo_upload', 'demo_batch', 'demo.pdf', 'demo_pdf_hash',
              'imported', 'completed', 'import_ready',
              0, '[]', 'demo.json', '2026-03-01T07:05:00+00:00'
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
              'demo_statement', 'demo_household_one', 'demo_upload', 'INV-DEMO',
              '2026-03', 'March 2026', '2026-03-31', '2026-04-15',
              '2026-04-25', 50.0, 0.0, 0.0, 10.0, 9.0, 59.0,
              20.0, 15.0, 85.0, 12.75, 97.75,
              0.0, 0.0, 97.75, 97.75
            )
            """
        )
        connection.execute(
            """
            INSERT INTO household_meter_submissions (
              submission_id, household_id, meter_id, submitted_at,
              image_path, image_original_filename, image_content_type,
              image_size_bytes, image_hash_sha256, image_freshness_status,
              submitted_reading_kL, estimated_daily_usage_kL, reading_source,
              validation_status, validation_notes_json, resident_confirmed
            ) VALUES (
              'demo_submission', 'demo_household_one', 'demo_meter_one',
              '2026-03-01T08:00:00+00:00', 'private/demo/meter.jpg',
              'meter.jpg', 'image/jpeg', 123, 'demo_private_hash',
              'metadata_missing', 126.0, 6.5, 'resident_manual',
              'review_required', '[]', 1
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
              'demo_waste', 'demo_household_one', '2026-03-01T10:00:00+00:00',
              'paint tin', 'private description', 'Chemical/Paint',
              'hazardous', 'Use safe disposal.', '["Keep separate."]',
              'high', 'manual_rule_engine'
            )
            """
        )
        connection.execute(
            """
            INSERT INTO household_electricity_topups (
              topup_id, household_id, submitted_at, purchase_date,
              amount_zar, units_kWh, meter_balance_kWh, supplier,
              token_reference_last4, notes
            ) VALUES (
              'demo_topup', 'demo_household_one', '2026-03-01T09:00:00+00:00',
              '2026-03-01', 50.0, 20.0, 8.0, 'City Power',
              '1234', 'private token note'
            )
            """
        )
        connection.commit()


def test_demo_scenario_returns_200(demo_client):
    response = demo_client.get("/api/demo/scenario")

    assert response.status_code == 200


def test_demo_scenario_contains_required_identity_fields(demo_client):
    data = demo_client.get("/api/demo/scenario").json()

    assert data["scenario_title"] == "SustAInTech Community Resource Demo"
    assert data["pilot_area"] == "Protea Glen Extension 28, Soweto"
    assert data["demo_household_id"] == "demo_household_one"


def test_demo_steps_include_expected_modules(demo_client):
    data = demo_client.get("/api/demo/scenario").json()
    modules = {step["module"] for step in data["steps"]}
    titles = {step["title"] for step in data["steps"]}

    assert {"water", "waste", "electricity", "recommendations", "impact"} <= modules
    assert "Community overview" in titles
    assert len(data["steps"]) >= 6


def test_demo_urls_are_relative_frontend_routes(demo_client):
    data = demo_client.get("/api/demo/scenario").json()
    urls = [step["primary_url"] for step in data["steps"]]
    urls += [step["secondary_url"] for step in data["steps"] if step["secondary_url"]]
    urls += [link["url"] for link in data["quick_links"]]

    assert urls
    assert all(url.startswith("/") for url in urls)
    assert not any(url.startswith("/api") for url in urls)
    assert not any("://" in url for url in urls)


def test_demo_scenario_does_not_expose_private_fields(demo_client):
    serialized = str(demo_client.get("/api/demo/scenario").json()).lower()

    assert "image_path" not in serialized
    assert "private/demo/meter.jpg" not in serialized
    assert "demo_private_hash" not in serialized
    assert "token_reference" not in serialized
    assert "private token note" not in serialized
    assert "private description" not in serialized
