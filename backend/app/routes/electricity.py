import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from ..database import get_connection
from ..models import (
    ElectricityTopupCreate,
    ElectricityTopupHistoryItem,
    ElectricityTopupResult,
    HouseholdElectricitySummary,
    MunicipalElectricitySummary,
    MunicipalElectricityTopupItem,
)
from ..services.electricity_tracking import calculate_electricity_summary


router = APIRouter(tags=["electricity"])


def new_topup_id() -> str:
    return f"electricity_topup_{uuid.uuid4().hex}"


def ensure_household_exists(connection, household_id: str) -> None:
    exists = connection.execute(
        "SELECT 1 FROM households WHERE household_id = ?",
        (household_id,),
    ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="Household not found")


def clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def clean_token_reference(value: str | None) -> str | None:
    cleaned = clean_optional(value)
    return cleaned[-4:] if cleaned else None


def validate_topup(payload: ElectricityTopupCreate) -> None:
    if payload.amount_zar < 0:
        raise HTTPException(status_code=400, detail="Amount must be zero or greater.")
    if payload.units_kWh < 0:
        raise HTTPException(status_code=400, detail="Units must be zero or greater.")
    if payload.meter_balance_kWh is not None and payload.meter_balance_kWh < 0:
        raise HTTPException(status_code=400, detail="Meter balance must be zero or greater.")


def row_to_topup(row) -> ElectricityTopupHistoryItem:
    return ElectricityTopupHistoryItem(**dict(row))


@router.post(
    "/households/{household_id}/electricity-topups",
    response_model=ElectricityTopupResult,
)
def create_household_electricity_topup(
    household_id: str,
    payload: ElectricityTopupCreate,
) -> ElectricityTopupResult:
    validate_topup(payload)
    submitted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    row = {
        "topup_id": new_topup_id(),
        "household_id": household_id,
        "submitted_at": submitted_at,
        "purchase_date": payload.purchase_date,
        "amount_zar": round(float(payload.amount_zar), 2),
        "units_kWh": round(float(payload.units_kWh), 3),
        "meter_balance_kWh": (
            None
            if payload.meter_balance_kWh is None
            else round(float(payload.meter_balance_kWh), 3)
        ),
        "supplier": clean_optional(payload.supplier),
        "token_reference_last4": clean_token_reference(payload.token_reference_last4),
        "notes": clean_optional(payload.notes),
    }

    with get_connection() as connection:
        ensure_household_exists(connection, household_id)
        with connection:
            connection.execute(
                """
                INSERT INTO household_electricity_topups (
                  topup_id, household_id, submitted_at, purchase_date,
                  amount_zar, units_kWh, meter_balance_kWh, supplier,
                  token_reference_last4, notes
                ) VALUES (
                  :topup_id, :household_id, :submitted_at, :purchase_date,
                  :amount_zar, :units_kWh, :meter_balance_kWh, :supplier,
                  :token_reference_last4, :notes
                )
                """,
                row,
            )

    return ElectricityTopupResult(**row)


@router.get(
    "/households/{household_id}/electricity-topups",
    response_model=list[ElectricityTopupHistoryItem],
)
def household_electricity_topups(
    household_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[ElectricityTopupHistoryItem]:
    with get_connection() as connection:
        ensure_household_exists(connection, household_id)
        rows = connection.execute(
            """
            SELECT topup_id, household_id, submitted_at, purchase_date,
                   amount_zar, units_kWh, meter_balance_kWh, supplier,
                   token_reference_last4, notes
            FROM household_electricity_topups
            WHERE household_id = ?
            ORDER BY purchase_date DESC, submitted_at DESC
            LIMIT ? OFFSET ?
            """,
            (household_id, limit, offset),
        ).fetchall()
        return [row_to_topup(row) for row in rows]


@router.get(
    "/households/{household_id}/electricity-summary",
    response_model=HouseholdElectricitySummary,
)
def household_electricity_summary(
    household_id: str,
    limit: int = Query(default=10, ge=1, le=50),
) -> HouseholdElectricitySummary:
    with get_connection() as connection:
        ensure_household_exists(connection, household_id)
        rows = connection.execute(
            """
            SELECT topup_id, household_id, submitted_at, purchase_date,
                   amount_zar, units_kWh, meter_balance_kWh, supplier,
                   token_reference_last4, notes
            FROM household_electricity_topups
            WHERE household_id = ?
            ORDER BY purchase_date DESC, submitted_at DESC
            """,
            (household_id,),
        ).fetchall()

    summary = calculate_electricity_summary(rows)
    return HouseholdElectricitySummary(
        household_id=household_id,
        total_spend=summary.total_spend,
        total_units=summary.total_units,
        average_cost_per_kWh=summary.average_cost_per_kWh,
        estimated_daily_spend=summary.estimated_daily_spend,
        estimated_daily_usage_kWh=summary.estimated_daily_usage_kWh,
        latest_balance_kWh=summary.latest_balance_kWh,
        low_balance_warning=summary.low_balance_warning,
        recent_topups=[row_to_topup(row) for row in rows[:limit]],
    )


@router.get("/electricity/summary", response_model=MunicipalElectricitySummary)
def municipal_electricity_summary(
    limit: int = Query(default=10, ge=1, le=50),
) -> MunicipalElectricitySummary:
    with get_connection() as connection:
        aggregate = connection.execute(
            """
            SELECT COUNT(*) AS total_topups,
                   COUNT(DISTINCT household_id) AS households,
                   COALESCE(SUM(amount_zar), 0) AS total_spend,
                   COALESCE(SUM(units_kWh), 0) AS total_units
            FROM household_electricity_topups
            """
        ).fetchone()
        low_balance_households = connection.execute(
            """
            WITH ranked AS (
              SELECT household_id, meter_balance_kWh,
                     ROW_NUMBER() OVER (
                       PARTITION BY household_id
                       ORDER BY purchase_date DESC, submitted_at DESC
                     ) AS rank
              FROM household_electricity_topups
              WHERE meter_balance_kWh IS NOT NULL
            )
            SELECT COUNT(*) AS count
            FROM ranked
            WHERE rank = 1 AND meter_balance_kWh < 10
            """
        ).fetchone()["count"]
        recent_rows = connection.execute(
            """
            SELECT topup_id, household_id, submitted_at, purchase_date,
                   amount_zar, units_kWh, meter_balance_kWh, supplier
            FROM household_electricity_topups
            ORDER BY purchase_date DESC, submitted_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    total_spend = float(aggregate["total_spend"] or 0)
    total_units = float(aggregate["total_units"] or 0)
    average_cost = round(total_spend / total_units, 3) if total_units > 0 else 0.0
    return MunicipalElectricitySummary(
        total_households_with_topups=int(aggregate["households"] or 0),
        total_topups=int(aggregate["total_topups"] or 0),
        total_spend_zar=round(total_spend, 2),
        total_units_kWh=round(total_units, 3),
        average_cost_per_kWh=average_cost,
        low_balance_households=int(low_balance_households or 0),
        recent_topups=[MunicipalElectricityTopupItem(**dict(row)) for row in recent_rows],
    )
