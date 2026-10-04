from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError
from app.core.security import decode_access_token
from app.db.session import get_db_session
from app.models.enums import StaffRole
from app.models.staff import EventStaffRole, StaffUser

bearer = HTTPBearer(auto_error=False)


async def db_session() -> AsyncIterator[AsyncSession]:
    async for session in get_db_session():
        yield session


async def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(db_session),
) -> StaffUser:
    if credentials is None:
        raise APIError(401, "AUTH_REQUIRED", "Authentication required", "Use a bearer token.")
    try:
        user_id = decode_access_token(credentials.credentials)
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise APIError(
            401, "INVALID_ACCESS_TOKEN", "Invalid access token", "Sign in again."
        ) from None
    user = await session.get(StaffUser, user_id)
    if user is None or not user.is_active:
        raise APIError(401, "ACCOUNT_INACTIVE", "Account unavailable", "Sign in again.")
    return user


async def require_event_role(
    session: AsyncSession,
    user: StaffUser,
    event_id: UUID,
    allowed: set[StaffRole],
) -> set[StaffRole]:
    roles = set(
        (
            await session.scalars(
                select(EventStaffRole.role).where(
                    EventStaffRole.event_id == event_id,
                    EventStaffRole.user_id == user.id,
                )
            )
        ).all()
    )
    if StaffRole.ADMIN not in roles and not roles.intersection(allowed):
        raise APIError(
            403,
            "INSUFFICIENT_PERMISSION",
            "Insufficient permission",
            "Your event role does not allow this operation.",
        )
    return roles
