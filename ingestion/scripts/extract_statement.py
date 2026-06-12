import argparse
import json
import re
from datetime import datetime
from pathlib import Path

import fitz

from validate_extracted_statement import validate_extracted_statement


INGESTION_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = INGESTION_ROOT / "output"
EXTRACTION_METHOD = "deterministic_pdf_text_parser"
MONTHS = {
    "January": "01",
    "February": "02",
    "March": "03",
    "April": "04",
    "May": "05",
    "June": "06",
    "July": "07",
    "August": "08",
    "September": "09",
    "October": "10",
    "November": "11",
    "December": "12",
}


class ParseError(ValueError):
    pass


def extract_text(pdf_path: Path) -> str:
    with fitz.open(pdf_path) as document:
        return "\n".join(page.get_text() for page in document)


def clean_text(text: str) -> str:
    text = text.replace("\u2019", "'").replace("\u2014", "-")
    text = text.replace("-\n", "")
    text = re.sub(r"[ \t]+", " ", text)
    return text


def require(pattern: str, text: str, label: str, flags: int = 0) -> re.Match:
    match = re.search(pattern, text, flags)
    if not match:
        raise ParseError(f"Could not parse {label}.")
    return match


def money_to_float(value: str) -> float:
    cleaned = value.replace("R", "").replace(",", "").strip()
    return float(cleaned)


def month_from_label(label: str) -> str:
    month_name, year = label.split()
    return f"{year}-{MONTHS[month_name]}"


def days_between(start: str, end: str) -> int:
    start_date = datetime.strptime(start, "%Y/%m/%d")
    end_date = datetime.strptime(end, "%Y/%m/%d")
    return (end_date - start_date).days + 1


def section(text: str, start: str, end: str) -> str:
    match = require(rf"{re.escape(start)}(?P<section>.*?){re.escape(end)}", text, f"{start} section", re.S)
    return match.group("section")


def parse_money_after(label: str, text: str) -> float:
    match = require(rf"{re.escape(label)}\s*\n(?P<amount>R -?[\d,]+\.\d{{2}})", text, label)
    return money_to_float(match.group("amount"))


def parse_page_one_summary(text: str) -> dict:
    match = require(
        r"Previous Account Balance\s*\n"
        r"Less: Incoming Payment\s*\n"
        r"Sub Total\s*\n"
        r"Current Charges \(Excl\. VAT\)\s*\n"
        r"VAT @ 15%\s*\n"
        r"(?P<previous>R -?[\d,]+\.\d{2})\s*\n"
        r"(?P<payment>R -?[\d,]+\.\d{2})\s*\n"
        r"(?P<subtotal>R -?[\d,]+\.\d{2})\s*\n"
        r"(?P<current_excl>R -?[\d,]+\.\d{2})\s*\n"
        r"(?P<vat>R -?[\d,]+\.\d{2})",
        text,
        "page-one account summary",
    )
    return {
        "previous_account_balance": money_to_float(match.group("previous")),
        "incoming_payment": money_to_float(match.group("payment")),
        "subtotal": money_to_float(match.group("subtotal")),
        "current_charges_excluding_vat": money_to_float(match.group("current_excl")),
        "current_vat_total": money_to_float(match.group("vat")),
    }


def parse_statement(pdf_path: Path) -> dict:
    text = clean_text(extract_text(pdf_path))
    water_section = section(text, "Johannesburg Water", "City of Johannesburg\nProperty Rates")
    property_section = section(text, "City of Johannesburg\nProperty Rates", "PIKITUP")
    refuse_section = section(text, "PIKITUP", "Current Charges (including VAT)")
    page_one_summary = parse_page_one_summary(text)

    statement_month_label = require(r"Statement for\s*\n(?P<label>[A-Za-z]+ \d{4})", text, "statement month").group("label")
    statement_date = require(r"Date\s*\n(?P<date>\d{4}/\d{2}/\d{2})", text, "statement date").group("date")
    reading_period = require(
        r"\(Reading period = (?P<start>\d{4}/\d{2}/\d{2}) to (?P<end>\d{4}/\d{2}/\d{2})\)",
        water_section,
        "reading period",
    )
    meter = require(
        r"Meter: (?P<meter>\d+);.*?Start reading: (?P<start>\d+(?:\.\d+)?);"
        r"\s*End reading: (?P<end>\d+(?:\.\d+)?); Difference: (?P<difference>\d+(?:\.\d+)?);"
        r" Consumption: (?P<consumption>\d+(?:\.\d+)?) kL;",
        water_section,
        "water meter readings",
        re.S,
    )
    reading_type = require(r"Type: (?P<type>[^.]+)\.", water_section, "reading type").group("type").strip()
    daily_average = float(require(r"Daily average consumption (?P<average>\d+(?:\.\d+)?) kL", water_section, "daily average").group("average"))

    tariff_amounts = [
        money_to_float(amount)
        for amount in re.findall(r"Step \d+: .*? at R [\d,]+\.\d{2}: (R [\d,]+\.\d{2})", water_section)
    ]
    water_charge_excluding_vat = round(sum(tariff_amounts), 2)
    extended_grant = money_to_float(require(r"Extended Social Package Grant: (?P<amount>R [\d,]+\.\d{2})", water_section, "grant").group("amount"))
    demand_levy = money_to_float(require(r"Demand Management Levy: (?P<amount>R [\d,]+\.\d{2})", water_section, "demand levy").group("amount"))
    sewer_charge = money_to_float(require(r"Sewer Monthly Charge: (?P<amount>R [\d,]+\.\d{2})", water_section, "sewer charge").group("amount"))
    water_totals = re.findall(r"R -?[\d,]+\.\d{2}|(?<!R )\b\d+\.\d{2}\b", water_section)
    water_vat = money_to_float(water_totals[-2])
    water_total = money_to_float(water_totals[-1])

    property_total = money_to_float(re.findall(r"R -?[\d,]+\.\d{2}", property_section)[-1])
    refuse_total = money_to_float(re.findall(r"R -?[\d,]+\.\d{2}", refuse_section)[-1])

    address = require(
        r"Physical Address\s*\n(?P<address>.*?)\nStand No\./Portion",
        text,
        "physical address",
        re.S,
    ).group("address")
    physical_address = " ".join(address.split())

    region_match = require(
        r"R [\d,]+\.\d{2}\s*\n(?P<region>Region [A-Z])\s*\n(?P<ward>WARD \d+)",
        text,
        "region and ward",
    )

    data = {
        "source_pdf_filename": pdf_path.name,
        "extraction_method": EXTRACTION_METHOD,
        "extraction_status": "success",
        "validation_status": "not_validated",
        "requires_manual_review": False,
        "review_reasons": [],
        "statement": {
            "invoice_number": require(r"Invoice Number: (?P<value>\d+)", text, "invoice number").group("value"),
            "statement_month": month_from_label(statement_month_label),
            "statement_month_label": statement_month_label,
            "statement_date": statement_date,
            "due_date": require(r"Due Date\s*\n(?P<value>\d{4}/\d{2}/\d{2})", text, "due date").group("value"),
            "next_reading_date": require(r"Next Reading Date: (?P<value>\d{4}/\d{2}/\d{2})", text, "next reading date").group("value"),
        },
        "household": {
            "account_number": require(r"Account Number: (?P<value>\d+)", text, "account number").group("value"),
            "customer_name": require(r"TAX INVOICE\s*\n(?P<value>[A-Z ]+)", text, "customer name").group("value").strip(),
            "physical_address": physical_address,
            "stand_number": require(r"Stand No\./Portion\s*\n(?P<value>.*?)\nTownship", text, "stand number", re.S).group("value").strip(),
            "township": require(r"Township\s*\n(?P<value>.*?)\nStand Size", text, "township", re.S).group("value").strip(),
            "region": region_match.group("region"),
            "ward": region_match.group("ward"),
        },
        "water_meter": {
            "meter_number": meter.group("meter"),
            "reading_period_start": reading_period.group("start"),
            "reading_period_end": reading_period.group("end"),
            "billing_days": days_between(reading_period.group("start"), reading_period.group("end")),
            "opening_reading_kL": float(meter.group("start")),
            "closing_reading_kL": float(meter.group("end")),
            "consumption_kL": float(meter.group("consumption")),
            "average_daily_consumption_kL": daily_average,
            "reading_type": reading_type,
        },
        "charges": {
            "water_charge_excluding_vat": water_charge_excluding_vat,
            "extended_social_package_grant": extended_grant,
            "demand_management_levy": demand_levy,
            "sewer_monthly_charge": sewer_charge,
            "water_vat": water_vat,
            "water_total_including_vat": water_total,
            "property_rates_total": property_total,
            "refuse_total": refuse_total,
            "current_charges_excluding_vat": page_one_summary["current_charges_excluding_vat"],
            "current_vat_total": page_one_summary["current_vat_total"],
            "current_charges_including_vat": parse_money_after("Current Charges (including VAT)", text),
            "previous_account_balance": page_one_summary["previous_account_balance"],
            "incoming_payment": page_one_summary["incoming_payment"],
            "subtotal": page_one_summary["subtotal"],
            "total_due": parse_money_after("Total Due", text),
        },
    }
    return data


def default_output_path(pdf_path: Path) -> Path:
    return OUTPUT_DIR / f"{pdf_path.stem}_extracted.json"


def extract_to_json(input_pdf: Path, output_path: Path | None = None, run_validation: bool = True) -> dict:
    output_path = output_path or default_output_path(input_pdf)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = parse_statement(input_pdf)
    except Exception as exc:
        data = {
            "source_pdf_filename": input_pdf.name,
            "extraction_method": EXTRACTION_METHOD,
            "extraction_status": "failed",
            "validation_status": "failed",
            "requires_manual_review": True,
            "review_reasons": [str(exc)],
            "statement": {},
            "household": {},
            "water_meter": {},
            "charges": {},
        }
    if run_validation:
        data = validate_extracted_statement(data)
    output_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def print_summary(data: dict, output_path: Path) -> None:
    print(f"Output: {output_path}")
    print(f"Extraction: {data['extraction_status']}")
    print(f"Validation: {data['validation_status']}")
    print(f"Manual review: {data['requires_manual_review']}")
    print(f"Account: {data.get('household', {}).get('account_number', '')}")
    print(f"Meter: {data.get('water_meter', {}).get('meter_number', '')}")
    print(f"Consumption: {data.get('water_meter', {}).get('consumption_kL', '')} kL")
    print(f"Total due: {data.get('charges', {}).get('total_due', '')}")
    for reason in data.get("review_reasons", []):
        print(f"- {reason}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract a structured municipal statement JSON from one PDF.")
    parser.add_argument("--input", required=True, help="Path to one municipal statement PDF.")
    parser.add_argument("--output", help="Optional output JSON path.")
    args = parser.parse_args()

    input_pdf = Path(args.input)
    output_path = Path(args.output) if args.output else default_output_path(input_pdf)
    data = extract_to_json(input_pdf, output_path, run_validation=True)
    print_summary(data, output_path)


if __name__ == "__main__":
    main()
