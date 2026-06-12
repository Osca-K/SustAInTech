import json
import sqlite3
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DATABASE_ROOT = REPO_ROOT / "database"
sys.path.insert(0, str(DATABASE_ROOT / "scripts"))

from import_ready_batch import FORBIDDEN_LABELS, import_ready_batch
from init_database import initialize_database


def extracted_record(
    account_number: str,
    meter_number: str,
    invoice_number: str,
    month: str,
    label: str,
    consumption: float,
    water_total: float,
    total_due: float,
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
    extracted_dir.mkdir(exist_ok=True)
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
                "file_hash_sha256": f"hash_{index}",
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


def connect(db_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


def count_rows(db_path: Path, table: str) -> int:
    with connect(db_path) as connection:
        return connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()["count"]


def init_temp_db(tmp_path: Path) -> Path:
    db_path = tmp_path / "sustaintech_test.db"
    initialize_database(db_path, reset=True)
    return db_path


def import_fixture_batch(db_path: Path, tmp_path: Path):
    return import_ready_batch(write_test_batch(tmp_path), db_path)


def test_database_schema_initialises_successfully(tmp_path):
    db_path = init_temp_db(tmp_path)
    assert db_path.exists()
    assert count_rows(db_path, "households") == 0


def test_three_import_ready_extracted_json_files_can_be_imported(tmp_path):
    db_path = init_temp_db(tmp_path)
    results = import_fixture_batch(db_path, tmp_path)
    assert [result["result"] for result in results].count("imported") == 3


def test_three_households_are_created(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    assert count_rows(db_path, "households") == 3


def test_three_water_meters_are_created(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    assert count_rows(db_path, "water_meters") == 3


def test_three_readings_are_created(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    assert count_rows(db_path, "monthly_water_readings") == 3


def test_three_statements_are_created(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    assert count_rows(db_path, "monthly_statements") == 3


def test_three_uploads_are_created(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    assert count_rows(db_path, "statement_uploads") == 3


def test_foreign_key_relationships_are_valid(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    with connect(db_path) as connection:
        violations = connection.execute("PRAGMA foreign_key_check").fetchall()
    assert violations == []


def test_importing_same_batch_again_does_not_duplicate_records(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    results = import_fixture_batch(db_path, tmp_path)
    assert [result["result"] for result in results].count("skipped_duplicate_file_hash") == 3
    assert count_rows(db_path, "monthly_statements") == 3
    assert count_rows(db_path, "statement_uploads") == 3


def test_duplicate_invoice_numbers_are_skipped(tmp_path):
    db_path = init_temp_db(tmp_path)
    summary = json.loads(write_test_batch(tmp_path).read_text(encoding="utf-8"))
    duplicate = dict(summary["files"][0])
    duplicate["source_pdf_filename"] = "same_invoice_changed_hash.pdf"
    duplicate["file_hash_sha256"] = "changed_hash_for_invoice_duplicate"
    summary["files"] = [summary["files"][0], duplicate]
    summary["total_pdf_files"] = 2
    summary["import_ready_count"] = 2
    temp_summary = tmp_path / "duplicate_invoice_summary.json"
    temp_summary.write_text(json.dumps(summary), encoding="utf-8")

    results = import_ready_batch(temp_summary, db_path)
    assert [result["result"] for result in results] == ["imported", "skipped_duplicate_invoice"]
    assert count_rows(db_path, "monthly_statements") == 1


def test_duplicate_file_hashes_are_skipped(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    results = import_fixture_batch(db_path, tmp_path)
    assert all(result["result"] == "skipped_duplicate_file_hash" for result in results)


def test_only_import_ready_records_are_imported(tmp_path):
    db_path = init_temp_db(tmp_path)
    summary = json.loads(write_test_batch(tmp_path).read_text(encoding="utf-8"))
    summary["files"][1]["processing_status"] = "duplicate_skipped"
    summary["files"][2]["processing_status"] = "failed"
    temp_summary = tmp_path / "only_import_ready_summary.json"
    temp_summary.write_text(json.dumps(summary), encoding="utf-8")

    import_ready_batch(temp_summary, db_path)
    assert count_rows(db_path, "monthly_statements") == 1


def test_review_required_records_are_not_imported(tmp_path):
    db_path = init_temp_db(tmp_path)
    summary = json.loads(write_test_batch(tmp_path).read_text(encoding="utf-8"))
    for file_summary in summary["files"]:
        file_summary["processing_status"] = "review_required"
    temp_summary = tmp_path / "review_required_summary.json"
    temp_summary.write_text(json.dumps(summary), encoding="utf-8")

    results = import_ready_batch(temp_summary, db_path)
    assert all(result["result"] == "ignored_not_import_ready" for result in results)
    assert count_rows(db_path, "monthly_statements") == 0


def test_anomaly_labels_are_not_read_or_stored(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    with connect(db_path) as connection:
        dump = "\n".join(connection.iterdump()).lower()
    assert not any(label in dump for label in FORBIDDEN_LABELS)


def test_hidden_ground_truth_files_are_not_imported(tmp_path):
    db_path = init_temp_db(tmp_path)
    import_fixture_batch(db_path, tmp_path)
    with connect(db_path) as connection:
        tables = "\n".join(row["name"] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'"))
    assert "ground_truth" not in tables
    assert "evaluation" not in tables
