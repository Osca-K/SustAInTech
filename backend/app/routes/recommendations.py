from fastapi import APIRouter, HTTPException

from ..database import get_connection
from ..models import (
    HouseholdRecommendationsResponse,
    MunicipalRecommendationsResponse,
    RecommendationItem,
)
from ..services.recommendations import (
    generate_household_recommendations,
    generate_municipal_recommendations,
)


router = APIRouter(tags=["recommendations"])


def ensure_household_exists(connection, household_id: str) -> None:
    exists = connection.execute(
        "SELECT 1 FROM households WHERE household_id = ?",
        (household_id,),
    ).fetchone()
    if exists is None:
        raise HTTPException(status_code=404, detail="Household not found")


@router.get(
    "/households/{household_id}/recommendations",
    response_model=HouseholdRecommendationsResponse,
)
def household_recommendations(household_id: str) -> HouseholdRecommendationsResponse:
    with get_connection() as connection:
        ensure_household_exists(connection, household_id)
        recommendations = generate_household_recommendations(connection, household_id)

    return HouseholdRecommendationsResponse(
        household_id=household_id,
        recommendations=[RecommendationItem(**item) for item in recommendations],
    )


@router.get(
    "/recommendations/municipal",
    response_model=MunicipalRecommendationsResponse,
)
def municipal_recommendations() -> MunicipalRecommendationsResponse:
    with get_connection() as connection:
        recommendations = generate_municipal_recommendations(connection)

    return MunicipalRecommendationsResponse(
        recommendations=[RecommendationItem(**item) for item in recommendations],
    )
