import re
import sys
from datetime import datetime
import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from .. import config
from ..database import get_connection
from ..models import (
    StatementUploadFileResult,
    StatementUploadResponse,
    UploadBatchHistoryItem,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
INGESTION_SCRIPTS_DIR = REPO_ROOT / "ingestion" / "scripts"
DATABASE_SCRIPTS_DIR = REPO_ROOT / "database" / "scripts"
for script_dir in (INGESTION_SCRIPTS_DIR, DATABASE_SCRIPTS_DIR):
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))

from import_ready_batch import import_ready_batch  # noqa: E402
from process_statement_batch import (  # noqa: E402
    DEFAULT_BATCH_DIR,
    DEFAULT_EXTRACTED_DIR,
    DEFAULT_REGISTRY_FILE,
    process_batch,
)


router = APIRouter(prefix="/uploads", tags=["uploads"])
logger = logging.getLogger("uvicorn.error")

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
UPLOAD_ROOT = REPO_ROOT / "ingestion" / "input" / "uploads"
BATCH_OUTPUT_DIR = DEFAULT_BATCH_DIR
EXTRACTED_OUTPUT_DIR = DEFAULT_EXTRACTED_DIR
REGISTRY_FILE = DEFAULT_REGISTRY_FILE
SAFE_FILENAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def create_batch_id(now: datetime | None = None) -> str:
    timestamp = (now or datetime.now()).strftime("%Y%m%d_%H%M%S")
    return f"batch_{timestamp}_{uuid4().hex[:6]}"


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    sanitized = SAFE_FILENAME_PATTERN.sub("_", name).strip("._")
    return sanitized or "statement.pdf"


def unique_destination(folder: Path, filename: str) -> Path:
    destination = folder / filename
    if not destination.exists():
        return destination

    stem = destination.stem
    suffix = destination.suffix
    for index in range(1, 1000):
        candidate = folder / f"{stem}_{index}{suffix}"
        if not candidate.exists():
            return candidate
    raise HTTPException(status_code=400, detail=f"Could not allocate a unique filename for {filename}.")


async def read_valid_pdf(upload: UploadFile) -> bytes:
    filename = upload.filename or ""
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail=f"{filename or 'Uploaded file'} is not a PDF.")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail=f"{filename} is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail=f"{filename} is larger than 10 MB.")
    return content


def public_file_result(file_summary: dict, import_result: str | None) -> StatementUploadFileResult:
    status = file_summary.get("processing_status", "failed")
    if status == "import_ready" and import_result == "imported":
        status = "imported"
    elif status == "import_ready" and import_result in {"skipped_duplicate_file_hash", "skipped_duplicate_invoice"}:
        status = "duplicate_skipped"
    elif status == "review_required":
        status = "needs_review"

    return StatementUploadFileResult(
        source_pdf_filename=file_summary.get("source_pdf_filename", ""),
        processing_status=status,
        validation_status=file_summary.get("validation_status", "failed"),
        requires_manual_review=bool(file_summary.get("requires_manual_review", False)),
        review_reasons=list(file_summary.get("review_reasons", [])),
    )


@router.post("/statements", response_model=StatementUploadResponse)
async def upload_statements(files: list[UploadFile] = File(...)) -> StatementUploadResponse:
    try:
        logger.info("upload received")
        if not files:
            raise HTTPException(status_code=400, detail="Upload at least one PDF statement.")

        validated_files = []
        for upload in files:
            content = await read_valid_pdf(upload)
            validated_files.append((sanitize_filename(upload.filename or "statement.pdf"), content))
        logger.info("file validation complete")

        batch_id = create_batch_id()
        batch_folder = UPLOAD_ROOT / batch_id
        batch_folder.mkdir(parents=True, exist_ok=False)

        for filename, content in validated_files:
            destination = unique_destination(batch_folder, filename)
            destination.write_bytes(content)
        logger.info("file saved")

        processed_at = datetime.now()
        logger.info("batch processing started")
        summary = await run_in_threadpool(
            process_batch,
            batch_folder,
            EXTRACTED_OUTPUT_DIR,
            BATCH_OUTPUT_DIR,
            REGISTRY_FILE,
            processed_at,
        )
        logger.info("batch processing completed")

        summary_path = REPO_ROOT / summary["summary_json_path"]
        if not summary_path.exists():
            summary_path = BATCH_OUTPUT_DIR / Path(summary["summary_json_path"]).name

        logger.info("database import started")
        import_results = await run_in_threadpool(import_ready_batch, summary_path, config.get_database_path())
        logger.info("database import completed")
        result_by_file = {item.get("file"): item.get("result") for item in import_results}
        imported_count = sum(item.get("result") == "imported" for item in import_results)

        public_files = [
            public_file_result(file_summary, result_by_file.get(file_summary.get("source_pdf_filename")))
            for file_summary in summary.get("files", [])
        ]
        duplicate_count = sum(item.processing_status == "duplicate_skipped" for item in public_files)

        response = StatementUploadResponse(
            batch_id=summary["batch_id"],
            total_files=summary["total_pdf_files"],
            import_ready_count=summary["import_ready_count"],
            review_required_count=summary["review_required_count"],
            failed_count=summary["failed_count"],
            duplicate_skipped_count=max(summary.get("duplicate_skipped_count", 0), duplicate_count),
            imported_count=imported_count,
            files=public_files,
        )
        logger.info("response model created")
        logger.info("response returned")
        return response
    except HTTPException:
        raise
    except Exception:
        logger.exception("Statement upload processing failed.")
        raise HTTPException(status_code=500, detail="Statement upload processing failed.") from None


@router.get("/batches", response_model=list[UploadBatchHistoryItem])
def upload_batches(limit: int = 20) -> list[UploadBatchHistoryItem]:
    bounded_limit = min(max(limit, 1), 100)
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT batch_id, processed_at, total_pdf_files, import_ready_count,
                   review_required_count, failed_count, duplicate_skipped_count
            FROM ingestion_batches
            ORDER BY processed_at DESC, created_at DESC
            LIMIT ?
            """,
            (bounded_limit,),
        ).fetchall()
        return [UploadBatchHistoryItem(**dict(row)) for row in rows]
