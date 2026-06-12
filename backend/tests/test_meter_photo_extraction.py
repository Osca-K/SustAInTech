from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.meter_photo_extraction.factory import get_meter_photo_extraction_adapter
from app.services.meter_photo_extraction.mock_adapter import DEVELOPMENT_NOTE
from test_meter_submissions import image_bytes, meter_client, submit  # noqa: F401


def extract(client, household_id: str, content: bytes | None = None, filename: str = "meter.jpg"):
    return client.post(
        f"/api/households/{household_id}/meter-photo-extractions",
        data={"browser_last_modified_at": "2026-06-12T10:00:00Z"},
        files={"image": (filename, content or image_bytes("JPEG"), "image/jpeg")},
    )


def confirm(
    client,
    household_id: str,
    extraction_id: str,
    reading: float = 111.0,
    meter_number: str = "659999",
    corrected: bool = True,
):
    return client.post(
        f"/api/households/{household_id}/meter-photo-extractions/{extraction_id}/confirm",
        json={
            "confirmed_meter_number": meter_number,
            "confirmed_reading_kL": reading,
            "resident_corrected_value": corrected,
            "resident_confirmed": True,
        },
    )


def test_mock_adapter_can_be_selected_through_configuration(monkeypatch):
    monkeypatch.setenv("SUSTAINTECH_METER_EXTRACTION_PROVIDER", "mock")

    adapter = get_meter_photo_extraction_adapter()
    result = adapter.extract(__file__)

    assert result.extraction_method == "development_mock_adapter"
    assert DEVELOPMENT_NOTE in result.extraction_notes


def test_extraction_endpoint_accepts_valid_image_and_returns_placeholder(meter_client):
    client, ids = meter_client

    response = extract(client, ids["household_id"])

    assert response.status_code == 200
    data = response.json()
    assert data["ai_extraction_status"] == "low_confidence"
    assert data["ai_extraction_method"] == "development_mock_adapter"
    assert data["suggested_meter_number"] is None
    assert data["suggested_reading_kL"] is None
    assert data["confidence_score"] == 0.0
    assert data["requires_resident_confirmation"] is True


def test_extraction_endpoint_stores_pending_extraction_state(meter_client):
    client, ids = meter_client
    extraction = extract(client, ids["household_id"]).json()

    history = client.get(f"/api/households/{ids['household_id']}/meter-submissions")

    assert extraction["extraction_id"].startswith("meter_submission_")
    assert history.status_code == 200
    assert history.json() == []


def test_extraction_does_not_create_trusted_reading_automatically(meter_client):
    client, ids = meter_client

    extract(client, ids["household_id"])
    summary = client.get(f"/api/households/{ids['household_id']}/meter-tracking-summary")

    assert summary.status_code == 200
    assert summary.json()["accepted_submission_count"] == 0
    assert summary.json()["latest_reading_kL"] is None


def test_resident_confirmation_creates_accepted_reading(meter_client):
    client, ids = meter_client
    extraction_id = extract(client, ids["household_id"]).json()["extraction_id"]

    response = confirm(client, ids["household_id"], extraction_id)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "accepted"
    assert response.json()["reading_source"] == "ai_extracted_resident_corrected"


def test_resident_correction_is_stored_correctly(meter_client):
    client, ids = meter_client
    extraction_id = extract(client, ids["household_id"]).json()["extraction_id"]

    response = confirm(client, ids["household_id"], extraction_id, corrected=False)

    assert response.status_code == 200
    assert response.json()["reading_source"] == "ai_extracted_resident_confirmed"


def test_confirmed_meter_number_mismatch_requires_review(meter_client):
    client, ids = meter_client
    extraction_id = extract(client, ids["household_id"]).json()["extraction_id"]

    response = confirm(client, ids["household_id"], extraction_id, meter_number="123456")

    assert response.status_code == 200
    assert response.json()["validation_status"] == "review_required"
    assert any("meter number" in note for note in response.json()["validation_notes"])


def test_stale_extraction_confirmation_requires_retake(meter_client):
    client, ids = meter_client
    stale = datetime.now(timezone.utc) - timedelta(days=3)
    content = image_bytes("JPEG", stale)
    extraction_id = extract(client, ids["household_id"], content, "old.jpg").json()["extraction_id"]

    response = confirm(client, ids["household_id"], extraction_id)

    assert response.status_code == 200
    assert response.json()["validation_status"] == "retake_required"


def test_duplicate_image_detection_still_works(meter_client):
    client, ids = meter_client
    content = image_bytes("JPEG")

    first = extract(client, ids["household_id"], content, "meter.jpg")
    second = extract(client, ids["household_id"], content, "meter-again.jpg")

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["ai_extraction_status"] == "failed"
    assert "already submitted" in second.json()["resident_message"]


def test_extraction_failure_allows_confirmation_fallback(meter_client, monkeypatch):
    client, ids = meter_client
    monkeypatch.setenv("SUSTAINTECH_METER_EXTRACTION_PROVIDER", "unsupported")

    extraction = extract(client, ids["household_id"])
    confirmation = confirm(client, ids["household_id"], extraction.json()["extraction_id"])

    assert extraction.status_code == 200
    assert extraction.json()["ai_extraction_status"] == "failed"
    assert confirmation.status_code == 200
    assert confirmation.json()["validation_status"] == "accepted"


def test_protected_internal_fields_are_not_exposed_in_extraction(meter_client):
    client, ids = meter_client

    serialized = str(extract(client, ids["household_id"]).json()).lower()

    assert "image_path" not in serialized
    assert "image_hash_sha256" not in serialized
    assert "exif_datetime_original" not in serialized


def test_existing_manual_submission_route_still_passes(meter_client):
    client, ids = meter_client

    response = submit(
        client,
        ids["household_id"],
        image_bytes("JPEG"),
        "manual.jpg",
        "image/jpeg",
        111.0,
    )

    assert response.status_code == 200
    assert response.json()["validation_status"] == "accepted"
