import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path

from process_one_statement import process_one_statement


INGESTION_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = INGESTION_ROOT.parent
DEFAULT_EXTRACTED_DIR = INGESTION_ROOT / "output" / "extracted"
DEFAULT_BATCH_DIR = INGESTION_ROOT / "output" / "batches"
DEFAULT_REGISTRY_FILE = INGESTION_ROOT / "output" / "processed_files_registry.json"
ALLOWED_PROCESSING_STATUSES = {
    "import_ready",
    "review_required",
    "failed",
    "duplicate_skipped",
}


def discover_pdf_files(input_folder: Path) -> list[Path]:
    return sorted(path for path in input_folder.rglob("*") if path.is_file() and path.suffix.lower() == ".pdf")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_registry(path: Path) -> dict:
    if not path.exists():
        return {"files": {}, "invoices": {}}
    registry = json.loads(path.read_text(encoding="utf-8"))
    registry.setdefault("files", {})
    registry.setdefault("invoices", {})
    return registry


def save_registry(path: Path, registry: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(registry, indent=2), encoding="utf-8")


def relative_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path)


def status_for_extracted(data: dict) -> str:
    if data.get("extraction_status") == "success" and data.get("validation_status") == "passed" and not data.get("requires_manual_review"):
        return "import_ready"
    if data.get("extraction_status") == "success":
        return "review_required"
    return "failed"


def duplicate_summary(pdf_path: Path, file_hash: str, reason: str, existing_output: str | None = None) -> dict:
    return {
        "source_pdf_filename": pdf_path.name,
        "processing_status": "duplicate_skipped",
        "extraction_status": "skipped",
        "validation_status": "skipped",
        "requires_manual_review": False,
        "review_reasons": [reason],
        "output_json_path": existing_output,
        "file_hash_sha256": file_hash,
    }


def failure_summary(pdf_path: Path, file_hash: str, reason: str, output_path: Path | None = None) -> dict:
    return {
        "source_pdf_filename": pdf_path.name,
        "processing_status": "failed",
        "extraction_status": "failed",
        "validation_status": "failed",
        "requires_manual_review": True,
        "review_reasons": [reason],
        "output_json_path": relative_path(output_path) if output_path else None,
        "file_hash_sha256": file_hash,
    }


def process_batch(
    input_folder: Path,
    extracted_dir: Path = DEFAULT_EXTRACTED_DIR,
    batch_dir: Path = DEFAULT_BATCH_DIR,
    registry_file: Path = DEFAULT_REGISTRY_FILE,
    processed_at: datetime | None = None,
) -> dict:
    input_folder = input_folder.resolve()
    extracted_dir.mkdir(parents=True, exist_ok=True)
    batch_dir.mkdir(parents=True, exist_ok=True)
    registry = load_registry(registry_file)
    pdf_files = discover_pdf_files(input_folder)
    processed_at = processed_at or datetime.now()
    batch_id = input_folder.name
    file_summaries = []

    for pdf_path in pdf_files:
        file_hash = sha256_file(pdf_path)
        if file_hash in registry["files"]:
            existing = registry["files"][file_hash]
            file_summaries.append(
                duplicate_summary(
                    pdf_path,
                    file_hash,
                    "Duplicate PDF hash already processed.",
                    existing.get("output_json_path"),
                )
            )
            continue

        output_path = extracted_dir / f"{pdf_path.stem}_extracted.json"
        try:
            data = process_one_statement(pdf_path, output_path)
        except Exception as exc:
            file_summary = failure_summary(pdf_path, file_hash, str(exc), output_path)
            registry["files"][file_hash] = {
                "source_pdf_filename": pdf_path.name,
                "processing_status": "failed",
                "output_json_path": relative_path(output_path),
                "processed_at": processed_at.isoformat(timespec="seconds"),
            }
            file_summaries.append(file_summary)
            continue

        invoice_number = data.get("statement", {}).get("invoice_number")
        if invoice_number and invoice_number in registry["invoices"]:
            existing = registry["invoices"][invoice_number]
            if output_path.exists():
                output_path.unlink()
            file_summary = duplicate_summary(
                pdf_path,
                file_hash,
                "Duplicate invoice number already processed.",
                existing.get("output_json_path"),
            )
            registry["files"][file_hash] = {
                "source_pdf_filename": pdf_path.name,
                "processing_status": "duplicate_skipped",
                "output_json_path": existing.get("output_json_path"),
                "invoice_number": invoice_number,
                "processed_at": processed_at.isoformat(timespec="seconds"),
            }
            file_summaries.append(file_summary)
            continue

        processing_status = status_for_extracted(data)
        file_summary = {
            "source_pdf_filename": pdf_path.name,
            "processing_status": processing_status,
            "extraction_status": data.get("extraction_status"),
            "validation_status": data.get("validation_status"),
            "requires_manual_review": data.get("requires_manual_review", False),
            "review_reasons": data.get("review_reasons", []),
            "output_json_path": relative_path(output_path),
            "file_hash_sha256": file_hash,
        }
        registry["files"][file_hash] = {
            "source_pdf_filename": pdf_path.name,
            "processing_status": processing_status,
            "output_json_path": relative_path(output_path),
            "invoice_number": invoice_number,
            "processed_at": processed_at.isoformat(timespec="seconds"),
        }
        if invoice_number:
            registry["invoices"][invoice_number] = {
                "source_pdf_filename": pdf_path.name,
                "output_json_path": relative_path(output_path),
                "file_hash_sha256": file_hash,
                "processed_at": processed_at.isoformat(timespec="seconds"),
            }
        file_summaries.append(file_summary)

    save_registry(registry_file, registry)
    summary = {
        "batch_id": batch_id,
        "input_folder": relative_path(input_folder),
        "processed_at": processed_at.isoformat(timespec="seconds"),
        "total_pdf_files": len(pdf_files),
        "import_ready_count": sum(item["processing_status"] == "import_ready" for item in file_summaries),
        "review_required_count": sum(item["processing_status"] == "review_required" for item in file_summaries),
        "failed_count": sum(item["processing_status"] == "failed" for item in file_summaries),
        "duplicate_skipped_count": sum(item["processing_status"] == "duplicate_skipped" for item in file_summaries),
        "files": file_summaries,
    }
    summary_path = batch_dir / f"{batch_id}_summary_{processed_at.strftime('%Y%m%d_%H%M%S')}.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    summary["summary_json_path"] = relative_path(summary_path)
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def print_summary(summary: dict) -> None:
    print(f"Batch: {summary['batch_id']}")
    print(f"Input: {summary['input_folder']}")
    print(f"Summary: {summary['summary_json_path']}")
    print(f"PDF files: {summary['total_pdf_files']}")
    print(f"Import ready: {summary['import_ready_count']}")
    print(f"Review required: {summary['review_required_count']}")
    print(f"Failed: {summary['failed_count']}")
    print(f"Duplicate skipped: {summary['duplicate_skipped_count']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Process a folder of municipal statement PDFs.")
    parser.add_argument("--input-folder", required=True, help="Folder containing statement PDFs.")
    args = parser.parse_args()

    summary = process_batch(Path(args.input_folder))
    print_summary(summary)


if __name__ == "__main__":
    main()
