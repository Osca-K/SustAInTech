from fastapi import APIRouter

from ..database import get_connection
from ..models import ImpactSummary, ImpactWasteActivityItem, ImpactWaterActivityItem


router = APIRouter(prefix="/impact", tags=["impact"])


def scalar(connection, query: str, params: tuple[object, ...] = ()) -> float:
    value = connection.execute(query, params).fetchone()[0]
    return float(value or 0)


def percent(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


@router.get("/summary", response_model=ImpactSummary)
def impact_summary() -> ImpactSummary:
    with get_connection() as connection:
        total_households = int(scalar(connection, "SELECT COUNT(*) FROM households"))
        total_water_statements = int(
            scalar(connection, "SELECT COUNT(*) FROM monthly_water_readings")
        )
        total_meter_submissions = int(
            scalar(connection, "SELECT COUNT(*) FROM household_meter_submissions")
        )
        accepted_meter_submissions = int(
            scalar(
                connection,
                """
                SELECT COUNT(*)
                FROM household_meter_submissions
                WHERE validation_status = 'accepted'
                """,
            )
        )
        review_required_meter_submissions = int(
            scalar(
                connection,
                """
                SELECT COUNT(*)
                FROM household_meter_submissions
                WHERE validation_status = 'review_required'
                """,
            )
        )
        total_water_usage = round(
            scalar(connection, "SELECT SUM(consumption_kL) FROM monthly_water_readings"),
            3,
        )
        average_household_water_usage = round(
            scalar(connection, "SELECT AVG(consumption_kL) FROM monthly_water_readings"),
            3,
        )
        highest_household_monthly_usage = round(
            scalar(connection, "SELECT MAX(consumption_kL) FROM monthly_water_readings"),
            3,
        )

        waste_counts = {
            row["classification"]: row["count"]
            for row in connection.execute(
                """
                SELECT classification, COUNT(*) AS count
                FROM household_waste_queries
                GROUP BY classification
                """
            ).fetchall()
        }
        total_waste_queries = int(sum(waste_counts.values()))
        recyclable = int(waste_counts.get("recyclable", 0))
        organic = int(waste_counts.get("organic", 0))
        e_waste = int(waste_counts.get("e_waste", 0))
        hazardous = int(waste_counts.get("hazardous", 0))
        reuse_or_donate = int(waste_counts.get("reuse_or_donate", 0))
        general_waste = int(waste_counts.get("general_waste", 0))
        unknown = int(waste_counts.get("unknown", 0))

        recent_water_rows = connection.execute(
            """
            SELECT hms.submitted_at, hms.household_id, h.customer_name,
                   hms.validation_status, hms.submitted_reading_kL,
                   hms.estimated_daily_usage_kL
            FROM household_meter_submissions hms
            JOIN households h ON h.household_id = hms.household_id
            ORDER BY hms.submitted_at DESC
            LIMIT 5
            """
        ).fetchall()
        recent_waste_rows = connection.execute(
            """
            SELECT submitted_at, household_id, item_name, classification,
                   confidence_level
            FROM household_waste_queries
            ORDER BY submitted_at DESC
            LIMIT 5
            """
        ).fetchall()

    diversion_awareness = recyclable + organic + e_waste + hazardous + reuse_or_donate
    return ImpactSummary(
        total_households=total_households,
        total_water_statements=total_water_statements,
        total_meter_submissions=total_meter_submissions,
        accepted_meter_submissions=accepted_meter_submissions,
        review_required_meter_submissions=review_required_meter_submissions,
        total_water_usage_kL=total_water_usage,
        average_household_water_usage_kL=average_household_water_usage,
        highest_household_monthly_usage_kL=highest_household_monthly_usage,
        water_review_rate_percent=percent(
            review_required_meter_submissions,
            total_meter_submissions,
        ),
        total_waste_queries=total_waste_queries,
        recyclable_queries=recyclable,
        organic_queries=organic,
        e_waste_queries=e_waste,
        hazardous_queries=hazardous,
        reuse_or_donate_queries=reuse_or_donate,
        general_waste_queries=general_waste,
        unknown_waste_queries=unknown,
        waste_diversion_awareness_percent=percent(
            diversion_awareness,
            total_waste_queries,
        ),
        recent_water_activity=[
            ImpactWaterActivityItem(**dict(row)) for row in recent_water_rows
        ],
        recent_waste_activity=[
            ImpactWasteActivityItem(**dict(row)) for row in recent_waste_rows
        ],
    )
