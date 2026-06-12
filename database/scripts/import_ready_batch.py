import argparse
import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path


DATABASE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = DATABASE_ROOT.parent
DEFAULT_DB_PATH = DATABASE_ROOT / "local" / "sustaintech_dev.db"
FORBIDDEN_LABELS = (
    "possible_leak",
    "sustained_high_usage",
    "anomaly_type",
    "anomaly_notes",
    "expected_classification",
    "scenario_notes",
)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def resolve_repo_path(path_text: str) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    return REPO_ROOT / path


def connect_database(db_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


def contains_forbidden_labels(data: dict) -> bool:
    serialized = json.dumps(data, sort_keys=True).lower()
    return any(label in serialized for label in FORBIDDEN_LABELS)


def insert_batch(connection: sqlite3.Connection, summary: dict) -> None:
    connection.execute(
        """
        INSERT OR IGNORE INTO ingestion_batches (
          batch_id, input_folder, processed_at, total_pdf_files,
          import_ready_count, review_required_count, failed_count, duplicate_skipped_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            summary["batch_id"],
            summary["input_folder"],
            summary["processed_at"],
            summary["total_pdf_files"],
            summary["import_ready_count"],
            summary["review_required_count"],
            summary["failed_count"],
            summary.get("duplicate_skipped_count", 0),
        ),
    )


def find_one(connection: sqlite3.Connection, query: str, params: tuple) -> sqlite3.Row | None:
    return connection.execute(query, params).fetchone()


def create_or_get_household(connection: sqlite3.Connection, household: dict) -> str:
    existing = find_one(connection, "SELECT household_id FROM households WHERE account_number = ?", (household["account_number"],))
    if existing:
        return existing["household_id"]

    household_id = new_id("household")
    connection.execute(
        """
        INSERT INTO households (
          household_id, account_number, customer_name, physical_address,
          stand_number, township, region, ward
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            household_id,
            household["account_number"],
            household["customer_name"],
            household["physical_address"],
            household["stand_number"],
            household["township"],
            household["region"],
            household["ward"],
        ),
    )
    return household_id


def create_or_get_meter(connection: sqlite3.Connection, household_id: str, water_meter: dict) -> str:
    existing = find_one(connection, "SELECT meter_id FROM water_meters WHERE meter_number = ?", (water_meter["meter_number"],))
    if existing:
        return existing["meter_id"]

    meter_id = new_id("meter")
    connection.execute(
        """
        INSERT INTO water_meters (meter_id, household_id, meter_number, resource_type, unit)
        VALUES (?, ?, ?, 'water', 'kL')
        """,
        (meter_id, household_id, water_meter["meter_number"]),
    )
    return meter_id


def import_statement(connection: sqlite3.Connection, batch_summary: dict, file_summary: dict, extracted: dict) -> str:
    file_hash = file_summary.get("file_hash_sha256")
    invoice_number = extracted["statement"]["invoice_number"]
    if file_hash and find_one(connection, "SELECT upload_id FROM statement_uploads WHERE file_hash_sha256 = ?", (file_hash,)):
        return "skipped_duplicate_file_hash"
    if find_one(connection, "SELECT statement_id FROM monthly_statements WHERE invoice_number = ?", (invoice_number,)):
        return "skipped_duplicate_invoice"
    if contains_forbidden_labels(extracted):
        raise ValueError("Extracted JSON contains forbidden anomaly labels.")

    now = datetime.now().isoformat(timespec="seconds")
    upload_id = new_id("upload")
    household_id = create_or_get_household(connection, extracted["household"])
    meter_id = create_or_get_meter(connection, household_id, extracted["water_meter"])

    connection.execute(
        """
        INSERT INTO statement_uploads (
          upload_id, batch_id, source_pdf_filename, file_hash_sha256,
          processing_status, extraction_status, validation_status,
          requires_manual_review, review_reasons_json, extracted_json_path, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            upload_id,
            batch_summary["batch_id"],
            file_summary["source_pdf_filename"],
            file_hash,
            file_summary["processing_status"],
            file_summary["extraction_status"],
            file_summary["validation_status"],
            1 if file_summary.get("requires_manual_review") else 0,
            json.dumps(file_summary.get("review_reasons", [])),
            file_summary.get("output_json_path"),
            now,
        ),
    )

    water = extracted["water_meter"]
    statement = extracted["statement"]
    charges = extracted["charges"]
    connection.execute(
        """
        INSERT INTO monthly_water_readings (
          reading_id, meter_id, household_id, statement_month, reading_period_start,
          reading_period_end, billing_days, opening_reading_kL, closing_reading_kL,
          consumption_kL, average_daily_consumption_kL, reading_type, source_upload_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_id("reading"),
            meter_id,
            household_id,
            statement["statement_month"],
            water["reading_period_start"],
            water["reading_period_end"],
            water["billing_days"],
            water["opening_reading_kL"],
            water["closing_reading_kL"],
            water["consumption_kL"],
            water["average_daily_consumption_kL"],
            water["reading_type"],
            upload_id,
        ),
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_id("statement"),
            household_id,
            upload_id,
            statement["invoice_number"],
            statement["statement_month"],
            statement["statement_month_label"],
            statement["statement_date"],
            statement["due_date"],
            statement["next_reading_date"],
            charges["water_charge_excluding_vat"],
            charges["extended_social_package_grant"],
            charges["demand_management_levy"],
            charges["sewer_monthly_charge"],
            charges["water_vat"],
            charges["water_total_including_vat"],
            charges["property_rates_total"],
            charges["refuse_total"],
            charges["current_charges_excluding_vat"],
            charges["current_vat_total"],
            charges["current_charges_including_vat"],
            charges["previous_account_balance"],
            charges["incoming_payment"],
            charges["subtotal"],
            charges["total_due"],
        ),
    )
    return "imported"


def import_ready_batch(batch_summary_path: Path, db_path: Path = DEFAULT_DB_PATH) -> list[dict]:
    summary = json.loads(batch_summary_path.read_text(encoding="utf-8"))
    results = []
    with connect_database(db_path) as connection:
        insert_batch(connection, summary)
        connection.commit()

        for file_summary in summary.get("files", []):
            if file_summary.get("processing_status") != "import_ready":
                results.append({"file": file_summary.get("source_pdf_filename"), "result": "ignored_not_import_ready"})
                continue

            try:
                with connection:
                    extracted_path = resolve_repo_path(file_summary["output_json_path"])
                    extracted = json.loads(extracted_path.read_text(encoding="utf-8"))
                    result = import_statement(connection, summary, file_summary, extracted)
                    results.append({"file": file_summary["source_pdf_filename"], "result": result})
            except Exception as exc:
                results.append({"file": file_summary.get("source_pdf_filename"), "result": "failed", "error": str(exc)})
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Import import_ready ingestion batch records into SQLite.")
    parser.add_argument("--batch-summary", required=True, help="Path to an ingestion batch summary JSON file.")
    parser.add_argument("--db-path", help="Optional SQLite database path.")
    args = parser.parse_args()

    db_path = Path(args.db_path) if args.db_path else DEFAULT_DB_PATH
    results = import_ready_batch(Path(args.batch_summary), db_path)
    for result in results:
        suffix = f": {result['error']}" if "error" in result else ""
        print(f"{result['file']}: {result['result']}{suffix}")


if __name__ == "__main__":
    main()
