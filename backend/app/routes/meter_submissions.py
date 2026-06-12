import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from .. import config
from ..database import get_connection
from ..models import (
    HouseholdTrackingSummary,
    MeterSubmissionHistoryItem,
    MeterSubmissionResult,
    MunicipalMeterSubmissionListItem,
)
from ..services.meter_submission_validation import (
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
            WHERE household_id = ?
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
            WHERE household_id = ? AND validation_status = 'accepted'
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
            WHERE household_id = ?
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
