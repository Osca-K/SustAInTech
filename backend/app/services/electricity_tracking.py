from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable, Mapping


LOW_BALANCE_THRESHOLD_KWH = 10.0


@dataclass(frozen=True)
class ElectricitySummaryValues:
    total_spend: float
    total_units: float
    average_cost_per_kWh: float
    estimated_daily_spend: float
    estimated_daily_usage_kWh: float
    latest_balance_kWh: float | None
    low_balance_warning: bool


def calculate_electricity_summary(
    topups: Iterable[Mapping[str, object]],
) -> ElectricitySummaryValues:
    rows = [dict(row) for row in topups]
    if not rows:
        return ElectricitySummaryValues(
            total_spend=0.0,
            total_units=0.0,
            average_cost_per_kWh=0.0,
            estimated_daily_spend=0.0,
            estimated_daily_usage_kWh=0.0,
            latest_balance_kWh=None,
            low_balance_warning=False,
        )

    total_spend = round(sum(float(row["amount_zar"] or 0) for row in rows), 2)
    total_units = round(sum(float(row["units_kWh"] or 0) for row in rows), 3)
    average_cost = round(total_spend / total_units, 3) if total_units > 0 else 0.0

    purchase_dates = [
        parsed
        for parsed in (_parse_date(str(row.get("purchase_date") or "")) for row in rows)
        if parsed is not None
    ]
    days = 1
    if purchase_dates:
        days = max((max(purchase_dates) - min(purchase_dates)).days + 1, 1)

    latest_balance = _latest_balance(rows)
    return ElectricitySummaryValues(
        total_spend=total_spend,
        total_units=total_units,
        average_cost_per_kWh=average_cost,
        estimated_daily_spend=round(total_spend / days, 2),
        estimated_daily_usage_kWh=round(total_units / days, 3),
        latest_balance_kWh=latest_balance,
        low_balance_warning=latest_balance is not None
        and latest_balance < LOW_BALANCE_THRESHOLD_KWH,
    )


def _parse_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _latest_balance(rows: list[dict[str, object]]) -> float | None:
    with_balance = [row for row in rows if row.get("meter_balance_kWh") is not None]
    if not with_balance:
        return None

    latest = max(
        with_balance,
        key=lambda row: (
            str(row.get("purchase_date") or ""),
            str(row.get("submitted_at") or ""),
        ),
    )
    return round(float(latest["meter_balance_kWh"]), 3)
