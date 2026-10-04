from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.event import Event
from app.models.staff import AuthSession, EventStaffRole, StaffUser
from app.schemas.contracts import StaffRoleView, StaffUserView


async def staff_view(session: AsyncSession, user: StaffUser) -> StaffUserView:
    rows = (
        await session.execute(
            select(EventStaffRole, Event.slug)
            .join(Event, Event.id == EventStaffRole.event_id)
            .where(EventStaffRole.user_id == user.id)
            .order_by(Event.slug, EventStaffRole.role)
        )
    ).all()
    return StaffUserView(
        id=user.id,
        staff_code=user.staff_code,
        full_name=user.full_name,
        email=user.email,
        phone_e164=user.phone_e164,
        is_active=user.is_active,
        roles=[
            StaffRoleView(event_id=role.event_id, event_slug=slug, role=role.role)
            for role, slug in rows
        ],
    )


def make_auth_session(
    user: StaffUser,
    refresh_hash: str,
    ip_address: str | None,
    user_agent: str | None,
) -> AuthSession:
    settings = get_settings()
    return AuthSession(
        user_id=user.id,
        refresh_token_hash=refresh_hash,
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        ip_address=ip_address,
        user_agent=user_agent,
    )
