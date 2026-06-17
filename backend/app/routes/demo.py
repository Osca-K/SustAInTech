from fastapi import APIRouter

from ..database import get_connection
from ..models import (
    DemoQuickLink,
    DemoScenarioResponse,
    DemoScenarioStep,
    DemoSummaryMetrics,
)
from ..services.recommendations import (
    generate_household_recommendations,
    generate_municipal_recommendations,
)


router = APIRouter(prefix="/demo", tags=["demo"])


@router.get("/scenario", response_model=DemoScenarioResponse)
def demo_scenario() -> DemoScenarioResponse:
    with get_connection() as connection:
        household_id = select_demo_household(connection)
        household_recommendations = (
            generate_household_recommendations(connection, household_id)
            if household_id
            else []
        )
        municipal_recommendations = generate_municipal_recommendations(connection)
        metrics = DemoSummaryMetrics(
            households_monitored=int(scalar(connection, "SELECT COUNT(*) FROM households")),
            water_statements_processed=int(
                scalar(connection, "SELECT COUNT(*) FROM monthly_statements")
            ),
            meter_submissions=int(
                scalar(connection, "SELECT COUNT(*) FROM household_meter_submissions")
            ),
            waste_queries=int(
                scalar(connection, "SELECT COUNT(*) FROM household_waste_queries")
            ),
            electricity_topups=int(
                scalar(connection, "SELECT COUNT(*) FROM household_electricity_topups")
            ),
            active_recommendations=len(household_recommendations)
            + len(municipal_recommendations),
        )

    return DemoScenarioResponse(
        scenario_title="SustAInTech Community Resource Demo",
        scenario_subtitle=(
            "A guided walkthrough of water monitoring, waste sorting, "
            "electricity tracking, and recommendations."
        ),
        community_name="Star Village / New Protea",
        pilot_area="Protea Glen Extension 28, Soweto",
        demo_household_id=household_id,
        steps=build_steps(household_id),
        quick_links=build_quick_links(household_id),
        summary_metrics=metrics,
    )


def select_demo_household(connection) -> str:
    rows = connection.execute(
        """
        SELECT h.household_id,
               COUNT(DISTINCT hms.submission_id) AS meter_submissions,
               COUNT(DISTINCT hwq.query_id) AS waste_queries,
               COUNT(DISTINCT het.topup_id) AS electricity_topups
        FROM households h
        LEFT JOIN household_meter_submissions hms
          ON hms.household_id = h.household_id
        LEFT JOIN household_waste_queries hwq
          ON hwq.household_id = h.household_id
        LEFT JOIN household_electricity_topups het
          ON het.household_id = h.household_id
        GROUP BY h.household_id
        ORDER BY
          (COUNT(DISTINCT hms.submission_id) > 0) DESC,
          (COUNT(DISTINCT hwq.query_id) > 0) DESC,
          (COUNT(DISTINCT het.topup_id) > 0) DESC,
          (COUNT(DISTINCT hms.submission_id)
            + COUNT(DISTINCT hwq.query_id)
            + COUNT(DISTINCT het.topup_id)) DESC,
          h.household_id
        LIMIT 1
        """
    ).fetchone()
    return str(rows["household_id"]) if rows else ""


def build_steps(household_id: str) -> list[DemoScenarioStep]:
    return [
        DemoScenarioStep(
            step_number=1,
            title="Community overview",
            description="Start with the shared impact view for the pilot community.",
            module="overview",
            primary_url="/municipal/impact",
            secondary_url=None,
            talking_points=[
                "Shows water, waste, and electricity together instead of separate tools.",
                "Frames the project as a practical community resource dashboard.",
            ],
        ),
        DemoScenarioStep(
            step_number=2,
            title="Water monitoring",
            description="Show municipal water readings and resident meter submissions.",
            module="water",
            primary_url="/municipal/dashboard",
            secondary_url="/municipal/meter-submissions",
            talking_points=[
                "Municipal statements establish the baseline water history.",
                "Resident submissions help identify readings that need review.",
            ],
        ),
        DemoScenarioStep(
            step_number=3,
            title="Household recommendations",
            description="Open a selected household and show practical next steps.",
            module="recommendations",
            primary_url=f"/household/{household_id}",
            secondary_url="/municipal/recommendations",
            talking_points=[
                "Recommendations are generated from existing data, not a new AI model.",
                "The resident view stays practical and household-specific.",
            ],
        ),
        DemoScenarioStep(
            step_number=4,
            title="Resident meter tracking",
            description="Show how a resident can confirm water meter readings.",
            module="water",
            primary_url=f"/household/{household_id}/meter-upload",
            secondary_url=None,
            talking_points=[
                "The AI-ready extraction flow still requires resident confirmation.",
                "Validation checks protect the operational water dataset.",
            ],
        ),
        DemoScenarioStep(
            step_number=5,
            title="Waste sorting assistant",
            description="Show deterministic guidance for common household waste items.",
            module="waste",
            primary_url=f"/household/{household_id}/waste",
            secondary_url="/municipal/waste",
            talking_points=[
                "The first waste baseline is rules-based and does not call external AI.",
                "Municipal views use aggregate waste query trends.",
            ],
        ),
        DemoScenarioStep(
            step_number=6,
            title="Prepaid electricity tracking",
            description="Show how top-ups and low-balance situations are tracked.",
            module="electricity",
            primary_url=f"/household/{household_id}/electricity",
            secondary_url="/municipal/electricity",
            talking_points=[
                "Residents enter top-ups and optional balances themselves.",
                "The system stores only last-4 token references, never full tokens.",
            ],
        ),
        DemoScenarioStep(
            step_number=7,
            title="Municipal recommendations",
            description="Show cross-module alerts for municipal/community follow-up.",
            module="recommendations",
            primary_url="/municipal/recommendations",
            secondary_url=None,
            talking_points=[
                "Recommendations combine water, waste, and electricity signals.",
                "Municipal alerts are aggregate and avoid private operational fields.",
            ],
        ),
        DemoScenarioStep(
            step_number=8,
            title="Final impact view",
            description="Return to the combined impact dashboard to close the story.",
            module="impact",
            primary_url="/municipal/impact",
            secondary_url=None,
            talking_points=[
                "The demo ends by connecting resident actions to community visibility.",
                "This mode is a navigation layer over existing features.",
            ],
        ),
    ]


def build_quick_links(household_id: str) -> list[DemoQuickLink]:
    return [
        DemoQuickLink(label="Municipal Impact", url="/municipal/impact"),
        DemoQuickLink(label="Municipal Dashboard", url="/municipal/dashboard"),
        DemoQuickLink(label="Water Submissions", url="/municipal/meter-submissions"),
        DemoQuickLink(label="Waste Trends", url="/municipal/waste"),
        DemoQuickLink(label="Electricity Trends", url="/municipal/electricity"),
        DemoQuickLink(label="Recommendations", url="/municipal/recommendations"),
        DemoQuickLink(label="Household Portal", url="/household"),
        DemoQuickLink(label="Demo Household", url=f"/household/{household_id}"),
    ]


def scalar(connection, query: str) -> float:
    value = connection.execute(query).fetchone()[0]
    return float(value or 0)
