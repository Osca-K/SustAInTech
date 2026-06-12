import csv
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOUSEHOLDS_FILE = ROOT / "data" / "generated" / "households.json"
READINGS_FILE = ROOT / "data" / "generated" / "monthly_water_readings.json"
TARIFF_FILE = ROOT / "data" / "tariffs" / "synthetic_tariffs_2026.json"
GENERATED_DIR = ROOT / "data" / "generated"
CSV_FILE = GENERATED_DIR / "monthly_statement_records.csv"
JSON_FILE = GENERATED_DIR / "monthly_statement_records.json"

CENT = Decimal("0.01")

FIELDS = [
    "household_id",
    "statement_month",
    "statement_month_label",
    "invoice_number",
    "water_charge_excluding_vat",
    "extended_social_package_grant",
    "demand_management_levy",
    "sewer_monthly_charge",
    "water_vat",
    "water_total_including_vat",
    "property_rates_excluding_vat",
    "property_rates_vat",
    "property_rates_total",
    "refuse_excluding_vat",
    "refuse_vat",
    "refuse_total",
    "current_charges_excluding_vat",
    "current_vat_total",
    "current_charges_including_vat",
    "previous_account_balance",
    "incoming_payment",
    "subtotal",
    "total_due",
    "needs_geocoding",
    "is_synthetic",
]


def money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def water_steps(consumption: int, tariff: dict) -> tuple[Decimal, list[dict]]:
    total = Decimal("0.00")
    rows = []
    consumed = Decimal(consumption)
    for step in tariff["water_steps"]:
        lower = Decimal(str(step["from_kl"]))
        upper = None if step["to_kl"] is None else Decimal(str(step["to_kl"]))
        if upper is None:
            quantity = max(Decimal("0"), consumed - lower)
        else:
            quantity = max(Decimal("0"), min(consumed, upper) - lower)
        amount = money(quantity * Decimal(str(step["rate_per_kl"])))
        total += amount
        rows.append(
            {
                "description": step["description"],
                "quantity_kl": int(quantity),
                "rate_per_kl": money(step["rate_per_kl"]),
                "amount": amount,
            }
        )
    return money(total), rows


def calculate_records() -> list[dict]:
    households = {row["household_id"]: row for row in json.loads(HOUSEHOLDS_FILE.read_text(encoding="utf-8"))}
    readings = json.loads(READINGS_FILE.read_text(encoding="utf-8"))
    tariff = json.loads(TARIFF_FILE.read_text(encoding="utf-8"))
    vat_rate = Decimal(str(tariff["vat_rate"]))
    records = []

    for index, reading in enumerate(readings, start=1):
        household = households[reading["household_id"]]
        consumption = int(reading["consumption_kl"])
        water_charge, tariff_steps = water_steps(consumption, tariff)
        grant = money(tariff["extended_social_package_grant"])
        demand_levy = money(tariff["demand_management_levy"])
        sewer_charge = money(tariff["sewer_monthly_charge"])
        water_subtotal = money(water_charge - grant + demand_levy + sewer_charge)
        water_vat = money(water_subtotal * vat_rate)
        water_total = money(water_subtotal + water_vat)

        valuation = Decimal(str(household["municipal_valuation"]))
        rebate = Decimal(str(tariff["property_rates"]["rebate_value"]))
        rates_base = max(Decimal("0.00"), valuation - rebate)
        property_excl = money(rates_base * Decimal(str(tariff["property_rates"]["monthly_rate"])))
        property_vat = money(property_excl * Decimal(str(tariff["property_rates"]["vat_rate"])))
        property_total = money(property_excl + property_vat)

        refuse_excl = money(tariff["refuse_charge"])
        refuse_vat = money(refuse_excl * Decimal(str(tariff["refuse_vat_rate"])))
        refuse_total = money(refuse_excl + refuse_vat)

        current_excl = money(water_subtotal + property_excl + refuse_excl)
        current_vat = money(water_vat + property_vat + refuse_vat)
        current_incl = money(current_excl + current_vat)
        previous_balance = money(650 + (index % 9) * 37.45)

        records.append(
            {
                **household,
                **reading,
                "invoice_number": str(260400000000 + index),
                "water_tariff_steps": tariff_steps,
                "water_charge_excluding_vat": water_charge,
                "extended_social_package_grant": grant,
                "demand_management_levy": demand_levy,
                "sewer_monthly_charge": sewer_charge,
                "water_vat": water_vat,
                "water_total_including_vat": water_total,
                "property_rates_excluding_vat": property_excl,
                "property_rates_vat": property_vat,
                "property_rates_total": property_total,
                "refuse_excluding_vat": refuse_excl,
                "refuse_vat": refuse_vat,
                "refuse_total": refuse_total,
                "current_charges_excluding_vat": current_excl,
                "current_vat_total": current_vat,
                "current_charges_including_vat": current_incl,
                "previous_account_balance": previous_balance,
                "incoming_payment": money(-previous_balance),
                "subtotal": money(0),
                "total_due": current_incl,
            }
        )
    return records


def json_ready(value):
    if isinstance(value, Decimal):
        return f"{value:.2f}"
    raise TypeError(f"Cannot serialize {type(value)}")


def write_outputs(records: list[dict]) -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    JSON_FILE.write_text(json.dumps(records, indent=2, default=json_ready), encoding="utf-8")
    with CSV_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow({field: record.get(field) for field in FIELDS})


def main() -> list[dict]:
    records = calculate_records()
    write_outputs(records)
    print(f"Generated {len(records)} monthly statement records.")
    print(f"Wrote {CSV_FILE}")
    print(f"Wrote {JSON_FILE}")
    return records


if __name__ == "__main__":
    main()
