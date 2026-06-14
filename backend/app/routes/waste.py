import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from ..database import get_connection
from ..models import (
    WasteCategoryCount,
    WasteClassificationCount,
    WasteQueryHistoryItem,
    WasteSortRequest,
    WasteSortResult,
    WasteSummary,
)
from ..services.waste_sorting import sort_waste_item


router = APIRouter(tags=["waste"])


def new_query_id() -> str:
    return f"waste_query_{uuid.uuid4().hex}"


def ensure_household_exists(connection, household_id: str) -> None:
    exists = connection.execute(
        "SELECT 1 FROM households WHERE household_id = ?",
        (household_id,),
    ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="Household not found")


def steps_from_json(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return [str(item) for item in parsed] if isinstance(parsed, list) else []


def row_to_history_item(row) -> WasteQueryHistoryItem:
    values = dict(row)
    values["preparation_steps"] = steps_from_json(values.pop("preparation_steps_json"))
    return WasteQueryHistoryItem(**values)


@router.post(
    "/households/{household_id}/waste-sort",
    response_model=WasteSortResult,
)
def sort_household_waste(
    household_id: str,
    payload: WasteSortRequest,
) -> WasteSortResult:
    item_name = payload.item_name.strip()
    if not item_name:
        raise HTTPException(status_code=400, detail="Item name is required.")

    submitted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    result = sort_waste_item(
        item_name=item_name,
        item_description=payload.item_description,
        selected_category=payload.selected_category,
    )
    row = {
        "query_id": new_query_id(),
        "household_id": household_id,
        "submitted_at": submitted_at,
        "item_name": item_name,
        "item_description": payload.item_description,
        "selected_category": payload.selected_category,
        "classification": result.classification,
        "disposal_guidance": result.disposal_guidance,
        "preparation_steps_json": json.dumps(result.preparation_steps),
        "confidence_level": result.confidence_level,
        "source": result.source,
    }

    with get_connection() as connection:
        ensure_household_exists(connection, household_id)
        with connection:
            connection.execute(
                """
                INSERT INTO household_waste_queries (
                  query_id, household_id, submitted_at, item_name,
                  item_description, selected_category, classification,
                  disposal_guidance, preparation_steps_json, confidence_level,
                  source
                ) VALUES (
                  :query_id, :household_id, :submitted_at, :item_name,
                  :item_description, :selected_category, :classification,
                  :disposal_guidance, :preparation_steps_json, :confidence_level,
                  :source
                )
                """,
                row,
            )

    return WasteSortResult(
        **{
            **row,
            "preparation_steps": result.preparation_steps,
        }
    )


@router.get(
    "/households/{household_id}/waste-queries",
    response_model=list[WasteQueryHistoryItem],
)
def household_waste_queries(
    household_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[WasteQueryHistoryItem]:
    with get_connection() as connection:
        ensure_household_exists(connection, household_id)
        rows = connection.execute(
            """
            SELECT query_id, household_id, submitted_at, item_name,
                   item_description, selected_category, classification,
                   disposal_guidance, preparation_steps_json, confidence_level,
                   source
            FROM household_waste_queries
            WHERE household_id = ?
            ORDER BY submitted_at DESC
            LIMIT ? OFFSET ?
            """,
            (household_id, limit, offset),
        ).fetchall()
        return [row_to_history_item(row) for row in rows]


@router.get("/waste/summary", response_model=WasteSummary)
def waste_summary(limit: int = Query(default=10, ge=1, le=50)) -> WasteSummary:
    with get_connection() as connection:
        total = connection.execute(
            "SELECT COUNT(*) AS total FROM household_waste_queries"
        ).fetchone()["total"]
        classification_rows = connection.execute(
            """
            SELECT classification, COUNT(*) AS count
            FROM household_waste_queries
            GROUP BY classification
            ORDER BY count DESC, classification
            """
        ).fetchall()
        category_rows = connection.execute(
            """
            SELECT selected_category, COUNT(*) AS count
            FROM household_waste_queries
            WHERE selected_category IS NOT NULL AND selected_category <> ''
            GROUP BY selected_category
            ORDER BY count DESC, selected_category
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        recent_rows = connection.execute(
            """
            SELECT query_id, household_id, submitted_at, item_name,
                   item_description, selected_category, classification,
                   disposal_guidance, preparation_steps_json, confidence_level,
                   source
            FROM household_waste_queries
            ORDER BY submitted_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return WasteSummary(
        total_queries=total,
        classification_counts=[
            WasteClassificationCount(**dict(row)) for row in classification_rows
        ],
        top_selected_categories=[
            WasteCategoryCount(**dict(row)) for row in category_rows
        ],
        recent_queries=[row_to_history_item(row) for row in recent_rows],
    )
