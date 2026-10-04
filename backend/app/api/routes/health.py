from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.db.session import check_database_connection

router = APIRouter()


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str = "hackops-api"


class ReadinessResponse(HealthResponse):
    database: Literal["ok"]


@router.get("/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/ready", response_model=ReadinessResponse)
async def readiness() -> ReadinessResponse:
    try:
        await check_database_connection()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Database is unavailable."},
        ) from exc

    return ReadinessResponse(status="ok", database="ok")

