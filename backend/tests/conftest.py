import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DATABASE_ROOT = REPO_ROOT / "database"
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(DATABASE_ROOT / "scripts"))

from app.database import get_connection
from app.main import app
from import_ready_batch import import_ready_batch
from init_database import initialize_database


def extracted_record(account_number: str, meter_number: str, invoice_number: str, month: str, label: str, consumption: float, water_total: float, total_due: float) -> dict:
    return {
        "source_pdf_filename": f"{account_number}_{month}.pdf",
        "extraction_method": "deterministic_pdf_text_parser",
        "extraction_status": "success",
        "validation_status": "passed",
        "requires_manual_review": False,
        "review_reasons": [],
        "statement": {
            "invoice_number": invoice_number,
            "statement_month": month,
            "statement_month_label": label,
            "statement_date": f"{month.replace('-', '/')}/01",
            "due_date": f"{month.replace('-', '/')}/20",
            "next_reading_date": "2026/07/01",
        },
        "household": {
            "account_number": account_number,
            "customer_name": f"CUSTOMER {account_number[-3:]}",
            "physical_address": f"{account_number[-2:]} TEST STREET, PROTEA GLEN EXT.28",
            "stand_number": f"SV{account_number[-4:]} - 0000",
            "township": "PROTEA GLEN EXT.28",
            "region": "Region D",
            "ward": "WARD 53",
        },
        "water_meter": {
            "meter_number": meter_number,
            "reading_period_start": f"{month.replace('-', '/')}/01",
            "reading_period_end": f"{month.replace('-', '/')}/30",
            "billing_days": 30,
            "opening_reading_kL": 100.0,
            "closing_reading_kL": 100.0 + consumption,
            "consumption_kL": consumption,
            "average_daily_consumption_kL": round(consumption / 30, 3),
            "reading_type": "Actual Readings",
        },
        "charges": {
            "water_charge_excluding_vat": max(0.0, round(water_total - 285.26, 2)),
            "extended_social_package_grant": 0.0,
            "demand_management_levy": 47.8,
            "sewer_monthly_charge": 197.2,
            "water_vat": 40.26,
            "water_total_including_vat": water_total,
            "property_rates_total": 126.0,
            "refuse_total": 63.05,
            "current_charges_excluding_vat": round(total_due - 48.48, 2),
            "current_vat_total": 48.48,
            "current_charges_including_vat": total_due,
            "previous_account_balance": 687.45,
            "incoming_payment": -687.45,
            "subtotal": 0.0,
            "total_due": total_due,
        },
    }


def write_test_batch(tmp_path: Path) -> Path:
    records = [
        extracted_record("810240000", "650200", "260400000001", "2026-04", "April 2026", 7.0, 308.67, 497.72),
        extracted_record("810240411", "650539", "260400000012", "2026-06", "June 2026", 36.0, 1403.24, 1616.79),
        extracted_record("810240959", "650991", "260400000024", "2026-06", "June 2026", 31.0, 1157.60, 1407.55),
    ]
    extracted_dir = tmp_path / "extracted"
    extracted_dir.mkdir()
    files = []
    for index, record in enumerate(records, start=1):
        path = extracted_dir / f"statement_{index}_extracted.json"
        path.write_text(json.dumps(record), encoding="utf-8")
        files.append(
            {
                "source_pdf_filename": record["source_pdf_filename"],
                "processing_status": "import_ready",
                "extraction_status": "success",
                "validation_status": "passed",
                "requires_manual_review": False,
                "review_reasons": [],
                "output_json_path": str(path),
                "file_hash_sha256": f"backend_hash_{index}",
            }
        )
    summary = {
        "batch_id": "batch_001",
        "input_folder": "test/input",
        "processed_at": "2026-06-12T14:30:00",
        "total_pdf_files": 3,
        "import_ready_count": 3,
        "review_required_count": 0,
        "failed_count": 0,
        "duplicate_skipped_count": 0,
        "files": files,
    }
    summary_path = tmp_path / "batch_summary.json"
    summary_path.write_text(json.dumps(summary), encoding="utf-8")
    return summary_path


@pytest.fixture()
def seeded_db(tmp_path, monkeypatch):
    db_path = tmp_path / "backend_test.db"
    initialize_database(db_path, reset=True)
    import_ready_batch(write_test_batch(tmp_path), db_path)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    return db_path


@pytest.fixture()
def client(seeded_db):
    return TestClient(app)


@pytest.fixture()
def household_ids(seeded_db):
    with get_connection(seeded_db) as connection:
        rows = connection.execute(
            "SELECT household_id, account_number FROM households ORDER BY account_number"
        ).fetchall()
        return {row["account_number"]: row["household_id"] for row in rows}
