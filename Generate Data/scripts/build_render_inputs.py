import json
from datetime import date
from decimal import Decimal
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PILOT_FILE = ROOT / "data" / "pilot_area.json"
RECORDS_FILE = ROOT / "data" / "generated" / "monthly_statement_records.json"
RENDER_DIR = ROOT / "data" / "render_inputs"


def decimal_value(value) -> Decimal:
    return Decimal(str(value))


def money(value) -> str:
    return f"R {decimal_value(value):,.2f}"


def month_due_date(statement_month: str) -> str:
    year, month = [int(part) for part in statement_month.split("-")]
    return date(year, month, 20).strftime("%Y/%m/%d")


def next_reading_date(statement_month: str) -> str:
    year, month = [int(part) for part in statement_month.split("-")]
    if month == 12:
        year += 1
        month = 1
    else:
        month += 1
    return date(year, month, 1).strftime("%Y/%m/%d")


def statement_date(statement_month: str) -> str:
    year, month = [int(part) for part in statement_month.split("-")]
    return date(year, month, 1).strftime("%Y/%m/%d")


def payment_reference(account_number: str) -> str:
    check_digit = str(sum(int(digit) for digit in account_number) % 10)
    return f"91115 {account_number}{check_digit}"


def transform(record: dict, pilot: dict) -> dict:
    stand_portion = f"{record['stand_number']} - {record['portion']}"
    reading_period = (
        f"{record['reading_period_start'].replace('-', '/')} to "
        f"{record['reading_period_end'].replace('-', '/')}"
    )
    tariff_steps = [
        {
            "description": step["description"],
            "quantity": f"{step['quantity_kl']} kL",
            "rate": money(step["rate_per_kl"]),
            "amount": money(step["amount"]),
        }
        for step in record["water_tariff_steps"]
    ]
    data = {
        "is_synthetic": True,
        "pilot_name": pilot["pilot_name"],
        "household_id": record["household_id"],
        "statement_month": record["statement_month"],
        "statement": {
            "date": statement_date(record["statement_month"]),
            "period": record["statement_month_label"],
            "invoice_number": record["invoice_number"],
            "next_reading_date": next_reading_date(record["statement_month"]),
            "client_vat_number": record["client_vat_number"],
            "deposit": money(0),
            "due_date": month_due_date(record["statement_month"]),
        },
        "customer": {
            "name": record["customer_name"],
            "postal_address": [
                record["postal_address_line_1"],
                record["postal_address_line_2"],
                record["postal_code"],
            ],
            "physical_address": record["physical_address"],
            "stand_portion": stand_portion,
            "township": record["township"],
        },
        "property": {
            "stand_size": f"{record['stand_size_m2']} m2",
            "number_of_dwellings": str(record["number_of_dwellings"]),
            "date_of_valuation": record["valuation_date"],
            "portion": record["portion"],
            "municipal_valuation": money(record["municipal_valuation"]),
            "region": f"{record['region']} {record['ward']}",
        },
        "account": {
            "number": record["account_number"],
            "pin": record["pin_code"],
        },
        "summary": {
            "previous_balance": money(record["previous_account_balance"]),
            "incoming_payment": money(record["incoming_payment"]),
            "sub_total": money(record["subtotal"]),
            "current_charges_excl_vat": money(record["current_charges_excluding_vat"]),
            "vat": money(record["current_vat_total"]),
            "total_due": money(record["total_due"]),
        },
        "ageing": {
            "90_days_plus": money(0),
            "60_days": money(0),
            "30_days": money(0),
            "current": money(record["total_due"]),
            "installment_plan": money(0),
            "total_outstanding": money(record["total_due"]),
        },
        "message": "Customers are encouraged to monitor monthly water consumption and report suspected leaks promptly.",
        "payment": {
            "easypay_reference": payment_reference(record["account_number"]),
            "post_office_reference": f"0146 {record['account_number']}",
            "standard_bank_reference": record["account_number"],
            "beneficiary": "City of Johannesburg",
            "bank": "Standard Bank",
            "branch_code": "051001",
            "account_type": "Current",
            "account_number": f"000{record['account_number']}",
        },
        "water": {
            "service_name": "Johannesburg Water and Sanitation",
            "reading_period": reading_period,
            "meter_number": record["water_meter_number"],
            "register": "A",
            "multiply_factor": "1",
            "start_reading": str(record["opening_reading_kl"]),
            "end_reading": str(record["closing_reading_kl"]),
            "difference": str(record["consumption_kl"]),
            "consumption": str(record["consumption_kl"]),
            "units": "kL",
            "reading_type": record["reading_type"],
            "average_daily_consumption": f"{decimal_value(record['average_daily_consumption_kl']):.2f} kL",
            "tariff_steps": tariff_steps,
            "adjustments": [
                {"description": f"Extended Social Package Grant: {money(record['extended_social_package_grant'])}"},
                {"description": f"Demand Management Levy: {money(record['demand_management_levy'])}"},
                {"description": f"Sewer Monthly Charge: {money(record['sewer_monthly_charge'])}"},
            ],
            "vat": money(record["water_vat"]),
            "subtotal": money(
                decimal_value(record["water_charge_excluding_vat"])
                - decimal_value(record["extended_social_package_grant"])
                + decimal_value(record["demand_management_levy"])
                + decimal_value(record["sewer_monthly_charge"])
            ),
            "total": money(record["water_total_including_vat"]),
        },
        "rates": {
            "service_name": "City of Johannesburg Property Rates",
            "rows": [
                {
                    "description": "Residential property rates - valuation",
                    "period": record["statement_month"].replace("-", "/"),
                    "amount": money(record["property_rates_total"]),
                }
            ],
            "total": money(record["property_rates_total"]),
        },
        "refuse": {
            "service_name": "Pikitup Refuse",
            "rows": [
                {
                    "description": "Domestic refuse removal - dwelling",
                    "period": record["statement_month"].replace("-", "/"),
                    "amount": money(record["refuse_total"]),
                }
            ],
            "total": money(record["refuse_total"]),
        },
        "current_charges_including_vat": money(record["current_charges_including_vat"]),
    }
    return data


def build_inputs() -> list[Path]:
    pilot = json.loads(PILOT_FILE.read_text(encoding="utf-8"))
    records = json.loads(RECORDS_FILE.read_text(encoding="utf-8"))
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    for old_file in RENDER_DIR.glob("*.json"):
        old_file.unlink()

    paths = []
    for record in records:
        data = transform(record, pilot)
        path = RENDER_DIR / f"{record['household_id']}_{record['statement_month']}.json"
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        paths.append(path)
    return paths


def main() -> list[Path]:
    paths = build_inputs()
    print(f"Built {len(paths)} renderer input files.")
    print(f"Wrote files under {RENDER_DIR}")
    return paths


if __name__ == "__main__":
    main()
