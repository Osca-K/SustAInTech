from fastapi import APIRouter, HTTPException, Query

from ..database import get_connection
from ..insights.water_usage import detect_water_usage_insights, household_exists
from ..models import (
    HouseholdDetails,
    HouseholdListItem,
    HouseholdMonthlyUsageItem,
    WaterUsageInsightItem,
)


router = APIRouter(prefix="/households", tags=["households"])


@router.get("", response_model=list[HouseholdListItem])
def list_households(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = None,
) -> list[HouseholdListItem]:
    params: list[object] = []
    where = ""
    if search:
        where = """
        WHERE h.account_number LIKE ?
           OR h.customer_name LIKE ?
           OR h.physical_address LIKE ?
        """
        pattern = f"%{search}%"
        params.extend([pattern, pattern, pattern])
    params.extend([limit, offset])

    with get_connection() as connection:
        rows = connection.execute(
            f"""
            WITH latest AS (
              SELECT ms.household_id,
                     ms.statement_month,
                     ms.total_due,
                     mwr.consumption_kL,
                     ROW_NUMBER() OVER (
                       PARTITION BY ms.household_id
                       ORDER BY ms.statement_month DESC
                     ) AS rank
              FROM monthly_statements ms
              LEFT JOIN monthly_water_readings mwr
                ON mwr.household_id = ms.household_id
               AND mwr.statement_month = ms.statement_month
            )
            SELECT h.household_id, h.account_number, h.customer_name,
                   h.physical_address, h.township, h.region, h.ward,
                   wm.meter_number,
                   latest.statement_month AS latest_statement_month,
                   latest.consumption_kL AS latest_consumption_kL,
                   latest.total_due AS latest_total_due
            FROM households h
            LEFT JOIN water_meters wm ON wm.household_id = h.household_id
            LEFT JOIN latest ON latest.household_id = h.household_id AND latest.rank = 1
            {where}
            ORDER BY h.account_number
            LIMIT ? OFFSET ?
            """,
            params,
        ).fetchall()
        return [HouseholdListItem(**dict(row)) for row in rows]


@router.get("/{household_id}", response_model=HouseholdDetails)
def household_details(household_id: str) -> HouseholdDetails:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT h.household_id, h.account_number, h.customer_name,
                   h.physical_address, h.stand_number, h.township,
                   h.region, h.ward, wm.meter_id, wm.meter_number,
                   wm.resource_type, wm.unit
            FROM households h
            LEFT JOIN water_meters wm ON wm.household_id = h.household_id
            WHERE h.household_id = ?
            """,
            (household_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Household not found")
        return HouseholdDetails(**dict(row))


@router.get("/{household_id}/monthly-usage", response_model=list[HouseholdMonthlyUsageItem])
def household_monthly_usage(household_id: str) -> list[HouseholdMonthlyUsageItem]:
    with get_connection() as connection:
        exists = connection.execute(
            "SELECT 1 FROM households WHERE household_id = ?",
            (household_id,),
        ).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Household not found")

        rows = connection.execute(
            """
            SELECT mwr.statement_month, ms.statement_month_label,
                   mwr.reading_period_start, mwr.reading_period_end,
                   mwr.billing_days, mwr.opening_reading_kL,
                   mwr.closing_reading_kL, mwr.consumption_kL,
                   mwr.average_daily_consumption_kL, mwr.reading_type,
                   ms.water_total_including_vat,
                   ms.current_charges_including_vat,
                   ms.total_due, ms.invoice_number
            FROM monthly_water_readings mwr
            JOIN monthly_statements ms
              ON ms.household_id = mwr.household_id
             AND ms.statement_month = mwr.statement_month
            WHERE mwr.household_id = ?
            ORDER BY mwr.statement_month
            """,
            (household_id,),
        ).fetchall()
        return [HouseholdMonthlyUsageItem(**dict(row)) for row in rows]


@router.get("/{household_id}/insights", response_model=list[WaterUsageInsightItem])
def household_insights(household_id: str) -> list[WaterUsageInsightItem]:
    with get_connection() as connection:
        if not household_exists(connection, household_id):
            raise HTTPException(status_code=404, detail="Household not found")
        insights = detect_water_usage_insights(connection, household_id=household_id)
        return [WaterUsageInsightItem(**item) for item in insights]
