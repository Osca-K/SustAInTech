import json
import sys
from pathlib import Path


INGESTION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(INGESTION_ROOT / "scripts"))

from extract_statement import parse_statement
from validate_extracted_statement import FORBIDDEN_LABELS, validate_extracted_statement


PDF_PATH = REPO_ROOT / "Generate Data" / "output" / "pdf" / "SV-H001_2026-04.pdf"


def extracted_statement():
    data = parse_statement(PDF_PATH)
    return validate_extracted_statement(data)


def test_pdf_is_parsed_successfully():
    data = extracted_statement()
    assert data["extraction_status"] == "success"


def test_account_number_is_extracted():
    assert extracted_statement()["household"]["account_number"] == "810240000"


def test_invoice_number_is_extracted():
    assert extracted_statement()["statement"]["invoice_number"] == "260400000001"


def test_water_meter_number_is_extracted():
    assert extracted_statement()["water_meter"]["meter_number"] == "650200"


def test_consumption_is_extracted():
    assert extracted_statement()["water_meter"]["consumption_kL"] == 7.0


def test_total_due_is_extracted():
    assert extracted_statement()["charges"]["total_due"] == 497.72


def test_validation_passes():
    assert extracted_statement()["validation_status"] == "passed"


def test_anomaly_labels_are_absent():
    serialized = json.dumps(extracted_statement()).lower()
    assert not any(label in serialized for label in FORBIDDEN_LABELS)
