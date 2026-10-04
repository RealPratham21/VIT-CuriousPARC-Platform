from fastapi import APIRouter

from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.public import router as public_router
from app.api.routes.staff_operations import router as staff_operations_router
from app.api.routes.staff_teams import router as staff_teams_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="/health", tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(
    public_router,
    prefix="/public/events/{slug}",
    tags=["public"],
)
api_router.include_router(staff_teams_router, prefix="/staff", tags=["staff: teams"])
api_router.include_router(staff_operations_router, prefix="/staff", tags=["staff: operations"])
api_router.include_router(admin_router, prefix="/admin", tags=["administration"])
