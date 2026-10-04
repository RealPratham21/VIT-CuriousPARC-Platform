from __future__ import annotations

from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityEvent, AuditLog
from app.models.enums import ActivityVisibility


def add_audit(
    session: AsyncSession,
    request: Request,
    *,
    event_id: UUID,
    actor_user_id: UUID,
    action: str,
    entity_type: str,
    entity_id: UUID,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    session.add(
        AuditLog(
            event_id=event_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_data=before,
            after_data=after,
            request_id=request.state.request_id,
            ip_address=request.client.host if request.client else None,
        )
    )


def add_activity(
    session: AsyncSession,
    *,
    event_id: UUID,
    actor_user_id: UUID,
    event_type: str,
    title: str,
    description: str,
    team_id: UUID | None = None,
    room_id: UUID | None = None,
    evaluation_id: UUID | None = None,
    visibility: ActivityVisibility = ActivityVisibility.PUBLIC,
) -> None:
    session.add(
        ActivityEvent(
            event_id=event_id,
            team_id=team_id,
            room_id=room_id,
            evaluation_id=evaluation_id,
            event_type=event_type,
            title=title,
            public_description=description,
            visibility=visibility,
            actor_user_id=actor_user_id,
        )
    )
