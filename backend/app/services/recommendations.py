from __future__ import annotations

from datetime import datetime, timezone
from sqlite3 import Connection

from ..insights.water_usage import detect_water_usage_insights
from .electricity_tracking import calculate_electricity_summary


MODULE_ORDER = {"water": 0, "electricity": 1, "waste": 2, "combined": 3}
SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2, "info": 3}
USEFUL_WASTE_CLASSES = {"recyclable", "organic", "reuse_or_donate"}


def generate_household_recommendations(
    connection: Connection,
    household_id: str,
) -> list[dict[str, object]]:
    created_at = now_iso()
    recommendations: list[dict[str, object]] = []

    water_signal = add_household_water_recommendations(
        connection,
        household_id,
        created_at,
        recommendations,
    )
    electricity_signal, electricity_low_balance = add_household_electricity_recommendations(
        connection,
        household_id,
        created_at,
        recommendations,
    )
    waste_signal = add_household_waste_recommendations(
        connection,
        household_id,
        created_at,
        recommendations,
    )

    water_review_required = any(
        item["module"] == "water"
        and item["title"] == "Review your latest water reading"
        for item in recommendations
    )
    if water_review_required and electricity_low_balance:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="combined",
                severity="high",
                slug="multiple-resource-alerts",
                title="Multiple resource alerts need attention",
                message=(
                    "Your latest water reading needs review and your prepaid "
                    "electricity balance appears low. Check the water reading "
                    "and consider topping up soon."
                ),
                action_label="Review household actions",
                action_url=f"/household/{household_id}",
                evidence={
                    "water_review_required": True,
                    "electricity_low_balance": True,
                },
                audience="household",
            )
        )

    if water_signal and electricity_signal and waste_signal:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="combined",
                severity="info",
                slug="active-resource-profile",
                title="Your household resource profile is active",
                message=(
                    "You have activity across water, electricity, and waste. "
                    "Keep using these tools to build a clearer household picture."
                ),
                action_label="View dashboard",
                action_url=f"/household/{household_id}",
                evidence={
                    "has_water_signal": True,
                    "has_electricity_signal": True,
                    "has_waste_signal": True,
                },
                audience="household",
            )
        )

    return sort_recommendations(recommendations)


def generate_municipal_recommendations(
    connection: Connection,
) -> list[dict[str, object]]:
    created_at = now_iso()
    recommendations: list[dict[str, object]] = []

    total_submissions = int(
        scalar(connection, "SELECT COUNT(*) FROM household_meter_submissions")
    )
    review_required = int(
        scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM household_meter_submissions
            WHERE validation_status = 'review_required'
            """,
        )
    )
    review_rate = (review_required / total_submissions) if total_submissions else 0
    if total_submissions and review_rate > 0.2:
        recommendations.append(
            recommendation(
                household_id=None,
                created_at=created_at,
                module="water",
                severity="high",
                slug="water-review-workload",
                title="Water review workload is increasing",
                message=(
                    "More than 20% of resident meter submissions need review. "
                    "Prioritize checking recent readings and follow-up guidance."
                ),
                action_label="Review meter submissions",
                action_url="/municipal/meter-submissions",
                evidence={
                    "total_meter_submissions": total_submissions,
                    "review_required_meter_submissions": review_required,
                    "review_rate_percent": round(review_rate * 100, 2),
                },
                audience="municipal",
            )
        )

    low_balance_households = latest_low_balance_households(connection)
    if low_balance_households > 0:
        recommendations.append(
            recommendation(
                household_id=None,
                created_at=created_at,
                module="electricity",
                severity="medium",
                slug="electricity-low-balance-reminders",
                title="Some households may need electricity top-up reminders",
                message=(
                    "At least one household has reported a prepaid electricity "
                    "balance below 10 kWh."
                ),
                action_label="View electricity trends",
                action_url="/municipal/electricity",
                evidence={"low_balance_households": low_balance_households},
                audience="municipal",
            )
        )

    special_waste_queries = int(
        scalar(
            connection,
            """
            SELECT COUNT(*)
            FROM household_waste_queries
            WHERE classification IN ('hazardous', 'e_waste')
            """,
        )
    )
    if special_waste_queries > 0:
        recommendations.append(
            recommendation(
                household_id=None,
                created_at=created_at,
                module="waste",
                severity="medium",
                slug="special-waste-education",
                title="Special waste education opportunity",
                message=(
                    "Residents have asked about hazardous or e-waste items. "
                    "Consider sharing clear disposal guidance."
                ),
                action_label="View waste trends",
                action_url="/municipal/waste",
                evidence={"special_waste_queries": special_waste_queries},
                audience="municipal",
            )
        )

    has_water = total_submissions > 0
    has_electricity = (
        int(scalar(connection, "SELECT COUNT(*) FROM household_electricity_topups")) > 0
    )
    has_waste = int(scalar(connection, "SELECT COUNT(*) FROM household_waste_queries")) > 0
    if has_water and has_electricity and has_waste:
        recommendations.append(
            recommendation(
                household_id=None,
                created_at=created_at,
                module="combined",
                severity="info",
                slug="community-resource-profile-active",
                title="Community resource profile is active",
                message=(
                    "Water, electricity, and waste activity are all available "
                    "for community-level review."
                ),
                action_label="View impact dashboard",
                action_url="/municipal/impact",
                evidence={
                    "has_water_data": True,
                    "has_electricity_data": True,
                    "has_waste_data": True,
                },
                audience="municipal",
            )
        )

    return sort_recommendations(recommendations)


def add_household_water_recommendations(
    connection: Connection,
    household_id: str,
    created_at: str,
    recommendations: list[dict[str, object]],
) -> bool:
    latest_submission = connection.execute(
        """
        SELECT validation_status, estimated_daily_usage_kL
        FROM household_meter_submissions
        WHERE household_id = ?
        ORDER BY submitted_at DESC
        LIMIT 1
        """,
        (household_id,),
    ).fetchone()
    if latest_submission is None:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="water",
                severity="info",
                slug="start-water-meter-tracking",
                title="Start tracking your water meter",
                message=(
                    "Upload a recent water meter photo to monitor your usage "
                    "between municipal statements."
                ),
                action_label="Upload meter photo",
                action_url=f"/household/{household_id}/meter-upload",
                evidence={"meter_submissions": 0},
                audience="household",
            )
        )
        return False

    if latest_submission["validation_status"] == "review_required":
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="water",
                severity="medium",
                slug="review-latest-water-reading",
                title="Review your latest water reading",
                message=(
                    "Your latest water reading needs review. Check for running "
                    "taps, toilets, or visible pipe leaks."
                ),
                action_label="Check latest water reading",
                action_url=f"/household/{household_id}/meter-upload",
                evidence={"latest_validation_status": "review_required"},
                audience="household",
            )
        )

    latest_usage = connection.execute(
        """
        SELECT estimated_daily_usage_kL
        FROM household_meter_submissions
        WHERE household_id = ?
          AND validation_status IN ('accepted', 'review_required')
          AND estimated_daily_usage_kL IS NOT NULL
        ORDER BY submitted_at DESC
        LIMIT 1
        """,
        (household_id,),
    ).fetchone()
    if latest_usage and float(latest_usage["estimated_daily_usage_kL"] or 0) > 5:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="water",
                severity="high",
                slug="high-daily-water-usage",
                title="High daily water usage detected",
                message=(
                    "Your recent water usage is high. Check taps, toilets, and "
                    "visible pipes, then compare against your next reading."
                ),
                action_label="Review water usage",
                action_url=f"/household/{household_id}/meter-upload",
                evidence={
                    "estimated_daily_usage_kL": round(
                        float(latest_usage["estimated_daily_usage_kL"]),
                        3,
                    )
                },
                audience="household",
            )
        )

    insights = detect_water_usage_insights(connection, household_id=household_id)
    if insights:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="water",
                severity="low",
                slug="watch-monthly-water-pattern",
                title="Watch your monthly water pattern",
                message=(
                    "Your municipal readings show a water usage pattern worth "
                    "checking over the next month."
                ),
                action_label="Review usage insights",
                action_url=f"/household/{household_id}",
                evidence={"water_insights": len(insights)},
                audience="household",
            )
        )

    return True


def add_household_electricity_recommendations(
    connection: Connection,
    household_id: str,
    created_at: str,
    recommendations: list[dict[str, object]],
) -> tuple[bool, bool]:
    rows = connection.execute(
        """
        SELECT purchase_date, submitted_at, amount_zar, units_kWh, meter_balance_kWh
        FROM household_electricity_topups
        WHERE household_id = ?
        ORDER BY purchase_date DESC, submitted_at DESC
        """,
        (household_id,),
    ).fetchall()
    if not rows:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="electricity",
                severity="info",
                slug="start-electricity-tracking",
                title="Start tracking prepaid electricity",
                message=(
                    "Save prepaid electricity purchases to understand top-up "
                    "patterns and balance changes."
                ),
                action_label="Track electricity",
                action_url=f"/household/{household_id}/electricity",
                evidence={"electricity_topups": 0},
                audience="household",
            )
        )
        return False, False

    summary = calculate_electricity_summary(rows)
    if summary.low_balance_warning:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="electricity",
                severity="medium",
                slug="electricity-balance-low",
                title="Electricity balance is low",
                message=(
                    "Your latest electricity balance appears low. Consider "
                    "topping up soon."
                ),
                action_label="Track electricity",
                action_url=f"/household/{household_id}/electricity",
                evidence={"latest_balance_kWh": summary.latest_balance_kWh},
                audience="household",
            )
        )

    if len(rows) >= 3 and summary.estimated_daily_spend > 50:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="electricity",
                severity="low",
                slug="watch-electricity-spend",
                title="Electricity spend is worth watching",
                message=(
                    "Your recent prepaid electricity spend looks higher than "
                    "usual for this tracking period. Keep comparing future top-ups."
                ),
                action_label="Review electricity history",
                action_url=f"/household/{household_id}/electricity",
                evidence={
                    "topups_used": len(rows),
                    "estimated_daily_spend": summary.estimated_daily_spend,
                },
                audience="household",
            )
        )

    return True, summary.low_balance_warning


def add_household_waste_recommendations(
    connection: Connection,
    household_id: str,
    created_at: str,
    recommendations: list[dict[str, object]],
) -> bool:
    rows = connection.execute(
        """
        SELECT classification, COUNT(*) AS count
        FROM household_waste_queries
        WHERE household_id = ?
        GROUP BY classification
        """,
        (household_id,),
    ).fetchall()
    if not rows:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="waste",
                severity="info",
                slug="try-waste-sorting-assistant",
                title="Try the waste sorting assistant",
                message="Use the assistant before throwing away uncertain household items.",
                action_label="Sort a waste item",
                action_url=f"/household/{household_id}/waste",
                evidence={"waste_queries": 0},
                audience="household",
            )
        )
        return False

    counts = {row["classification"]: int(row["count"]) for row in rows}
    useful_count = sum(counts.get(classification, 0) for classification in USEFUL_WASTE_CLASSES)
    if useful_count >= 3:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="waste",
                severity="low",
                slug="build-simple-sorting-habit",
                title="Build a simple sorting habit",
                message=(
                    "You often ask about recyclable, organic, or reusable items. "
                    "Keep a dry recycling bag or box at home."
                ),
                action_label="Open waste assistant",
                action_url=f"/household/{household_id}/waste",
                evidence={"useful_sorting_queries": useful_count},
                audience="household",
            )
        )

    special_count = counts.get("hazardous", 0) + counts.get("e_waste", 0)
    if special_count > 0:
        recommendations.append(
            recommendation(
                household_id=household_id,
                created_at=created_at,
                module="waste",
                severity="medium",
                slug="handle-special-waste-safely",
                title="Handle special waste safely",
                message=(
                    "You asked about hazardous or e-waste items. Keep these "
                    "separate and use a suitable collection point."
                ),
                action_label="Review sorting guidance",
                action_url=f"/household/{household_id}/waste",
                evidence={"special_waste_queries": special_count},
                audience="household",
            )
        )

    return True


def latest_low_balance_households(connection: Connection) -> int:
    return int(
        scalar(
            connection,
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
            SELECT COUNT(*)
            FROM ranked
            WHERE rank = 1 AND meter_balance_kWh < 10
            """,
        )
    )


def recommendation(
    *,
    household_id: str | None,
    created_at: str,
    module: str,
    severity: str,
    slug: str,
    title: str,
    message: str,
    action_label: str,
    action_url: str,
    evidence: dict[str, object],
    audience: str,
) -> dict[str, object]:
    scope = household_id or "municipal"
    return {
        "recommendation_id": f"recommendation_{scope}_{module}_{slug}",
        "household_id": household_id,
        "created_at": created_at,
        "module": module,
        "severity": severity,
        "title": title,
        "message": message,
        "action_label": action_label,
        "action_url": action_url,
        "evidence": evidence,
        "audience": audience,
        "status": "active",
    }


def sort_recommendations(items: list[dict[str, object]]) -> list[dict[str, object]]:
    return sorted(
        items,
        key=lambda item: (
            SEVERITY_ORDER[str(item["severity"])],
            MODULE_ORDER[str(item["module"])],
            str(item["title"]),
        ),
    )


def scalar(connection: Connection, query: str, params: tuple[object, ...] = ()) -> float:
    value = connection.execute(query, params).fetchone()[0]
    return float(value or 0)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
