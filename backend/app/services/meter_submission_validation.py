import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from sqlite3 import Connection

from PIL import Image, UnidentifiedImageError


MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_RECENT_IMAGE_AGE_HOURS = 24.0
MAX_METADATA_CLOCK_SKEW_MINUTES = 10.0
MAX_PLAUSIBLE_DAILY_USAGE_KL = 5.0
EXTREME_DAILY_USAGE_KL = 15.0
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
READING_SOURCE = "resident_manual"


@dataclass
class ImageInspection:
    content: bytes
    image_hash_sha256: str
    exif_datetime_original: str | None
    image_age_minutes: float | None
    image_freshness_status: str
    notes: list[str]


@dataclass
class TrustedReading:
    reading_kL: float
    observed_at: datetime


@dataclass
class ValidationResult:
    image_hash_sha256: str
    exif_datetime_original: str | None
    image_age_minutes: float | None
    image_freshness_status: str
    usage_since_previous_reading_kL: float | None
    elapsed_hours_since_previous_reading: float | None
    estimated_daily_usage_kL: float | None
    reading_source: str
    validation_status: str
    validation_notes: list[str]


def inspect_image(
    content: bytes,
    content_type: str,
    now: datetime | None = None,
) -> ImageInspection:
    now = now or datetime.now(timezone.utc)
    if not content:
        raise ValueError("Image file is empty.")
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("Image file is larger than 10 MB.")
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Unsupported image type. Upload a JPEG, PNG, or WebP image.")

    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()
        with Image.open(BytesIO(content)) as image:
            exif_datetime = extract_exif_datetime(image)
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Uploaded file could not be read as an image.") from exc

    image_hash = hashlib.sha256(content).hexdigest()
    status = "metadata_missing"
    age_minutes = None
    notes: list[str] = []
    if exif_datetime is None:
        notes.append("Image metadata was unavailable. Reading accepted with resident confirmation.")
    else:
        age_minutes = round((now - exif_datetime).total_seconds() / 60, 2)
        if age_minutes < -MAX_METADATA_CLOCK_SKEW_MINUTES:
            status = "metadata_inconsistent"
            notes.append("Image timestamp appears to be in the future.")
        elif age_minutes > MAX_RECENT_IMAGE_AGE_HOURS * 60:
            status = "stale"
            notes.append("Image appears to be older than the allowed upload window.")
        else:
            status = "recent"

    return ImageInspection(
        content=content,
        image_hash_sha256=image_hash,
        exif_datetime_original=exif_datetime.isoformat() if exif_datetime else None,
        image_age_minutes=age_minutes,
        image_freshness_status=status,
        notes=notes,
    )


def extract_exif_datetime(image: Image.Image) -> datetime | None:
    exif = image.getexif()
    for tag_id in (36867, 306):
        value = exif.get(tag_id)
        if value:
            try:
                parsed = datetime.strptime(str(value), "%Y:%m:%d %H:%M:%S")
                return parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
    return None


def image_hash_exists(
    connection: Connection,
    image_hash_sha256: str,
    ignore_submission_id: str | None = None,
) -> bool:
    if ignore_submission_id:
        row = connection.execute(
            """
            SELECT 1
            FROM household_meter_submissions
            WHERE image_hash_sha256 = ? AND submission_id <> ?
            """,
            (image_hash_sha256, ignore_submission_id),
        ).fetchone()
        return row is not None

    row = connection.execute(
        "SELECT 1 FROM household_meter_submissions WHERE image_hash_sha256 = ?",
        (image_hash_sha256,),
    ).fetchone()
    return row is not None


def latest_trusted_reading(
    connection: Connection,
    household_id: str,
    meter_id: str,
) -> TrustedReading | None:
    submission = connection.execute(
        """
        SELECT submitted_reading_kL, submitted_at
        FROM household_meter_submissions
        WHERE household_id = ?
          AND meter_id = ?
          AND validation_status = 'accepted'
        ORDER BY submitted_at DESC
        LIMIT 1
        """,
        (household_id, meter_id),
    ).fetchone()
    if submission:
        return TrustedReading(
            reading_kL=float(submission["submitted_reading_kL"]),
            observed_at=parse_datetime(str(submission["submitted_at"])),
        )

    monthly = connection.execute(
        """
        SELECT closing_reading_kL, reading_period_end
        FROM monthly_water_readings
        WHERE household_id = ? AND meter_id = ?
        ORDER BY statement_month DESC
        LIMIT 1
        """,
        (household_id, meter_id),
    ).fetchone()
    if monthly:
        return TrustedReading(
            reading_kL=float(monthly["closing_reading_kL"]),
            observed_at=parse_date(str(monthly["reading_period_end"])),
        )
    return None


def validate_submission(
    connection: Connection,
    household_id: str,
    meter_id: str,
    image: ImageInspection,
    submitted_reading_kL: float,
    submitted_at: datetime,
    reading_source: str = READING_SOURCE,
    ignore_submission_id: str | None = None,
) -> ValidationResult:
    notes = list(image.notes)
    if image_hash_exists(connection, image.image_hash_sha256, ignore_submission_id):
        return ValidationResult(
            image_hash_sha256=image.image_hash_sha256,
            exif_datetime_original=image.exif_datetime_original,
            image_age_minutes=image.image_age_minutes,
            image_freshness_status=image.image_freshness_status,
            usage_since_previous_reading_kL=None,
            elapsed_hours_since_previous_reading=None,
            estimated_daily_usage_kL=None,
            reading_source=reading_source,
            validation_status="duplicate_image",
            validation_notes=["This same meter photo has already been uploaded."],
        )

    trusted = latest_trusted_reading(connection, household_id, meter_id)
    usage = None
    elapsed_hours = None
    estimated_daily = None
    validation_status = "accepted"

    if image.image_freshness_status == "stale":
        validation_status = "retake_required"
    elif image.image_freshness_status == "metadata_inconsistent":
        validation_status = "review_required"

    if trusted is not None:
        usage = round(submitted_reading_kL - trusted.reading_kL, 3)
        elapsed_hours = max(
            round((submitted_at - trusted.observed_at).total_seconds() / 3600, 3),
            0.001,
        )
        estimated_daily = round((usage / elapsed_hours) * 24, 3)

        if submitted_reading_kL < trusted.reading_kL:
            validation_status = "rejected"
            notes.append("Submitted cumulative reading is lower than the latest trusted reading.")
        elif validation_status != "retake_required" and usage == 0 and submitted_at.date() == trusted.observed_at.date():
            validation_status = "review_required"
            notes.append("Submitted reading has not changed since the latest trusted reading.")
        elif validation_status != "retake_required" and estimated_daily > EXTREME_DAILY_USAGE_KL:
            validation_status = "review_required"
            notes.append("Usage increase is unusually high for the elapsed period.")
            notes.append("Extreme usage increase requires municipal review.")
        elif validation_status != "retake_required" and estimated_daily > MAX_PLAUSIBLE_DAILY_USAGE_KL:
            validation_status = "review_required"
            notes.append("Usage increase is unusually high for the elapsed period.")

    return ValidationResult(
        image_hash_sha256=image.image_hash_sha256,
        exif_datetime_original=image.exif_datetime_original,
        image_age_minutes=image.image_age_minutes,
        image_freshness_status=image.image_freshness_status,
        usage_since_previous_reading_kL=usage,
        elapsed_hours_since_previous_reading=elapsed_hours,
        estimated_daily_usage_kL=estimated_daily,
        reading_source=reading_source,
        validation_status=validation_status,
        validation_notes=notes,
    )


def validation_notes_json(notes: list[str]) -> str:
    return json.dumps(notes)


def parse_datetime(value: str) -> datetime:
    cleaned = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(cleaned)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def parse_date(value: str) -> datetime:
    normalized = value.replace("/", "-")
    return datetime.strptime(normalized, "%Y-%m-%d").replace(tzinfo=timezone.utc)


def safe_extension(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[content_type]


def relative_storage_path(path: Path, repo_root: Path) -> str:
    try:
        return str(path.resolve().relative_to(repo_root.resolve())).replace("\\", "/")
    except ValueError:
        return str(path)
