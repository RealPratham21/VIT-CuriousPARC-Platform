from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import current_user, db_session, require_event_role
from app.core.errors import conflict, not_found
from app.core.security import hash_password
from app.models.enums import StaffRole
from app.models.staff import AuthSession, EventStaffRole, StaffUser
from app.schemas.contracts import (
    MessageResponse,
    PasswordReset,
    StaffRoleCreate,
    StaffUserCreate,
    StaffUserView,
)
from app.services.audit import add_audit
from app.services.auth import staff_view

router = APIRouter()


@router.get("/events/{event_id}/staff-users", response_model=list[StaffUserView])
async def list_staff_users(
    event_id: UUID,
    admin: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> list[StaffUserView]:
    await require_event_role(session, admin, event_id, set())
    users = list(
        (
            await session.scalars(
                select(StaffUser)
                .join(EventStaffRole, EventStaffRole.user_id == StaffUser.id)
                .where(EventStaffRole.event_id == event_id)
                .distinct()
                .order_by(StaffUser.full_name)
            )
        ).all()
    )
    return [await staff_view(session, user) for user in users]


@router.post("/events/{event_id}/staff-users", response_model=StaffUserView, status_code=201)
async def create_staff_user(
    event_id: UUID,
    payload: StaffUserCreate,
    request: Request,
    admin: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> StaffUserView:
    await require_event_role(session, admin, event_id, set())
    existing = await session.scalar(
        select(StaffUser.id).where(StaffUser.staff_code == payload.staff_code.strip())
    )
    if existing:
        raise conflict("STAFF_CODE_EXISTS", "That staff login code already exists.")
    user = StaffUser(
        staff_code=payload.staff_code.strip(),
        full_name=payload.full_name.strip(),
        email=payload.email,
        phone_e164=payload.phone_e164,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=admin.id,
        action="staff_user.create",
        entity_type="staff_user",
        entity_id=user.id,
        after={"staff_code": user.staff_code, "full_name": user.full_name},
    )
    await session.commit()
    return await staff_view(session, user)


@router.post(
    "/events/{event_id}/staff-users/{user_id}/roles",
    response_model=StaffUserView,
)
async def grant_role(
    event_id: UUID,
    user_id: UUID,
    payload: StaffRoleCreate,
    request: Request,
    admin: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> StaffUserView:
    await require_event_role(session, admin, event_id, set())
    user = await session.get(StaffUser, user_id)
    if user is None:
        raise not_found("Staff user")
    existing = await session.scalar(
        select(EventStaffRole).where(
            EventStaffRole.event_id == event_id,
            EventStaffRole.user_id == user_id,
            EventStaffRole.role == payload.role,
        )
    )
    if existing is None:
        session.add(EventStaffRole(event_id=event_id, user_id=user_id, role=payload.role))
        add_audit(
            session,
            request,
            event_id=event_id,
            actor_user_id=admin.id,
            action="staff_role.grant",
            entity_type="staff_user",
            entity_id=user.id,
            after={"role": payload.role.value},
        )
        await session.commit()
    return await staff_view(session, user)


@router.delete(
    "/events/{event_id}/staff-users/{user_id}/roles/{role}",
    response_model=StaffUserView,
)
async def revoke_role(
    event_id: UUID,
    user_id: UUID,
    role: StaffRole,
    request: Request,
    admin: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> StaffUserView:
    await require_event_role(session, admin, event_id, set())
    user = await session.get(StaffUser, user_id)
    if user is None:
        raise not_found("Staff user")
    assignment = await session.scalar(
        select(EventStaffRole).where(
            EventStaffRole.event_id == event_id,
            EventStaffRole.user_id == user_id,
            EventStaffRole.role == role,
        )
    )
    if assignment:
        await session.delete(assignment)
        add_audit(
            session,
            request,
            event_id=event_id,
            actor_user_id=admin.id,
            action="staff_role.revoke",
            entity_type="staff_user",
            entity_id=user.id,
            before={"role": role.value},
        )
        await session.commit()
    return await staff_view(session, user)


@router.post("/events/{event_id}/staff-users/{user_id}/deactivate", response_model=MessageResponse)
async def deactivate_user(
    event_id: UUID,
    user_id: UUID,
    request: Request,
    admin: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MessageResponse:
    await require_event_role(session, admin, event_id, set())
    if user_id == admin.id:
        raise conflict(
            "CANNOT_DEACTIVATE_SELF", "An administrator cannot deactivate their own account."
        )
    user = await session.get(StaffUser, user_id)
    if user is None:
        raise not_found("Staff user")
    user.is_active = False
    now = datetime.now(UTC)
    await session.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=admin.id,
        action="staff_user.deactivate",
        entity_type="staff_user",
        entity_id=user.id,
        after={"is_active": False},
    )
    await session.commit()
    return MessageResponse(message="Staff account deactivated and sessions revoked.")


@router.post(
    "/events/{event_id}/staff-users/{user_id}/reset-password", response_model=MessageResponse
)
async def reset_password(
    event_id: UUID,
    user_id: UUID,
    payload: PasswordReset,
    request: Request,
    admin: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MessageResponse:
    await require_event_role(session, admin, event_id, set())
    user = await session.get(StaffUser, user_id)
    if user is None:
        raise not_found("Staff user")
    user.password_hash = hash_password(payload.password)
    await session.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=admin.id,
        action="staff_user.reset_password",
        entity_type="staff_user",
        entity_id=user.id,
    )
    await session.commit()
    return MessageResponse(message="Password reset and existing sessions revoked.")
