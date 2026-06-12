import json
import shutil
import sys
import time
from pathlib import Path

from fastapi.testclient import TestClient


REPO_ROOT = Path(__file__).resolve().parents[2]
DATABASE_ROOT = REPO_ROOT / "database"
sys.path.insert(0, str(DATABASE_ROOT / "scripts"))

from init_database import initialize_database  # noqa: E402
from app.main import app  # noqa: E402
from app.routes import uploads as upload_routes  # noqa: E402


SOURCE_PDFS = [
    REPO_ROOT / "Generate Data" / "output" / "pdf" / "SV-H001_2026-04.pdf",
    REPO_ROOT / "Generate Data" / "output" / "pdf" / "SV-H004_2026-06.pdf",
]
FORBIDDEN_RESPONSE_TEXT = (
    "file_hash_sha256",
    "pin_code",
    "client_vat_number",
    "extracted_json_path",
    "possible_leak",
    "sustained_high_usage",
    "anomaly_type",
    "anomaly_notes",
    "expected_classification",
    "scenario_notes",
)


def configure_upload_test(monkeypatch, tmp_path: Path) -> Path:
    db_path = tmp_path / "upload_test.db"
    initialize_database(db_path, reset=True)

    from app import config

    monkeypatch.setattr(config, "DEFAULT_DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "get_database_path", lambda: db_path)
    monkeypatch.setattr(upload_routes, "UPLOAD_ROOT", tmp_path / "input" / "uploads")
    monkeypatch.setattr(upload_routes, "EXTRACTED_OUTPUT_DIR", tmp_path / "output" / "extracted")
    monkeypatch.setattr(upload_routes, "BATCH_OUTPUT_DIR", tmp_path / "output" / "batches")
    monkeypatch.setattr(upload_routes, "REGISTRY_FILE", tmp_path / "output" / "processed_files_registry.json")
    return db_path


def upload_files(client: TestClient, paths: list[Path]):
    files = []
    handles = []
    try:
        for path in paths:
            handle = path.open("rb")
            handles.append(handle)
            files.append(("files", (path.name, handle, "application/pdf")))
        return client.post("/api/uploads/statements", files=files)
    finally:
        for handle in handles:
            handle.close()


def test_multiple_valid_pdfs_can_be_uploaded(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    response = upload_files(client, SOURCE_PDFS)

    assert response.status_code == 200
    data = response.json()
    assert data["total_files"] == 2
    assert data["imported_count"] == 2
    assert {item["processing_status"] for item in data["files"]} == {"imported"}


def test_one_valid_pdf_completes_quickly(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    started_at = time.perf_counter()
    response = upload_files(client, [SOURCE_PDFS[0]])
    elapsed = time.perf_counter() - started_at

    assert response.status_code == 200
    assert elapsed < 10
    assert response.json()["imported_count"] == 1


def test_non_pdf_files_are_rejected(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    response = client.post(
        "/api/uploads/statements",
        files=[("files", ("notes.txt", b"not a pdf", "text/plain"))],
    )

    assert response.status_code == 400


def test_empty_pdfs_are_rejected(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    response = client.post(
        "/api/uploads/statements",
        files=[("files", ("empty.pdf", b"", "application/pdf"))],
    )

    assert response.status_code == 400


def test_duplicate_pdfs_in_one_upload_are_skipped(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)
    duplicate = tmp_path / "renamed_duplicate.pdf"
    shutil.copy2(SOURCE_PDFS[0], duplicate)

    response = upload_files(client, [SOURCE_PDFS[0], duplicate])

    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 1
    assert data["duplicate_skipped_count"] == 1
    assert sorted(item["processing_status"] for item in data["files"]) == ["duplicate_skipped", "imported"]


def test_duplicate_upload_completes_and_returns_duplicate_skipped(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    first = upload_files(client, [SOURCE_PDFS[0]])
    second = upload_files(client, [SOURCE_PDFS[0]])

    assert first.status_code == 200
    assert second.status_code == 200
    data = second.json()
    assert data["imported_count"] == 0
    assert data["duplicate_skipped_count"] == 1
    assert data["files"][0]["processing_status"] == "duplicate_skipped"


def test_malformed_pdf_returns_failed_result_without_hanging(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    started_at = time.perf_counter()
    response = client.post(
        "/api/uploads/statements",
        files=[("files", ("broken.pdf", b"%PDF-1.7\nnot a real statement", "application/pdf"))],
    )
    elapsed = time.perf_counter() - started_at

    assert response.status_code == 200
    assert elapsed < 10
    data = response.json()
    assert data["failed_count"] == 1
    assert data["files"][0]["processing_status"] == "failed"


def test_valid_statements_are_imported(monkeypatch, tmp_path):
    db_path = configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    response = upload_files(client, SOURCE_PDFS)

    assert response.status_code == 200
    import sqlite3

    with sqlite3.connect(db_path) as connection:
        monthly_statement_count = connection.execute("SELECT COUNT(*) FROM monthly_statements").fetchone()[0]
        upload_count = connection.execute("SELECT COUNT(*) FROM statement_uploads").fetchone()[0]
    assert monthly_statement_count == 2
    assert upload_count == 2


def test_upload_response_counts_reconcile(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    response = upload_files(client, SOURCE_PDFS)

    data = response.json()
    counted = (
        data["imported_count"]
        + data["review_required_count"]
        + data["failed_count"]
        + data["duplicate_skipped_count"]
    )
    assert response.status_code == 200
    assert counted == data["total_files"]


def test_batch_history_endpoint_returns_recent_batches(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)
    upload_files(client, SOURCE_PDFS)

    response = client.get("/api/uploads/batches")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["total_pdf_files"] == 2
    assert data[0]["import_ready_count"] == 2


def test_upload_response_never_exposes_hidden_or_sensitive_fields(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    response = upload_files(client, SOURCE_PDFS)

    assert response.status_code == 200
    serialized = json.dumps(response.json()).lower()
    assert not any(label in serialized for label in FORBIDDEN_RESPONSE_TEXT)


def test_unexpected_processing_error_returns_readable_500(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)

    def fail_processing(*args, **kwargs):
        raise RuntimeError("internal path details should not leak")

    monkeypatch.setattr(upload_routes, "process_batch", fail_processing)
    response = upload_files(client, [SOURCE_PDFS[0]])

    assert response.status_code == 500
    assert response.json() == {"detail": "Statement upload processing failed."}


def test_existing_dashboard_endpoints_still_work_after_upload(monkeypatch, tmp_path):
    configure_upload_test(monkeypatch, tmp_path)
    client = TestClient(app)
    upload_files(client, SOURCE_PDFS)

    summary = client.get("/api/dashboard/summary")
    usage = client.get("/api/dashboard/monthly-water-usage")
    statuses = client.get("/api/dashboard/upload-statuses")

    assert summary.status_code == 200
    assert usage.status_code == 200
    assert statuses.status_code == 200
    assert summary.json()["monthly_statement_count"] == 2
