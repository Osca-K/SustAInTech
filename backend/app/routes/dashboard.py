from fastapi import APIRouter

from ..database import get_connection
from ..models import DashboardSummary, MonthlyCommunityUsage, StatementUploadSummary


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def scalar_count(connection, table: str) -> int:
    return connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()["count"]


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary() -> DashboardSummary:
    with get_connection() as connection:
        latest = connection.execute("SELECT MAX(statement_month) AS latest FROM monthly_statements").fetchone()["latest"]
        return DashboardSummary(
            household_count=scalar_count(connection, "households"),
            water_meter_count=scalar_count(connection, "water_meters"),
            monthly_reading_count=scalar_count(connection, "monthly_water_readings"),
            monthly_statement_count=scalar_count(connection, "monthly_statements"),
            statement_upload_count=scalar_count(connection, "statement_uploads"),
            ingestion_batch_count=scalar_count(connection, "ingestion_batches"),
            latest_statement_month=latest,
        )


@router.get("/monthly-water-usage", response_model=list[MonthlyCommunityUsage])
def monthly_water_usage() -> list[MonthlyCommunityUsage]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT mwr.statement_month,
                   ms.statement_month_label,
                   SUM(mwr.consumption_kL) AS total_consumption_kL,
                   AVG(mwr.consumption_kL) AS average_household_consumption_kL,
                   COUNT(DISTINCT mwr.household_id) AS household_count
            FROM monthly_water_readings mwr
            JOIN monthly_statements ms
              ON ms.household_id = mwr.household_id
             AND ms.statement_month = mwr.statement_month
            GROUP BY mwr.statement_month, ms.statement_month_label
            ORDER BY mwr.statement_month
            """
        ).fetchall()
        return [MonthlyCommunityUsage(**dict(row)) for row in rows]


@router.get("/upload-statuses", response_model=list[StatementUploadSummary])
def upload_statuses() -> list[StatementUploadSummary]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT processing_status, COUNT(*) AS count
            FROM statement_uploads
            GROUP BY processing_status
            ORDER BY processing_status
            """
        ).fetchall()
        return [StatementUploadSummary(**dict(row)) for row in rows]
