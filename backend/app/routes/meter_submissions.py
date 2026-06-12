import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from .. import config
from ..database import get_connection
from ..models import (
    HouseholdTrackingSummary,
    MeterPhotoExtractionConfirmationRequest,
    MeterPhotoExtractionResponse,
    MeterSubmissionHistoryItem,
    MeterSubmissionResult,
    MunicipalMeterSubmissionListItem,
)
from ..services.meter_photo_extraction import get_meter_photo_extraction_adapter
from ..services.meter_photo_extraction.mock_adapter import DEVELOPMENT_NOTE
from ..services.meter_submission_validation import (
    ImageInspection,
    inspect_image,
    relative_storage_path,
    safe_extension,
    validate_submission,
    validation_notes_json,
)


router = APIRouter(tags=["meter-submissions"])
REPO_ROOT = Path(__file__).resolve().parents[3]


def new_submission_id() -> str:
    return f"meter_submission_{uuid.uuid4().hex}"


def get_household_meter(connection, household_id: str):
    household = connection.execute(
        "SELECT 1 FROM households WHERE household_id = ?",
        (household_id,),
    ).fetchone()
    if household is None:
        raise HTTPException(status_code=404, detail="Household not found")

    meter = connection.execute(
        """
        SELECT meter_id, meter_number
        FROM water_meters
        WHERE household_id = ? AND resource_type = 'water'
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (household_id,),
    ).fetchone()
    if meter is None:
        raise HTTPException(status_code=404, detail="Water meter not found")
    return meter


def public_result(row: dict, validation_notes: list[str]) -> MeterSubmissionResult:
    return MeterSubmissionResult(
        submission_id=row["submission_id"],
        household_id=row["household_id"],
        meter_id=row["meter_id"],
        submitted_at=row["submitted_at"],
        image_freshness_status=row["image_freshness_status"],
        submitted_reading_kL=row["submitted_reading_kL"],
        usage_since_previous_reading_kL=row["usage_since_previous_reading_kL"],
        estimated_daily_usage_kL=row["estimated_daily_usage_kL"],
        reading_source=row["reading_source"],
        validation_status=row["validation_status"],
        validation_notes=validation_notes,
        resident_confirmed=bool(row["resident_confirmed"]),
    )


def store_uploaded_image(
    submission_id: str,
    content: bytes,
    content_type: str,
) -> tuple[Path, str]:
    storage_root = config.get_meter_uploads_path()
    storage_root.mkdir(parents=True, exist_ok=True)
    image_filename = f"{submission_id}{safe_extension(content_type)}"
    image_path = storage_root / image_filename
    image_path.write_bytes(content)
    return image_path, relative_storage_path(image_path, REPO_ROOT)


def json_notes(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def freshness_notes(status: str) -> list[str]:
    if status == "metadata_missing":
        return ["Image metadata was unavailable. Reading accepted with resident confirmation."]
    if status == "stale":
        return ["Image appears to be older than the allowed upload window."]
    if status == "metadata_inconsistent":
        return ["Image timestamp appears to be in the future."]
    return []


def extraction_resident_message(status: str, notes: list[str]) -> str:
    _ = notes
    if status == "failed":
        return "Automatic extraction unavailable. Enter the visible meter reading manually to continue."
    if status == "low_confidence":
        return "Automatic extraction needs your confirmation. Enter the visible meter details manually."
    return "Automatic extraction result is ready for resident confirmation."


def public_extraction_response(row: dict, image_quality_status: str = "acceptable") -> MeterPhotoExtractionResponse:
    notes = json_notes(row.get("ai_extraction_notes_json"))
    return MeterPhotoExtractionResponse(
        extraction_id=row["submission_id"],
        household_id=row["household_id"],
        meter_id=row["meter_id"],
        submitted_at=row["submitted_at"],
        image_freshness_status=row["image_freshness_status"],
        ai_extraction_status=row["ai_extraction_status"],
        ai_extraction_method=row["ai_extraction_method"] or "development_mock_adapter",
        is_water_meter_image=row.get("is_water_meter_image", True),
        suggested_meter_number=row["ai_extracted_meter_number"],
        suggested_reading_kL=row["ai_extracted_reading_kL"],
        confidence_score=row["ai_confidence_score"] or 0.0,
        image_quality_status=image_quality_status,
        requires_resident_confirmation=True,
        resident_message=extraction_resident_message(row["ai_extraction_status"], notes),
    )


@router.post(
    "/households/{household_id}/meter-photo-extractions",
    response_model=MeterPhotoExtractionResponse,
)
async def extract_meter_photo(
    household_id: str,
    image: UploadFile = File(...),
    browser_last_modified_at: str | None = Form(default=None),
) -> MeterPhotoExtractionResponse:
    content_type = image.content_type or ""
    content = await image.read()
    try:
        inspected = inspect_image(content, content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    submitted_at = datetime.now(timezone.utc)
    with get_connection() as connection:
        meter = get_household_meter(connection, household_id)
        if connection.execute(
            "SELECT 1 FROM household_meter_submissions WHERE image_hash_sha256 = ?",
            (inspected.image_hash_sha256,),
        ).fetchone():
            return MeterPhotoExtractionResponse(
                extraction_id=new_submission_id(),
                household_id=household_id,
                meter_id=meter["meter_id"],
                submitted_at=submitted_at.isoformat(timespec="seconds"),
                image_freshness_status=inspected.image_freshness_status,
                ai_extraction_status="failed",
                ai_extraction_method="development_mock_adapter",
                is_water_meter_image=False,
                suggested_meter_number=None,
                suggested_reading_kL=None,
                confidence_score=0.0,
                image_quality_status="unsupported",
                requires_resident_confirmation=False,
                resident_message="Image already submitted. This same meter photo has already been uploaded.",
            )

        submission_id = new_submission_id()
        image_path, public_image_path = store_uploaded_image(submission_id, content, content_type)
        row = {
            "submission_id": submission_id,
            "household_id": household_id,
            "meter_id": meter["meter_id"],
            "submitted_at": submitted_at.isoformat(timespec="seconds"),
            "image_path": public_image_path,
            "image_original_filename": Path(image.filename or "meter-photo").name,
            "image_content_type": content_type,
            "image_size_bytes": len(content),
            "image_hash_sha256": inspected.image_hash_sha256,
            "browser_last_modified_at": browser_last_modified_at,
            "exif_datetime_original": inspected.exif_datetime_original,
            "image_age_minutes": inspected.image_age_minutes,
            "image_freshness_status": inspected.image_freshness_status,
            "submitted_reading_kL": 0.0,
            "reading_source": "resident_manual",
            "validation_status": "review_required",
            "validation_notes_json": validation_notes_json(["Awaiting resident confirmation."]),
            "resident_confirmed": 0,
            "ai_extraction_status": "pending",
            "ai_extraction_notes_json": validation_notes_json([]),
            "ai_extraction_method": "development_mock_adapter",
        }
        with connection:
            connection.execute(
                """
                INSERT INTO household_meter_submissions (
                  submission_id, household_id, meter_id, submitted_at,
                  image_path, image_original_filename, image_content_type,
                  image_size_bytes, image_hash_sha256, browser_last_modified_at,
                  exif_datetime_original, image_age_minutes, image_freshness_status,
                  submitted_reading_kL, reading_source, validation_status,
                  validation_notes_json, resident_confirmed,
                  ai_extraction_status, ai_extraction_notes_json, ai_extraction_method
                ) VALUES (
                  :submission_id, :household_id, :meter_id, :submitted_at,
                  :image_path, :image_original_filename, :image_content_type,
                  :image_size_bytes, :image_hash_sha256, :browser_last_modified_at,
                  :exif_datetime_original, :image_age_minutes, :image_freshness_status,
                  :submitted_reading_kL, :reading_source, :validation_status,
                  :validation_notes_json, :resident_confirmed,
                  :ai_extraction_status, :ai_extraction_notes_json, :ai_extraction_method
                )
                """,
                row,
            )

        try:
            extraction = get_meter_photo_extraction_adapter().extract(image_path)
            status = "completed" if extraction.confidence_score >= 0.5 else "low_confidence"
            if not extraction.is_water_meter_image:
                status = "failed"
            extracted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
            notes = extraction.extraction_notes
            with connection:
                connection.execute(
                    """
                    UPDATE household_meter_submissions
                    SET ai_extracted_meter_number = ?,
                        ai_extracted_reading_kL = ?,
                        ai_confidence_score = ?,
                        ai_extraction_status = ?,
                        ai_extraction_notes_json = ?,
                        ai_extraction_method = ?,
                        ai_extracted_at = ?,
                        updated_at = datetime('now')
                    WHERE submission_id = ?
                    """,
                    (
                        extraction.meter_number,
                        extraction.reading_kL,
                        extraction.confidence_score,
                        status,
                        validation_notes_json(notes),
                        extraction.extraction_method,
                        extracted_at,
                        submission_id,
                    ),
                )
            row.update(
                {
                    "ai_extracted_meter_number": extraction.meter_number,
                    "ai_extracted_reading_kL": extraction.reading_kL,
                    "ai_confidence_score": extraction.confidence_score,
                    "ai_extraction_status": status,
                    "ai_extraction_notes_json": validation_notes_json(notes),
                    "ai_extraction_method": extraction.extraction_method,
                    "is_water_meter_image": extraction.is_water_meter_image,
                }
            )
            return public_extraction_response(row, extraction.image_quality_status)
        except Exception as exc:
            notes = [DEVELOPMENT_NOTE, "Automatic extraction unavailable. Enter the visible meter reading manually to continue."]
            with connection:
                connection.execute(
                    """
                    UPDATE household_meter_submissions
                    SET ai_extraction_status = 'failed',
                        ai_extraction_notes_json = ?,
                        updated_at = datetime('now')
                    WHERE submission_id = ?
                    """,
                    (validation_notes_json(notes), submission_id),
                )
            row.update(
                {
                    "ai_extracted_meter_number": None,
                    "ai_extracted_reading_kL": None,
                    "ai_confidence_score": 0.0,
                    "ai_extraction_status": "failed",
                    "ai_extraction_notes_json": validation_notes_json(notes),
                    "is_water_meter_image": False,
                }
            )
            return public_extraction_response(row, "unsupported")


@router.post(
    "/households/{household_id}/meter-photo-extractions/{extraction_id}/confirm",
    response_model=MeterSubmissionResult,
)
def confirm_meter_photo_extraction(
    household_id: str,
    extraction_id: str,
    payload: MeterPhotoExtractionConfirmationRequest,
) -> MeterSubmissionResult:
    if payload.confirmed_reading_kL < 0:
        raise HTTPException(status_code=400, detail="Meter reading must be zero or greater.")
    if not payload.resident_confirmed:
        raise HTTPException(status_code=400, detail="Resident confirmation is required.")

    submitted_at = datetime.now(timezone.utc)
    with get_connection() as connection:
        meter = get_household_meter(connection, household_id)
        row = connection.execute(
            """
            SELECT *
            FROM household_meter_submissions
            WHERE submission_id = ? AND household_id = ?
            """,
            (extraction_id, household_id),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Meter photo extraction not found")
        if row["resident_confirmed"]:
            raise HTTPException(status_code=409, detail="Meter photo extraction has already been confirmed.")
        reading_source = (
            "ai_extracted_resident_corrected"
            if payload.resident_corrected_value
            else "ai_extracted_resident_confirmed"
        )
        inspection = ImageInspection(
            content=b"",
            image_hash_sha256=row["image_hash_sha256"],
            exif_datetime_original=row["exif_datetime_original"],
            image_age_minutes=row["image_age_minutes"],
            image_freshness_status=row["image_freshness_status"],
            notes=freshness_notes(row["image_freshness_status"]),
        )
        validation = validate_submission(
            connection,
            household_id,
            meter["meter_id"],
            inspection,
            payload.confirmed_reading_kL,
            submitted_at,
            reading_source=reading_source,
            ignore_submission_id=extraction_id,
        )
        notes = validation.validation_notes
        confirmed_meter = (payload.confirmed_meter_number or "").strip()
        expected_meter = str(meter["meter_number"] or "").strip()
        if confirmed_meter and expected_meter and confirmed_meter != expected_meter:
            notes.append("Confirmed meter number does not match the household water meter.")
            if validation.validation_status == "accepted":
                validation.validation_status = "review_required"

        updated = {
            "submission_id": extraction_id,
            "household_id": household_id,
            "meter_id": meter["meter_id"],
            "submitted_at": submitted_at.isoformat(timespec="seconds"),
            "image_freshness_status": validation.image_freshness_status,
            "submitted_reading_kL": payload.confirmed_reading_kL,
            "usage_since_previous_reading_kL": validation.usage_since_previous_reading_kL,
            "elapsed_hours_since_previous_reading": validation.elapsed_hours_since_previous_reading,
            "estimated_daily_usage_kL": validation.estimated_daily_usage_kL,
            "reading_source": validation.reading_source,
            "validation_status": validation.validation_status,
            "validation_notes_json": validation_notes_json(notes),
            "resident_confirmed": 1,
            "resident_corrected_value": 1 if payload.resident_corrected_value else 0,
            "ai_extracted_meter_number": row["ai_extracted_meter_number"],
            "ai_extracted_reading_kL": row["ai_extracted_reading_kL"],
            "ai_confidence_score": row["ai_confidence_score"],
        }
        with connection:
            connection.execute(
                """
                UPDATE household_meter_submissions
                SET submitted_at = :submitted_at,
                    submitted_reading_kL = :submitted_reading_kL,
                    usage_since_previous_reading_kL = :usage_since_previous_reading_kL,
                    elapsed_hours_since_previous_reading = :elapsed_hours_since_previous_reading,
                    estimated_daily_usage_kL = :estimated_daily_usage_kL,
                    reading_source = :reading_source,
                    validation_status = :validation_status,
                    validation_notes_json = :validation_notes_json,
                    resident_confirmed = :resident_confirmed,
                    resident_corrected_value = :resident_corrected_value,
                    updated_at = datetime('now')
                WHERE submission_id = :submission_id
                """,
                updated,
            )
        return public_result(updated, notes)


@router.post(
    "/households/{household_id}/meter-submissions",
    response_model=MeterSubmissionResult,
)
async def submit_meter_reading(
    household_id: str,
    image: UploadFile = File(...),
    submitted_reading_kL: float = Form(...),
    resident_confirmed: bool = Form(...),
    browser_last_modified_at: str | None = Form(default=None),
) -> MeterSubmissionResult:
    if submitted_reading_kL < 0:
        raise HTTPException(status_code=400, detail="Meter reading must be zero or greater.")

    content_type = image.content_type or ""
    content = await image.read()
    try:
        inspected = inspect_image(content, content_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    submitted_at = datetime.now(timezone.utc)
    with get_connection() as connection:
        meter = get_household_meter(connection, household_id)
        validation = validate_submission(
            connection,
            household_id,
            meter["meter_id"],
            inspected,
            submitted_reading_kL,
            submitted_at,
        )
        submission_id = new_submission_id()
        notes = validation.validation_notes

        if validation.validation_status == "duplicate_image":
            return MeterSubmissionResult(
                submission_id=submission_id,
                household_id=household_id,
                meter_id=meter["meter_id"],
                submitted_at=submitted_at.isoformat(timespec="seconds"),
                image_freshness_status=validation.image_freshness_status,
                submitted_reading_kL=submitted_reading_kL,
                usage_since_previous_reading_kL=None,
                estimated_daily_usage_kL=None,
                reading_source=validation.reading_source,
                validation_status="duplicate_image",
                validation_notes=notes,
                resident_confirmed=resident_confirmed,
            )

        storage_root = config.get_meter_uploads_path()
        storage_root.mkdir(parents=True, exist_ok=True)
        image_filename = f"{submission_id}{safe_extension(content_type)}"
        image_path = storage_root / image_filename
        image_path.write_bytes(content)
        public_image_path = relative_storage_path(image_path, REPO_ROOT)

        row = {
            "submission_id": submission_id,
            "household_id": household_id,
            "meter_id": meter["meter_id"],
            "submitted_at": submitted_at.isoformat(timespec="seconds"),
            "image_path": public_image_path,
            "image_original_filename": Path(image.filename or "meter-photo").name,
            "image_content_type": content_type,
            "image_size_bytes": len(content),
            "image_hash_sha256": validation.image_hash_sha256,
            "browser_last_modified_at": browser_last_modified_at,
            "exif_datetime_original": validation.exif_datetime_original,
            "image_age_minutes": validation.image_age_minutes,
            "image_freshness_status": validation.image_freshness_status,
            "submitted_reading_kL": submitted_reading_kL,
            "usage_since_previous_reading_kL": validation.usage_since_previous_reading_kL,
            "elapsed_hours_since_previous_reading": validation.elapsed_hours_since_previous_reading,
            "estimated_daily_usage_kL": validation.estimated_daily_usage_kL,
            "reading_source": validation.reading_source,
            "validation_status": validation.validation_status,
            "validation_notes_json": validation_notes_json(notes),
            "resident_confirmed": 1 if resident_confirmed else 0,
        }
        with connection:
            connection.execute(
                """
                INSERT INTO household_meter_submissions (
                  submission_id, household_id, meter_id, submitted_at,
                  image_path, image_original_filename, image_content_type,
                  image_size_bytes, image_hash_sha256, browser_last_modified_at,
                  exif_datetime_original, image_age_minutes, image_freshness_status,
                  submitted_reading_kL, usage_since_previous_reading_kL,
                  elapsed_hours_since_previous_reading, estimated_daily_usage_kL,
                  reading_source, validation_status, validation_notes_json,
                  resident_confirmed
                ) VALUES (
                  :submission_id, :household_id, :meter_id, :submitted_at,
                  :image_path, :image_original_filename, :image_content_type,
                  :image_size_bytes, :image_hash_sha256, :browser_last_modified_at,
                  :exif_datetime_original, :image_age_minutes, :image_freshness_status,
                  :submitted_reading_kL, :usage_since_previous_reading_kL,
                  :elapsed_hours_since_previous_reading, :estimated_daily_usage_kL,
                  :reading_source, :validation_status, :validation_notes_json,
                  :resident_confirmed
                )
                """,
                row,
            )
        return public_result(row, notes)


@router.get(
    "/households/{household_id}/meter-submissions",
    response_model=list[MeterSubmissionHistoryItem],
)
def household_meter_submission_history(
    household_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[MeterSubmissionHistoryItem]:
    with get_connection() as connection:
        get_household_meter(connection, household_id)
        rows = connection.execute(
            """
            SELECT submission_id, submitted_at, submitted_reading_kL,
                   usage_since_previous_reading_kL, estimated_daily_usage_kL,
                   image_freshness_status, validation_status, reading_source,
                   resident_confirmed
            FROM household_meter_submissions
            WHERE household_id = ? AND resident_confirmed = 1
            ORDER BY submitted_at DESC
            LIMIT ? OFFSET ?
            """,
            (household_id, limit, offset),
        ).fetchall()
        return [
            MeterSubmissionHistoryItem(
                **{**dict(row), "resident_confirmed": bool(row["resident_confirmed"])}
            )
            for row in rows
        ]


@router.get(
    "/households/{household_id}/meter-tracking-summary",
    response_model=HouseholdTrackingSummary,
)
def household_meter_tracking_summary(household_id: str) -> HouseholdTrackingSummary:
    with get_connection() as connection:
        get_household_meter(connection, household_id)
        latest = connection.execute(
            """
            SELECT submitted_reading_kL, submitted_at,
                   usage_since_previous_reading_kL, estimated_daily_usage_kL
            FROM household_meter_submissions
            WHERE household_id = ? AND validation_status = 'accepted' AND resident_confirmed = 1
            ORDER BY submitted_at DESC
            LIMIT 1
            """,
            (household_id,),
        ).fetchone()
        counts = connection.execute(
            """
            SELECT
              SUM(CASE WHEN validation_status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
              SUM(CASE WHEN validation_status = 'review_required' THEN 1 ELSE 0 END) AS review_count
            FROM household_meter_submissions
            WHERE household_id = ? AND resident_confirmed = 1
            """,
            (household_id,),
        ).fetchone()
        return HouseholdTrackingSummary(
            latest_reading_kL=latest["submitted_reading_kL"] if latest else None,
            latest_submission_at=latest["submitted_at"] if latest else None,
            usage_since_previous_reading_kL=latest["usage_since_previous_reading_kL"] if latest else None,
            estimated_daily_usage_kL=latest["estimated_daily_usage_kL"] if latest else None,
            accepted_submission_count=counts["accepted_count"] or 0,
            review_required_count=counts["review_count"] or 0,
        )


@router.get("/meter-submissions", response_model=list[MunicipalMeterSubmissionListItem])
def municipal_meter_submissions(
    validation_status: str | None = None,
    household_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[MunicipalMeterSubmissionListItem]:
    where = []
    params: list[object] = []
    where.append("hms.resident_confirmed = 1")
    if validation_status:
        where.append("hms.validation_status = ?")
        params.append(validation_status)
    if household_id:
        where.append("hms.household_id = ?")
        params.append(household_id)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    params.extend([limit, offset])

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT hms.submission_id, hms.household_id, h.account_number,
                   h.customer_name, h.physical_address, wm.meter_number,
                   hms.submitted_at, hms.submitted_reading_kL,
                   hms.usage_since_previous_reading_kL,
                   hms.estimated_daily_usage_kL,
                   hms.image_freshness_status, hms.validation_status
            FROM household_meter_submissions hms
            JOIN households h ON h.household_id = hms.household_id
            JOIN water_meters wm ON wm.meter_id = hms.meter_id
            {where_sql}
            ORDER BY hms.submitted_at DESC
            LIMIT ? OFFSET ?
            """,
            params,
        ).fetchall()
        return [MunicipalMeterSubmissionListItem(**dict(row)) for row in rows]
