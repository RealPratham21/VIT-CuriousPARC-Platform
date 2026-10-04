from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import current_user, db_session
from app.core.config import get_settings
from app.core.errors import APIError
from app.core.security import (
    create_access_token,
    hash_refresh_token,
    new_refresh_token,
    verify_password,
)
from app.models.staff import AuthSession, StaffUser
from app.schemas.contracts import LoginRequest, MessageResponse, StaffUserView, TokenResponse
from app.services.auth import make_auth_session, staff_view

router = APIRouter()
settings = get_settings()
REFRESH_COOKIE = "hackops_refresh"


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path=f"{settings.api_v1_prefix}/auth",
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> TokenResponse:
    user = await session.scalar(
        select(StaffUser).where(StaffUser.staff_code == payload.staff_code.strip())
    )
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise APIError(
            401,
            "INVALID_CREDENTIALS",
            "Invalid credentials",
            "The login code or password is wrong.",
        )
    raw_refresh, refresh_hash = new_refresh_token()
    session.add(
        make_auth_session(
            user,
            refresh_hash,
            request.client.host if request.client else None,
            request.headers.get("user-agent"),
        )
    )
    user.last_login_at = datetime.now(UTC)
    await session.commit()
    token, expires_in = create_access_token(user.id)
    set_refresh_cookie(response, raw_refresh)
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=await staff_view(session, user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    hackops_refresh: str | None = Cookie(default=None),
    session: AsyncSession = Depends(db_session),
) -> TokenResponse:
    if not hackops_refresh:
        raise APIError(401, "REFRESH_REQUIRED", "Session expired", "Sign in again.")
    stored = await session.scalar(
        select(AuthSession).where(
            AuthSession.refresh_token_hash == hash_refresh_token(hackops_refresh)
        )
    )
    now = datetime.now(UTC)
    if stored is None or stored.revoked_at is not None or stored.expires_at <= now:
        raise APIError(401, "INVALID_REFRESH_TOKEN", "Session expired", "Sign in again.")
    user = await session.get(StaffUser, stored.user_id)
    if user is None or not user.is_active:
        raise APIError(401, "ACCOUNT_INACTIVE", "Account unavailable", "Sign in again.")
    stored.revoked_at = now
    raw_refresh, refresh_hash = new_refresh_token()
    session.add(
        make_auth_session(
            user,
            refresh_hash,
            request.client.host if request.client else None,
            request.headers.get("user-agent"),
        )
    )
    await session.commit()
    token, expires_in = create_access_token(user.id)
    set_refresh_cookie(response, raw_refresh)
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=await staff_view(session, user),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    hackops_refresh: str | None = Cookie(default=None),
    session: AsyncSession = Depends(db_session),
) -> MessageResponse:
    if hackops_refresh:
        stored = await session.scalar(
            select(AuthSession).where(
                AuthSession.refresh_token_hash == hash_refresh_token(hackops_refresh)
            )
        )
        if stored and stored.revoked_at is None:
            stored.revoked_at = datetime.now(UTC)
            await session.commit()
    response.delete_cookie(REFRESH_COOKIE, path=f"{settings.api_v1_prefix}/auth")
    return MessageResponse(message="Signed out.")


@router.get("/me", response_model=StaffUserView)
async def me(
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> StaffUserView:
    return await staff_view(session, user)
