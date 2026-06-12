import csv
import json
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOUSEHOLDS_FILE = ROOT / "data" / "generated" / "households.json"
GENERATED_DIR = ROOT / "data" / "generated"
EVALUATION_DIR = ROOT / "data" / "evaluation"
CSV_FILE = GENERATED_DIR / "monthly_water_readings.csv"
JSON_FILE = GENERATED_DIR / "monthly_water_readings.json"
GROUND_TRUTH_FILE = EVALUATION_DIR / "ground_truth_anomalies.csv"

MONTHS = [
    {"month": "2026-04", "label": "April 2026", "start": date(2026, 4, 1), "end": date(2026, 4, 30)},
    {"month": "2026-05", "label": "May 2026", "start": date(2026, 5, 1), "end": date(2026, 5, 31)},
    {"month": "2026-06", "label": "June 2026", "start": date(2026, 6, 1), "end": date(2026, 6, 30)},
]

FIELDS = [
    "household_id",
    "statement_month",
    "statement_month_label",
    "reading_period_start",
    "reading_period_end",
    "billing_days",
    "reading_type",
    "meter_number",
    "opening_reading_kL",
    "closing_reading_kL",
    "consumption_kL",
    "average_daily_consumption_kL",
    "opening_reading_kl",
    "consumption_kl",
    "closing_reading_kl",
    "average_daily_consumption_kl",
    "needs_geocoding",
    "is_synthetic",
]

GROUND_TRUTH_FIELDS = [
    "household_id",
    "statement_month",
    "expected_classification",
    "scenario_notes",
]


def scenario_label(household_id: str, month_index: int) -> tuple[str | None, str | None]:
    if household_id == "SV-H004" and month_index == 2:
        return "possible_leak", "Sudden increase in monthly water consumption"
    if household_id == "SV-H008" and month_index == 1:
        return "sustained_high_usage", "Elevated usage begins"
    if household_id == "SV-H008" and month_index == 2:
        return "sustained_high_usage", "Elevated usage continues across consecutive months"
    return None, None


def planned_consumption(household: dict, index: int, month_index: int) -> int:
    dwellings = int(household["number_of_dwellings"])
    base = 7 + (index % 5) * 2 + (dwellings - 1) * 5
    normal = min(24, base + [0, 2, 1][month_index])

    classification, _notes = scenario_label(household["household_id"], month_index)
    if classification == "possible_leak":
        return 36
    if classification == "sustained_high_usage":
        return 29 if month_index == 1 else 31
    return normal


def generate_readings() -> tuple[list[dict], list[dict]]:
    households = json.loads(HOUSEHOLDS_FILE.read_text(encoding="utf-8"))
    rows = []
    ground_truth_rows = []
    for household_index, household in enumerate(households):
        opening = 980 + household_index * 43
        for month_index, month in enumerate(MONTHS):
            consumption = planned_consumption(household, household_index, month_index)
            classification, notes = scenario_label(household["household_id"], month_index)
            closing = opening + consumption
            billing_days = (month["end"] - month["start"]).days + 1
            average_daily_consumption = round(consumption / billing_days, 3)
            rows.append(
                {
                    "household_id": household["household_id"],
                    "statement_month": month["month"],
                    "statement_month_label": month["label"],
                    "reading_period_start": month["start"].isoformat(),
                    "reading_period_end": month["end"].isoformat(),
                    "billing_days": billing_days,
                    "reading_type": "Actual Readings",
                    "meter_number": household["water_meter_number"],
                    "opening_reading_kL": opening,
                    "closing_reading_kL": closing,
                    "consumption_kL": consumption,
                    "average_daily_consumption_kL": average_daily_consumption,
                    "opening_reading_kl": opening,
                    "consumption_kl": consumption,
                    "closing_reading_kl": closing,
                    "average_daily_consumption_kl": average_daily_consumption,
                    "needs_geocoding": True,
                    "is_synthetic": True,
                }
            )
            if classification:
                ground_truth_rows.append(
                    {
                        "household_id": household["household_id"],
                        "statement_month": month["month"],
                        "expected_classification": classification,
                        "scenario_notes": notes,
                    }
                )
            opening = closing
    return rows, ground_truth_rows


def write_outputs(rows: list[dict], ground_truth_rows: list[dict]) -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    JSON_FILE.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    with CSV_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    # Offline evaluation labels only. The dashboard, database seed import,
    # AI inference inputs, and PDF renderer must never import or read this file.
    with GROUND_TRUTH_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=GROUND_TRUTH_FIELDS)
        writer.writeheader()
        writer.writerows(ground_truth_rows)


def main() -> list[dict]:
    rows, ground_truth_rows = generate_readings()
    write_outputs(rows, ground_truth_rows)
    print(f"Generated {len(rows)} monthly water readings.")
    print(f"Wrote {CSV_FILE}")
    print(f"Wrote {JSON_FILE}")
    print(f"Wrote {GROUND_TRUTH_FILE}")
    return rows


if __name__ == "__main__":
    main()
