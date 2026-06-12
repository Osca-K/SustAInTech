import json
import shutil
import sys
from datetime import datetime
from pathlib import Path


INGESTION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(INGESTION_ROOT / "scripts"))

from process_statement_batch import discover_pdf_files, process_batch


SOURCE_PDFS = [
    REPO_ROOT / "Generate Data" / "output" / "pdf" / "SV-H001_2026-04.pdf",
    REPO_ROOT / "Generate Data" / "output" / "pdf" / "SV-H004_2026-06.pdf",
    REPO_ROOT / "Generate Data" / "output" / "pdf" / "SV-H008_2026-06.pdf",
]
INVALID_PDF = INGESTION_ROOT / "tests" / "fixtures" / "invalid_statement.pdf"


def copy_valid_batch(target: Path) -> Path:
    input_dir = target / "input" / "batch_001"
    input_dir.mkdir(parents=True)
    for pdf in SOURCE_PDFS:
        shutil.copy2(pdf, input_dir / pdf.name)
    return input_dir


def run_batch(input_dir: Path, target: Path):
    return process_batch(
        input_dir,
        extracted_dir=target / "output" / "extracted",
        batch_dir=target / "output" / "batches",
        registry_file=target / "output" / "processed_files_registry.json",
        processed_at=datetime(2026, 6, 12, 14, 30, 0),
    )


def test_three_valid_pdfs_are_discovered(tmp_path):
    input_dir = copy_valid_batch(tmp_path)
    (input_dir / "notes.txt").write_text("ignore me", encoding="utf-8")
    assert [path.name for path in discover_pdf_files(input_dir)] == [pdf.name for pdf in SOURCE_PDFS]


def test_all_three_statements_are_processed_successfully(tmp_path):
    summary = run_batch(copy_valid_batch(tmp_path), tmp_path)
    assert summary["import_ready_count"] == 3
    assert all(item["processing_status"] == "import_ready" for item in summary["files"])


def test_three_extracted_json_outputs_are_created(tmp_path):
    run_batch(copy_valid_batch(tmp_path), tmp_path)
    outputs = sorted((tmp_path / "output" / "extracted").glob("*_extracted.json"))
    assert len(outputs) == 3


def test_batch_summary_json_is_created(tmp_path):
    summary = run_batch(copy_valid_batch(tmp_path), tmp_path)
    summary_path = REPO_ROOT / summary["summary_json_path"]
    if not summary_path.exists():
        summary_path = tmp_path / "output" / "batches" / Path(summary["summary_json_path"]).name
    assert summary_path.exists()


def test_summary_counts_reconcile(tmp_path):
    summary = run_batch(copy_valid_batch(tmp_path), tmp_path)
    counted = (
        summary["import_ready_count"]
        + summary["review_required_count"]
        + summary["failed_count"]
        + summary["duplicate_skipped_count"]
    )
    assert counted == summary["total_pdf_files"] == len(summary["files"])


def test_non_pdf_files_are_ignored(tmp_path):
    input_dir = copy_valid_batch(tmp_path)
    (input_dir / "readme.txt").write_text("not a pdf", encoding="utf-8")
    summary = run_batch(input_dir, tmp_path)
    assert summary["total_pdf_files"] == 3


def test_processing_continues_if_one_bad_pdf_is_present(tmp_path):
    input_dir = copy_valid_batch(tmp_path)
    shutil.copy2(INVALID_PDF, input_dir / INVALID_PDF.name)
    summary = run_batch(input_dir, tmp_path)
    assert summary["import_ready_count"] == 3
    assert summary["failed_count"] == 1


def test_duplicate_pdf_hash_is_skipped(tmp_path):
    input_dir = copy_valid_batch(tmp_path)
    first = run_batch(input_dir, tmp_path)
    second = run_batch(input_dir, tmp_path)
    assert first["import_ready_count"] == 3
    assert second["duplicate_skipped_count"] == 3


def test_duplicate_invoice_number_is_skipped(tmp_path):
    input_dir = tmp_path / "input" / "batch_001"
    input_dir.mkdir(parents=True)
    original = SOURCE_PDFS[0]
    duplicate = input_dir / "renamed_same_invoice.pdf"
    shutil.copy2(original, input_dir / original.name)
    shutil.copy2(original, duplicate)
    with duplicate.open("ab") as file:
        file.write(b"\n% changed hash for duplicate invoice test\n")

    summary = run_batch(input_dir, tmp_path)
    statuses = [item["processing_status"] for item in summary["files"]]
    assert statuses.count("import_ready") == 1
    assert statuses.count("duplicate_skipped") == 1
    assert any("Duplicate invoice number already processed." in item["review_reasons"] for item in summary["files"])
