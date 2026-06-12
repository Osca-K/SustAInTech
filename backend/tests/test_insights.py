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

from app.main import app  # noqa: E402
from import_ready_batch import import_ready_batch  # noqa: E402
from init_database import initialize_database  # noqa: E402


FORBIDDEN_LABELS = (
    "possible_leak",
    "confirmed_leak",
    "anomaly_type",
    "anomaly_notes",
    "expected_classification",
    "scenario_notes",
)
MONTH_LABELS = {
    "2026-01": "January 2026",
    "2026-02": "February 2026",
    "2026-03": "March 2026",
    "2026-04": "April 2026",
    "2026-05": "May 2026",
    "2026-06": "June 2026",
}


def extracted_record(
    account_number: str,
    meter_number: str,
    invoice_number: str,
    month: str,
    consumption: float,
) -> dict:
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
            "statement_month_label": MONTH_LABELS[month],
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
            "water_charge_excluding_vat": 100.0,
            "extended_social_package_grant": 0.0,
            "demand_management_levy": 47.8,
            "sewer_monthly_charge": 197.2,
            "water_vat": 40.26,
            "water_total_including_vat": round(285.26 + consumption * 20, 2),
            "property_rates_total": 126.0,
            "refuse_total": 63.05,
            "current_charges_excluding_vat": 448.0,
            "current_vat_total": 48.48,
            "current_charges_including_vat": round(496.48 + consumption * 20, 2),
            "previous_account_balance": 687.45,
            "incoming_payment": -687.45,
            "subtotal": 0.0,
            "total_due": round(496.48 + consumption * 20, 2),
        },
    }


def write_batch(tmp_path: Path, records: list[dict]) -> Path:
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
                "file_hash_sha256": f"insight_hash_{index}",
            }
        )
    summary = {
        "batch_id": "insights_batch",
        "input_folder": "test/input",
        "processed_at": "2026-06-12T14:30:00",
        "total_pdf_files": len(files),
        "import_ready_count": len(files),
        "review_required_count": 0,
        "failed_count": 0,
        "duplicate_skipped_count": 0,
        "files": files,
    }
    summary_path = tmp_path / "batch_summary.json"
    summary_path.write_text(json.dumps(summary), encoding="utf-8")
    return summary_path


@pytest.fixture()
def insights_client(tmp_path, monkeypatch):
    db_path = tmp_path / "insights_test.db"
    initialize_database(db_path, reset=True)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)

    def seed(records: list[dict]):
        import_ready_batch(write_batch(tmp_path, records), db_path)

    return TestClient(app), seed


def insight_types(response_json: list[dict]) -> set[str]:
    return {item["insight_type"] for item in response_json}


def test_ordinary_usage_does_not_create_high_severity_insights(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240100", "650100", "260400100001", "2026-04", 8.0),
            extracted_record("810240100", "650100", "260400100002", "2026-05", 9.0),
            extracted_record("810240100", "650100", "260400100003", "2026-06", 10.0),
        ]
    )

    response = client.get("/api/insights")

    assert response.status_code == 200
    assert not [item for item in response.json() if item["severity"] == "high"]


def test_sharp_increase_creates_sudden_usage_spike(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240200", "650200", "260400200001", "2026-05", 12.0),
            extracted_record("810240200", "650200", "260400200002", "2026-06", 36.0),
        ]
    )

    response = client.get("/api/insights")

    assert "sudden_usage_spike" in insight_types(response.json())


def test_two_consecutive_high_months_create_sustained_high_usage(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240300", "650300", "260400300001", "2026-05", 28.0),
            extracted_record("810240300", "650300", "260400300002", "2026-06", 31.0),
        ]
    )

    response = client.get("/api/insights")

    assert "sustained_high_usage" in insight_types(response.json())


def test_high_current_usage_created_when_not_sustained(insights_client):
    client, seed = insights_client
    seed([extracted_record("810240400", "650400", "260400400001", "2026-06", 26.0)])

    response = client.get("/api/insights")

    assert "high_current_usage" in insight_types(response.json())


def test_rapid_increase_created_when_not_sudden_spike(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240500", "650500", "260400500001", "2026-05", 10.0),
            extracted_record("810240500", "650500", "260400500002", "2026-06", 17.0),
        ]
    )

    response = client.get("/api/insights")

    assert "rapid_monthly_increase" in insight_types(response.json())


def test_duplicate_overlap_avoids_rapid_when_sudden_spike_exists(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240600", "650600", "260400600001", "2026-05", 12.0),
            extracted_record("810240600", "650600", "260400600002", "2026-06", 36.0),
        ]
    )

    response = client.get("/api/insights")
    june_types = {
        item["insight_type"]
        for item in response.json()
        if item["statement_month"] == "2026-06"
    }

    assert "sudden_usage_spike" in june_types
    assert "rapid_monthly_increase" not in june_types


def test_summary_counts_reconcile(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240700", "650700", "260400700001", "2026-05", 12.0),
            extracted_record("810240700", "650700", "260400700002", "2026-06", 36.0),
        ]
    )

    insights = client.get("/api/insights").json()
    summary = client.get("/api/insights/summary").json()

    assert summary["total_insights"] == len(insights)
    assert summary["total_insights"] == (
        summary["high_severity_count"]
        + summary["medium_severity_count"]
        + summary["low_severity_count"]
    )


def test_filters_work(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240800", "650800", "260400800001", "2026-05", 10.0),
            extracted_record("810240800", "650800", "260400800002", "2026-06", 17.0),
        ]
    )

    severity = client.get("/api/insights?severity=medium").json()
    insight_type = client.get("/api/insights?insight_type=rapid_monthly_increase").json()

    assert severity
    assert all(item["severity"] == "medium" for item in severity)
    assert insight_type
    assert all(item["insight_type"] == "rapid_monthly_increase" for item in insight_type)


def test_household_specific_insights_endpoint_works(insights_client):
    client, seed = insights_client
    seed(
        [
            extracted_record("810240900", "650900", "260400900001", "2026-05", 12.0),
            extracted_record("810240900", "650900", "260400900002", "2026-06", 36.0),
        ]
    )
    household = client.get("/api/households?search=810240900").json()[0]

    response = client.get(f"/api/households/{household['household_id']}/insights")

    assert response.status_code == 200
    assert response.json()
    assert all(item["household_id"] == household["household_id"] for item in response.json())


def test_unknown_household_returns_404(insights_client):
    client, _seed = insights_client

    response = client.get("/api/households/missing_household/insights")

    assert response.status_code == 404


def test_hidden_ground_truth_files_are_not_read(insights_client, monkeypatch):
    client, seed = insights_client
    seed([extracted_record("810241000", "651000", "260401000001", "2026-06", 26.0)])

    original_read_text = Path.read_text

    def guarded_read_text(self, *args, **kwargs):
        path_text = str(self).replace("\\", "/").lower()
        if "evaluation" in path_text or "ground_truth" in path_text:
            raise AssertionError(f"Hidden evaluation file was read: {self}")
        return original_read_text(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", guarded_read_text)

    response = client.get("/api/insights")

    assert response.status_code == 200


def test_hidden_labels_are_not_exposed(insights_client):
    client, seed = insights_client
    seed([extracted_record("810241100", "651100", "260401100001", "2026-06", 26.0)])

    serialized = json.dumps(client.get("/api/insights").json()).lower()

    assert not any(label in serialized for label in FORBIDDEN_LABELS)
