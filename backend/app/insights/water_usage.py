from collections import defaultdict
from sqlite3 import Connection


HIGH_USAGE_THRESHOLD_KL = 25.0
SUDDEN_SPIKE_MULTIPLIER = 1.75
SUDDEN_SPIKE_MINIMUM_INCREASE_KL = 10.0
RAPID_INCREASE_PERCENT = 40.0
RAPID_INCREASE_MINIMUM_KL = 6.0
SUSTAINED_HIGH_USAGE_MONTHS = 2

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
ALLOWED_INSIGHT_TYPES = {
    "sudden_usage_spike",
    "sustained_high_usage",
    "high_current_usage",
    "rapid_monthly_increase",
}
ALLOWED_SEVERITIES = {"high", "medium", "low"}


def fetch_monthly_usage_rows(connection: Connection, household_id: str | None = None) -> list[dict]:
    params: list[object] = []
    where = ""
    if household_id:
        where = "WHERE h.household_id = ?"
        params.append(household_id)

    rows = connection.execute(
        f"""
        SELECT h.household_id, h.account_number, h.customer_name,
               h.physical_address, wm.meter_number, mwr.statement_month,
               mwr.consumption_kL
        FROM households h
        JOIN monthly_water_readings mwr ON mwr.household_id = h.household_id
        LEFT JOIN water_meters wm ON wm.meter_id = mwr.meter_id
        JOIN monthly_statements ms
          ON ms.household_id = h.household_id
         AND ms.statement_month = mwr.statement_month
        {where}
        ORDER BY h.household_id, mwr.statement_month
        """,
        params,
    ).fetchall()
    return [dict(row) for row in rows]


def household_exists(connection: Connection, household_id: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM households WHERE household_id = ?",
        (household_id,),
    ).fetchone()
    return row is not None


def detect_water_usage_insights(
    connection: Connection,
    household_id: str | None = None,
) -> list[dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in fetch_monthly_usage_rows(connection, household_id):
        grouped[row["household_id"]].append(row)

    insights = []
    for history in grouped.values():
        insights.extend(detect_household_insights(history))

    return sort_insights(insights)


def detect_household_insights(history: list[dict]) -> list[dict]:
    insights = []
    triggered_by_month: dict[str, set[str]] = defaultdict(set)
    high_streak = 0

    for index, row in enumerate(history):
        current = float(row["consumption_kL"])
        previous_row = history[index - 1] if index > 0 else None
        previous = float(previous_row["consumption_kL"]) if previous_row else None
        percentage_change = calculate_percentage_change(current, previous)
        month = row["statement_month"]

        if previous is not None:
            increase = current - previous
            if (
                current >= previous * SUDDEN_SPIKE_MULTIPLIER
                and increase >= SUDDEN_SPIKE_MINIMUM_INCREASE_KL
            ):
                insights.append(
                    build_insight(
                        row,
                        "sudden_usage_spike",
                        "high",
                        "Sudden usage spike",
                        f"Water usage increased sharply from {previous:.1f} kL to {current:.1f} kL compared with the previous billing month.",
                        "Review the household's recent meter readings and consider contacting the resident to confirm whether the increase is expected.",
                        current,
                        previous,
                        percentage_change,
                        index + 1,
                    )
                )
                triggered_by_month[month].add("sudden_usage_spike")

            if (
                percentage_change is not None
                and percentage_change >= RAPID_INCREASE_PERCENT
                and increase >= RAPID_INCREASE_MINIMUM_KL
                and "sudden_usage_spike" not in triggered_by_month[month]
            ):
                insights.append(
                    build_insight(
                        row,
                        "rapid_monthly_increase",
                        "medium",
                        "Rapid monthly increase",
                        f"Water usage increased by {percentage_change:.1f}% from {previous:.1f} kL to {current:.1f} kL.",
                        "Review recent readings and compare them with expected household activity for the billing period.",
                        current,
                        previous,
                        percentage_change,
                        index + 1,
                    )
                )
                triggered_by_month[month].add("rapid_monthly_increase")

        if current >= HIGH_USAGE_THRESHOLD_KL:
            high_streak += 1
        else:
            high_streak = 0

        if high_streak >= SUSTAINED_HIGH_USAGE_MONTHS:
            insights.append(
                build_insight(
                    row,
                    "sustained_high_usage",
                    "high",
                    "Sustained high usage",
                    f"Water usage has remained above {HIGH_USAGE_THRESHOLD_KL:.1f} kL for {high_streak} consecutive billing months.",
                    "Monitor the account closely and review recent readings for sustained abnormal consumption.",
                    current,
                    previous,
                    percentage_change,
                    high_streak,
                )
            )
            triggered_by_month[month].add("sustained_high_usage")

    if history:
        latest = history[-1]
        latest_month = latest["statement_month"]
        latest_consumption = float(latest["consumption_kL"])
        previous = float(history[-2]["consumption_kL"]) if len(history) > 1 else None
        if (
            latest_consumption >= HIGH_USAGE_THRESHOLD_KL
            and "sustained_high_usage" not in triggered_by_month[latest_month]
        ):
            insights.append(
                build_insight(
                    latest,
                    "high_current_usage",
                    "medium",
                    "High current usage",
                    f"The latest monthly water usage is {latest_consumption:.1f} kL, which is above the {HIGH_USAGE_THRESHOLD_KL:.1f} kL review threshold.",
                    "Review the latest meter reading and monitor whether the high usage continues next month.",
                    latest_consumption,
                    previous,
                    calculate_percentage_change(latest_consumption, previous),
                    len(history),
                )
            )

    return insights


def calculate_percentage_change(current: float, previous: float | None) -> float | None:
    if previous is None or previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


def build_insight(
    row: dict,
    insight_type: str,
    severity: str,
    title: str,
    summary: str,
    recommended_action: str,
    current: float,
    previous: float | None,
    percentage_change: float | None,
    months_evaluated: int,
) -> dict:
    insight_id = f"{row['household_id']}:{row['statement_month']}:{insight_type}"
    return {
        "insight_id": insight_id,
        "insight_type": insight_type,
        "severity": severity,
        "title": title,
        "summary": summary,
        "recommended_action": recommended_action,
        "household_id": row["household_id"],
        "account_number": row["account_number"],
        "customer_name": row["customer_name"],
        "physical_address": row["physical_address"],
        "meter_number": row.get("meter_number"),
        "statement_month": row["statement_month"],
        "current_consumption_kL": round(current, 1),
        "previous_consumption_kL": round(previous, 1) if previous is not None else None,
        "percentage_change": percentage_change,
        "months_evaluated": months_evaluated,
    }


def summarize_insights(insights: list[dict]) -> dict:
    return {
        "total_insights": len(insights),
        "high_severity_count": sum(item["severity"] == "high" for item in insights),
        "medium_severity_count": sum(item["severity"] == "medium" for item in insights),
        "low_severity_count": sum(item["severity"] == "low" for item in insights),
        "households_requiring_review": len({item["household_id"] for item in insights}),
    }


def sort_insights(insights: list[dict]) -> list[dict]:
    return sorted(
        insights,
        key=lambda item: (
            SEVERITY_ORDER[item["severity"]],
            -int(item["statement_month"].replace("-", "")),
            item["account_number"],
            item["insight_type"],
        ),
    )
