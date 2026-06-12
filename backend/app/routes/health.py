from fastapi import APIRouter

from ..config import APP_NAME, APP_VERSION
from ..models import HealthResponse


router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="healthy", application=APP_NAME, version=APP_VERSION)
