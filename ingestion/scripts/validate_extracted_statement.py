import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from jsonschema import Draft202012Validator


FORBIDDEN_LABELS = (
    "possible_leak",
    "sustained_high_usage",
    "anomaly_type",
    "anomaly_notes",
    "expected_classification",
    "scenario_notes",
)
DATE_FORMAT = "%Y/%m/%d"
TOLERANCE = 0.02
DAILY_TOLERANCE = 0.02
INGESTION_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_FILE = INGESTION_ROOT / "schemas" / "municipal_statement.schema.json"


def nearly_equal(left: float, right: float, tolerance: float = TOLERANCE) -> bool:
    return abs(left - right) <= tolerance


def required_paths() -> list[tuple[str, ...]]:
    return [
        ("statement", "invoice_number"),
        ("statement", "statement_month"),
        ("statement", "statement_month_label"),
        ("statement", "statement_date"),
        ("statement", "due_date"),
        ("statement", "next_reading_date"),
        ("household", "account_number"),
        ("household", "customer_name"),
        ("household", "physical_address"),
        ("household", "stand_number"),
        ("household", "township"),
        ("household", "region"),
        ("household", "ward"),
        ("water_meter", "meter_number"),
        ("water_meter", "reading_period_start"),
        ("water_meter", "reading_period_end"),
        ("water_meter", "billing_days"),
        ("water_meter", "opening_reading_kL"),
        ("water_meter", "closing_reading_kL"),
        ("water_meter", "consumption_kL"),
        ("water_meter", "average_daily_consumption_kL"),
        ("water_meter", "reading_type"),
        ("charges", "water_charge_excluding_vat"),
        ("charges", "extended_social_package_grant"),
        ("charges", "demand_management_levy"),
        ("charges", "sewer_monthly_charge"),
        ("charges", "water_vat"),
        ("charges", "water_total_including_vat"),
        ("charges", "property_rates_total"),
        ("charges", "refuse_total"),
        ("charges", "current_charges_excluding_vat"),
        ("charges", "current_vat_total"),
        ("charges", "current_charges_including_vat"),
        ("charges", "previous_account_balance"),
        ("charges", "incoming_payment"),
        ("charges", "subtotal"),
        ("charges", "total_due"),
    ]


def get_path(data: dict, path: tuple[str, ...]):
    current = data
    for key in path:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, DATE_FORMAT)


def validate_extracted_statement(data: dict) -> dict:
    reasons = list(data.get("review_reasons", []))

    if SCHEMA_FILE.exists():
        schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
        schema_errors = Draft202012Validator(schema).iter_errors(data)
        for error in schema_errors:
            location = ".".join(str(part) for part in error.absolute_path) or "root"
            reasons.append(f"Schema validation failed at {location}: {error.message}")

    for path in required_paths():
        value = get_path(data, path)
        if value is None or value == "":
            reasons.append(f"Missing required field: {'.'.join(path)}")

    statement = data.get("statement", {})
    household = data.get("household", {})
    water = data.get("water_meter", {})
    charges = data.get("charges", {})

    if not household.get("account_number"):
        reasons.append("Account number was not extracted.")
    if not statement.get("invoice_number"):
        reasons.append("Invoice number was not extracted.")
    if not water.get("meter_number"):
        reasons.append("Meter number was not extracted.")

    try:
        opening = float(water["opening_reading_kL"])
        closing = float(water["closing_reading_kL"])
        consumption = float(water["consumption_kL"])
        billing_days = int(water["billing_days"])
        daily_average = float(water["average_daily_consumption_kL"])
        if consumption < 0:
            reasons.append("Consumption is negative.")
        if not nearly_equal(closing - opening, consumption):
            reasons.append("Water readings do not reconcile: closing - opening must equal consumption.")
        if billing_days <= 0:
            reasons.append("Billing days must be greater than zero.")
        elif not nearly_equal(consumption / billing_days, daily_average, DAILY_TOLERANCE):
            reasons.append("Daily average does not reconcile with consumption and billing days.")
    except (KeyError, TypeError, ValueError):
        reasons.append("Water reading values could not be validated as numbers.")

    try:
        water_total = (
            float(charges["water_charge_excluding_vat"])
            + float(charges["demand_management_levy"])
            + float(charges["sewer_monthly_charge"])
            - float(charges["extended_social_package_grant"])
            + float(charges["water_vat"])
        )
        if not nearly_equal(water_total, float(charges["water_total_including_vat"])):
            reasons.append("Water charges do not reconcile.")

        statement_total = (
            float(charges["water_total_including_vat"])
            + float(charges["property_rates_total"])
            + float(charges["refuse_total"])
        )
        if not nearly_equal(statement_total, float(charges["current_charges_including_vat"])):
            reasons.append("Current charges including VAT do not reconcile.")

        account_total = (
            float(charges["previous_account_balance"])
            + float(charges["incoming_payment"])
            + float(charges["subtotal"])
            + float(charges["current_charges_including_vat"])
        )
        if not nearly_equal(account_total, float(charges["total_due"])):
            reasons.append("Account total does not reconcile.")
    except (KeyError, TypeError, ValueError):
        reasons.append("Charge values could not be validated as numbers.")

    for field_name in ("statement_date", "due_date", "next_reading_date"):
        try:
            parse_date(statement[field_name])
        except (KeyError, TypeError, ValueError):
            reasons.append(f"Date is not parseable: statement.{field_name}")

    try:
        statement_date = parse_date(statement["statement_date"])
        expected_month = f"{statement_date.year:04d}-{statement_date.month:02d}"
        if statement.get("statement_month") != expected_month:
            reasons.append("Statement month does not match the statement date.")
    except (KeyError, TypeError, ValueError):
        pass

    serialized = json.dumps(data, sort_keys=True).lower()
    for token in FORBIDDEN_LABELS:
        if re.search(rf"\b{re.escape(token.lower())}\b", serialized):
            reasons.append(f"Forbidden anomaly label appears in extracted JSON: {token}")

    data["review_reasons"] = sorted(set(reasons))
    data["requires_manual_review"] = bool(data["review_reasons"])
    data["validation_status"] = "failed" if data["requires_manual_review"] else "passed"
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate an extracted municipal statement JSON file.")
    parser.add_argument("--input", required=True, help="Path to extracted statement JSON.")
    args = parser.parse_args()

    path = Path(args.input)
    data = json.loads(path.read_text(encoding="utf-8"))
    validated = validate_extracted_statement(data)
    path.write_text(json.dumps(validated, indent=2), encoding="utf-8")

    print(f"Validated: {path}")
    print(f"Status: {validated['validation_status']}")
    if validated["review_reasons"]:
        for reason in validated["review_reasons"]:
            print(f"- {reason}")


if __name__ == "__main__":
    main()
