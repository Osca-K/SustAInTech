from fastapi import APIRouter, HTTPException

from ..database import get_connection
from ..insights.water_usage import (
    ALLOWED_INSIGHT_TYPES,
    ALLOWED_SEVERITIES,
    detect_water_usage_insights,
    summarize_insights,
)
from ..models import InsightsSummary, WaterUsageInsightItem


router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/summary", response_model=InsightsSummary)
def insights_summary() -> InsightsSummary:
    with get_connection() as connection:
        insights = detect_water_usage_insights(connection)
        return InsightsSummary(**summarize_insights(insights))


@router.get("", response_model=list[WaterUsageInsightItem])
def list_insights(
    severity: str | None = None,
    insight_type: str | None = None,
    household_id: str | None = None,
) -> list[WaterUsageInsightItem]:
    if severity and severity not in ALLOWED_SEVERITIES:
        raise HTTPException(status_code=400, detail="Unsupported severity filter.")
    if insight_type and insight_type not in ALLOWED_INSIGHT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported insight_type filter.")

    with get_connection() as connection:
        insights = detect_water_usage_insights(connection, household_id=household_id)
        if severity:
            insights = [item for item in insights if item["severity"] == severity]
        if insight_type:
            insights = [item for item in insights if item["insight_type"] == insight_type]
        return [WaterUsageInsightItem(**item) for item in insights]
