import csv
import json
from decimal import Decimal
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / "data" / "generated"
HOUSEHOLDS_FILE = GENERATED_DIR / "households.json"
READINGS_FILE = GENERATED_DIR / "monthly_water_readings.json"
RECORDS_FILE = GENERATED_DIR / "monthly_statement_records.json"
PDF_DIR = ROOT / "output" / "pdf"
RENDER_INPUT_DIR = ROOT / "data" / "render_inputs"
EVALUATION_FILE = ROOT / "data" / "evaluation" / "ground_truth_anomalies.csv"
MONTHS = {"2026-04", "2026-05", "2026-06"}
FORBIDDEN_BILLING_WORDS = ("DEMO", "TEST", "SYNTHETIC")
FORBIDDEN_OPERATIONAL_TOKENS = (
    "possible_leak",
    "sustained_high_usage",
    "anomaly_type",
    "anomaly_notes",
    "expected_classification",
    "scenario_notes",
)
EXPECTED_GROUND_TRUTH = {
    ("SV-H004", "2026-06", "possible_leak", "Sudden increase in monthly water consumption"),
    ("SV-H008", "2026-05", "sustained_high_usage", "Elevated usage begins"),
    ("SV-H008", "2026-06", "sustained_high_usage", "Elevated usage continues across consecutive months"),
}


def decimal_value(value) -> Decimal:
    return Decimal(str(value))


def check(condition: bool, message: str, failures: list[str]) -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}: {message}")
    if not condition:
        failures.append(message)


def ordinary_billing_text(record: dict) -> str:
    excluded = {
        "is_synthetic",
        "anomaly_notes",
        "anomaly_type",
        "development",
        "municipality",
        "region",
        "ward",
        "needs_geocoding",
        "latitude",
        "longitude",
    }
    return " ".join(str(value) for key, value in record.items() if key not in excluded).upper()


def read_ground_truth() -> list[dict]:
    with EVALUATION_FILE.open(newline="", encoding="utf-8") as csv_file:
        return list(csv.DictReader(csv_file))


def operational_files() -> list[Path]:
    files = []
    files.extend(GENERATED_DIR.glob("*.csv"))
    files.extend(GENERATED_DIR.glob("*.json"))
    files.extend(RENDER_INPUT_DIR.glob("*.json"))
    files.extend(PDF_DIR.glob("SV-H*_2026-*.pdf"))
    return files


def file_contains_forbidden_token(path: Path) -> bool:
    if path.suffix.lower() == ".pdf":
        content = path.read_bytes().lower()
        return any(token.encode("utf-8") in content for token in FORBIDDEN_OPERATIONAL_TOKENS)
    content = path.read_text(encoding="utf-8").lower()
    return any(token in content for token in FORBIDDEN_OPERATIONAL_TOKENS)


def main() -> None:
    failures = []
    households = json.loads(HOUSEHOLDS_FILE.read_text(encoding="utf-8"))
    readings = json.loads(READINGS_FILE.read_text(encoding="utf-8"))
    records = json.loads(RECORDS_FILE.read_text(encoding="utf-8"))
    pdfs = sorted(PDF_DIR.glob("SV-H*_2026-*.pdf"))

    check(len(households) == 10, "exactly 10 households exist", failures)
    check(len({row["account_number"] for row in households}) == 10, "account numbers are unique", failures)
    check(len({row["water_meter_number"] for row in households}) == 10, "meter numbers are unique", failures)
    check(len(records) == 30, "exactly 30 monthly statement records exist", failures)

    records_by_household = {}
    for record in records:
        records_by_household.setdefault(record["household_id"], set()).add(record["statement_month"])
    check(
        all(records_by_household.get(household["household_id"]) == MONTHS for household in households),
        "every household has April, May, and June 2026 records",
        failures,
    )

    carry_forward_ok = True
    for household in households:
        household_readings = sorted(
            [row for row in readings if row["household_id"] == household["household_id"]],
            key=lambda row: row["statement_month"],
        )
        for previous, current in zip(household_readings, household_readings[1:]):
            if previous["closing_reading_kl"] != current["opening_reading_kl"]:
                carry_forward_ok = False
    check(carry_forward_ok, "closing readings carry forward correctly", failures)
    check(all(int(row["consumption_kl"]) >= 0 for row in readings), "consumption is never negative", failures)
    required_reading_fields = {
        "household_id",
        "statement_month",
        "meter_number",
        "opening_reading_kL",
        "closing_reading_kL",
        "consumption_kL",
        "billing_days",
        "average_daily_consumption_kL",
        "reading_type",
    }
    check(
        all(required_reading_fields.issubset(row.keys()) for row in readings),
        "application-facing water readings contain required usage fields",
        failures,
    )

    totals_ok = True
    for record in records:
        current_excl = decimal_value(record["current_charges_excluding_vat"])
        current_vat = decimal_value(record["current_vat_total"])
        total_due = decimal_value(record["total_due"])
        if current_excl + current_vat != total_due:
            totals_ok = False
        if decimal_value(record["incoming_payment"]) != -decimal_value(record["previous_account_balance"]):
            totals_ok = False
        if decimal_value(record["subtotal"]) != Decimal("0.00"):
            totals_ok = False
    check(totals_ok, "statement totals reconcile", failures)

    h004_june = next(row for row in readings if row["household_id"] == "SV-H004" and row["statement_month"] == "2026-06")
    check(
        int(h004_june["consumption_kl"]) == 36,
        "SV-H004 June remains approximately 36 kL through numerical usage only",
        failures,
    )

    h008_high = [
        row for row in readings
        if row["household_id"] == "SV-H008" and row["statement_month"] in {"2026-05", "2026-06"}
    ]
    check(
        len(h008_high) == 2
        and all(int(row["consumption_kl"]) >= 29 for row in h008_high),
        "SV-H008 May and June remain elevated through numerical usage only",
        failures,
    )

    check(
        all(row["latitude"] is None and row["longitude"] is None for row in households),
        "no latitude or longitude value is invented",
        failures,
    )
    check(
        all(row["needs_geocoding"] is True and row["is_synthetic"] is True for row in households + readings + records),
        "every record has needs_geocoding=true and is_synthetic=true",
        failures,
    )
    check(
        not any(word in ordinary_billing_text(record) for record in records for word in FORBIDDEN_BILLING_WORDS),
        "ordinary billing values do not contain DEMO, TEST, or SYNTHETIC",
        failures,
    )
    check(
        all(not file_contains_forbidden_token(path) for path in operational_files()),
        "operational CSV, JSON, render inputs, and PDFs contain no hidden label tokens",
        failures,
    )
    ground_truth_rows = read_ground_truth() if EVALUATION_FILE.exists() else []
    ground_truth_values = {
        (
            row["household_id"],
            row["statement_month"],
            row["expected_classification"],
            row["scenario_notes"],
        )
        for row in ground_truth_rows
    }
    check(EVALUATION_FILE.exists(), "hidden evaluation ground-truth file exists", failures)
    check(
        EXPECTED_GROUND_TRUTH.issubset(ground_truth_values),
        "hidden evaluation file contains expected labels",
        failures,
    )
    check(len(pdfs) == 30, "exactly 30 PDF statements are rendered", failures)

    if failures:
        print("")
        print(f"Validation failed with {len(failures)} issue(s).")
        raise SystemExit(1)
    print("")
    print("Validation passed.")


if __name__ == "__main__":
    main()
