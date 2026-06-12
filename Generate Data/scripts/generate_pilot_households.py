import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PILOT_FILE = ROOT / "data" / "pilot_area.json"
GENERATED_DIR = ROOT / "data" / "generated"
CSV_FILE = GENERATED_DIR / "households.csv"
JSON_FILE = GENERATED_DIR / "households.json"

STREETS = [
    "CALABASH STREET",
    "DRAGONFRUIT STREET",
    "HARRIER STREET",
    "BARBET CRESCENT",
    "WINTER STREET",
]

NAMES = [
    "LINDIWE NKOSI",
    "SIPHO DLAMINI",
    "NOMSA MASEKO",
    "KAGISO MOLEFE",
    "AYANDA KHUMALO",
    "THABO RAKOENA",
    "ZANELE MTHEMBU",
    "LERATO MOKGOSI",
    "MANDLA SIBIYA",
    "BUSISIWE MABENA",
]

HOUSE_NUMBERS = [7, 19, 26, 38, 47, 59, 68, 76, 87, 94]
STAND_SIZES = [342, 356, 371, 388, 405, 417, 429, 444, 461, 478]
VALUATIONS = [710000, 735000, 755000, 780000, 805000, 832000, 860000, 884000, 910000, 935000]

FIELDS = [
    "household_id",
    "customer_name",
    "postal_address_line_1",
    "postal_address_line_2",
    "postal_code",
    "physical_address",
    "street_number",
    "street_name",
    "township",
    "development",
    "municipality",
    "region",
    "ward",
    "stand_number",
    "portion",
    "stand_size_m2",
    "number_of_dwellings",
    "valuation_date",
    "municipal_valuation",
    "account_number",
    "pin_code",
    "client_vat_number",
    "water_meter_number",
    "latitude",
    "longitude",
    "needs_geocoding",
    "is_synthetic",
]


def generate_households() -> list[dict]:
    pilot = json.loads(PILOT_FILE.read_text(encoding="utf-8"))
    households = []
    for index in range(10):
        household_id = f"SV-H{index + 1:03d}"
        street_name = STREETS[index % len(STREETS)]
        street_number = HOUSE_NUMBERS[index]
        stand_number = f"SV28{index + 1:04d}"
        physical_address = (
            f"{street_number} {street_name}, {pilot['development'].upper()}, "
            f"{pilot['extension'].upper()}"
        )
        households.append(
            {
                "household_id": household_id,
                "customer_name": NAMES[index],
                "postal_address_line_1": f"P O BOX {620 + index}",
                "postal_address_line_2": pilot["city"].upper(),
                "postal_code": pilot["postal_code"],
                "physical_address": physical_address,
                "street_number": str(street_number),
                "street_name": street_name,
                "township": pilot["extension"].upper(),
                "development": pilot["development"],
                "municipality": pilot["municipality"],
                "region": pilot["region"],
                "ward": pilot["ward"],
                "stand_number": stand_number,
                "portion": "0000",
                "stand_size_m2": STAND_SIZES[index],
                "number_of_dwellings": 1 if index not in {3, 7} else 2,
                "valuation_date": "2023/07/01",
                "municipal_valuation": VALUATIONS[index],
                "account_number": str(810240000 + index * 137),
                "pin_code": str(420100 + index * 731),
                "client_vat_number": str(405210000 + index * 97),
                "water_meter_number": str(650200 + index * 113),
                "latitude": None,
                "longitude": None,
                "needs_geocoding": True,
                "is_synthetic": True,
            }
        )
    return households


def write_outputs(households: list[dict]) -> None:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    JSON_FILE.write_text(json.dumps(households, indent=2), encoding="utf-8")
    with CSV_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(households)


def main() -> list[dict]:
    households = generate_households()
    write_outputs(households)
    print(f"Generated {len(households)} households.")
    print(f"Wrote {CSV_FILE}")
    print(f"Wrote {JSON_FILE}")
    return households


if __name__ == "__main__":
    main()
