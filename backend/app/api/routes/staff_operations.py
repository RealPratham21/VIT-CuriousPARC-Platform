from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import current_user, db_session, require_event_role
from app.core.errors import conflict, not_found
from app.models.activity import Announcement
from app.models.enums import (
    ActivityVisibility,
    EvaluationStatus,
    RoomDutyRole,
    RoundStatus,
    StaffRole,
)
from app.models.evaluation import Evaluation, JudgingPanel, PanelMember, Round
from app.models.event import Event
from app.models.room import Room, RoomStaffAssignment
from app.models.staff import EventStaffRole, StaffUser
from app.models.team import Team
from app.schemas.contracts import (
    AnnouncementCreate,
    AnnouncementStaff,
    AnnouncementUpdate,
    EvaluationCreate,
    EvaluationStaff,
    EvaluationTransition,
    MessageResponse,
    PanelCreate,
    PanelMemberCreate,
    PanelMemberView,
    PanelView,
    RoomStaffAssignmentCreate,
    RoomStaffAssignmentView,
    RoomStaffRelease,
    RoundCreate,
    RoundPublic,
)
from app.services.audit import add_activity, add_audit
from app.services.read_models import evaluation_public

router = APIRouter()
LEADS = {StaffRole.LEAD}
COORDINATORS = {StaffRole.COORDINATOR, StaffRole.LEAD}
EVALUATION_WRITERS = {StaffRole.EVALUATOR, StaffRole.COORDINATOR, StaffRole.LEAD}


async def require_event(session: AsyncSession, event_id: UUID) -> Event:
    event = await session.get(Event, event_id)
    if event is None:
        raise not_found("Event")
    return event


@router.get("/events/{event_id}/rounds", response_model=list[RoundPublic])
async def list_rounds_staff(
    event_id: UUID,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> list[RoundPublic]:
    await require_event_role(session, user, event_id, set(StaffRole))
    records = (
        await session.scalars(
            select(Round).where(Round.event_id == event_id).order_by(Round.sequence_number)
        )
    ).all()
    return [RoundPublic.model_validate(record) for record in records]


@router.get("/events/{event_id}/panels", response_model=list[PanelView])
async def list_panels_staff(
    event_id: UUID,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> list[PanelView]:
    await require_event_role(session, user, event_id, set(StaffRole))
    records = (
        await session.scalars(
            select(JudgingPanel)
            .where(JudgingPanel.event_id == event_id)
            .order_by(JudgingPanel.name)
        )
    ).all()
    return [PanelView.model_validate(record) for record in records]


@router.post(
    "/events/{event_id}/rooms/{room_id}/staff-assignments",
    response_model=RoomStaffAssignmentView,
    status_code=201,
)
async def assign_room_staff(
    event_id: UUID,
    room_id: UUID,
    payload: RoomStaffAssignmentCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> RoomStaffAssignmentView:
    await require_event_role(session, user, event_id, COORDINATORS)
    room = await session.scalar(select(Room).where(Room.id == room_id, Room.event_id == event_id))
    if room is None:
        raise not_found("Room")
    if payload.duty_role == RoomDutyRole.COORDINATOR:
        assignee = await session.get(StaffUser, payload.user_id)
        if assignee is None or not assignee.is_active:
            raise not_found("Active staff user")
        assignee_role = await session.scalar(
            select(EventStaffRole.id).where(
                EventStaffRole.event_id == event_id,
                EventStaffRole.user_id == assignee.id,
            )
        )
        if assignee_role is None:
            raise conflict(
                "EVENT_ROLE_REQUIRED",
                "Assign this staff user an event role before assigning room duty.",
            )
        current = await session.scalar(
            select(RoomStaffAssignment).where(
                RoomStaffAssignment.user_id == payload.user_id,
                RoomStaffAssignment.duty_role == payload.duty_role,
                RoomStaffAssignment.ends_at.is_(None),
            )
        )
        if current:
            if payload.starts_at <= current.starts_at:
                raise conflict(
                    "INVALID_ASSIGNMENT_TIME",
                    "The new assignment must start after the current assignment started.",
                )
            current.ends_at = payload.starts_at
    else:
        volunteer_name = payload.volunteer_name or ""
        duplicate = await session.scalar(
            select(RoomStaffAssignment.id).where(
                RoomStaffAssignment.room_id == room.id,
                RoomStaffAssignment.duty_role == RoomDutyRole.VOLUNTEER,
                RoomStaffAssignment.ends_at.is_(None),
                func.lower(RoomStaffAssignment.volunteer_name) == volunteer_name.lower(),
            )
        )
        if duplicate is not None:
            raise conflict(
                "DUPLICATE_VOLUNTEER",
                "That volunteer is already assigned to this room.",
            )
    assignment = RoomStaffAssignment(
        room_id=room.id,
        assigned_by=user.id,
        **payload.model_dump(),
    )
    session.add(assignment)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="room_staff.assign",
        entity_type="room_staff_assignment",
        entity_id=assignment.id,
        after={
            "room_id": str(room.id),
            "user_id": str(payload.user_id) if payload.user_id else None,
            "volunteer_name": payload.volunteer_name,
            "duty": payload.duty_role.value,
        },
    )
    await session.commit()
    return RoomStaffAssignmentView.model_validate(assignment)


@router.post(
    "/events/{event_id}/rooms/{room_id}/staff-assignments/release",
    response_model=MessageResponse,
)
async def release_room_staff(
    event_id: UUID,
    room_id: UUID,
    payload: RoomStaffRelease,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MessageResponse:
    await require_event_role(session, user, event_id, COORDINATORS)
    current = await session.scalar(
        select(RoomStaffAssignment)
        .join(Room, Room.id == RoomStaffAssignment.room_id)
        .where(
            RoomStaffAssignment.id == payload.assignment_id,
            Room.id == room_id,
            Room.event_id == event_id,
            RoomStaffAssignment.ends_at.is_(None),
        )
    )
    if current is None:
        raise not_found("Current room assignment")
    current.ends_at = datetime.now(UTC)
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="room_staff.release",
        entity_type="room_staff_assignment",
        entity_id=current.id,
        after={
            "room_id": str(room_id),
            "user_id": str(current.user_id) if current.user_id else None,
            "volunteer_name": current.volunteer_name,
            "duty": current.duty_role.value,
        },
    )
    await session.commit()
    return MessageResponse(message="Room assignment ended.")


@router.post("/events/{event_id}/rounds", response_model=RoundPublic, status_code=201)
async def create_round(
    event_id: UUID,
    payload: RoundCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> RoundPublic:
    await require_event(session, event_id)
    await require_event_role(session, user, event_id, LEADS)
    record = Round(event_id=event_id, status=RoundStatus.SCHEDULED, **payload.model_dump())
    session.add(record)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="round.create",
        entity_type="round",
        entity_id=record.id,
        after={"code": record.code, "name": record.name},
    )
    await session.commit()
    return RoundPublic.model_validate(record)


async def transition_round(
    event_id: UUID,
    round_id: UUID,
    target: RoundStatus,
    request: Request,
    user: StaffUser,
    session: AsyncSession,
) -> RoundPublic:
    await require_event_role(session, user, event_id, LEADS)
    record = await session.scalar(
        select(Round).where(Round.id == round_id, Round.event_id == event_id)
    )
    if record is None:
        raise not_found("Round")
    allowed = {
        RoundStatus.SCHEDULED: {RoundStatus.LIVE},
        RoundStatus.LIVE: {RoundStatus.CLOSED},
        RoundStatus.CLOSED: {RoundStatus.LIVE},
    }
    if target not in allowed[record.status]:
        raise conflict(
            "INVALID_ROUND_TRANSITION", f"Cannot change {record.status.value} to {target.value}."
        )
    if target == RoundStatus.LIVE:
        other = await session.scalar(
            select(Round).where(
                Round.event_id == event_id,
                Round.status == RoundStatus.LIVE,
                Round.id != record.id,
            )
        )
        if other is not None:
            raise conflict(
                "ROUND_ALREADY_LIVE",
                f"Close {other.name} before opening this round.",
            )
    before = record.status
    record.status = target
    add_activity(
        session,
        event_id=event_id,
        actor_user_id=user.id,
        event_type="round_status_changed",
        title=f"{record.name} is {target.value}",
        description=f"{record.name} changed from {before.value} to {target.value}.",
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action=f"round.{target.value}",
        entity_type="round",
        entity_id=record.id,
        before={"status": before.value},
        after={"status": target.value},
    )
    await session.commit()
    return RoundPublic.model_validate(record)


@router.post("/events/{event_id}/rounds/{round_id}/activate", response_model=RoundPublic)
async def activate_round(
    event_id: UUID,
    round_id: UUID,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> RoundPublic:
    return await transition_round(event_id, round_id, RoundStatus.LIVE, request, user, session)


@router.post("/events/{event_id}/rounds/{round_id}/close", response_model=RoundPublic)
async def close_round(
    event_id: UUID,
    round_id: UUID,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> RoundPublic:
    return await transition_round(event_id, round_id, RoundStatus.CLOSED, request, user, session)


@router.post("/events/{event_id}/panels", response_model=PanelView, status_code=201)
async def create_panel(
    event_id: UUID,
    payload: PanelCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> PanelView:
    await require_event(session, event_id)
    await require_event_role(session, user, event_id, LEADS)
    panel = JudgingPanel(event_id=event_id, name=payload.name.strip())
    session.add(panel)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="panel.create",
        entity_type="judging_panel",
        entity_id=panel.id,
        after={"name": panel.name},
    )
    await session.commit()
    return PanelView.model_validate(panel)


@router.post(
    "/events/{event_id}/panels/{panel_id}/members",
    response_model=PanelMemberView,
    status_code=201,
)
async def add_panel_member(
    event_id: UUID,
    panel_id: UUID,
    payload: PanelMemberCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> PanelMemberView:
    await require_event_role(session, user, event_id, LEADS)
    panel = await session.scalar(
        select(JudgingPanel).where(JudgingPanel.id == panel_id, JudgingPanel.event_id == event_id)
    )
    member_user = await session.get(StaffUser, payload.user_id)
    if panel is None:
        raise not_found("Panel")
    if member_user is None or not member_user.is_active:
        raise not_found("Active staff user")
    member = PanelMember(panel_id=panel.id, **payload.model_dump())
    session.add(member)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="panel_member.create",
        entity_type="panel_member",
        entity_id=member.id,
        after={"panel_id": str(panel.id), "user_id": str(payload.user_id)},
    )
    await session.commit()
    return PanelMemberView.model_validate(member)


async def load_evaluation_context(
    session: AsyncSession, event_id: UUID, evaluation_id: UUID
) -> tuple[Evaluation, Round, Team, JudgingPanel | None, Room | None]:
    row = (
        await session.execute(
            select(Evaluation, Round, Team, JudgingPanel, Room)
            .join(Round, Round.id == Evaluation.round_id)
            .join(Team, Team.id == Evaluation.team_id)
            .outerjoin(JudgingPanel, JudgingPanel.id == Evaluation.panel_id)
            .outerjoin(Room, Room.id == Evaluation.room_id)
            .where(Evaluation.id == evaluation_id, Round.event_id == event_id)
        )
    ).one_or_none()
    if row is None:
        raise not_found("Evaluation")
    return row


async def authorize_evaluation(
    session: AsyncSession,
    user: StaffUser,
    event_id: UUID,
    evaluation: Evaluation,
) -> None:
    roles = await require_event_role(session, user, event_id, EVALUATION_WRITERS)
    if roles.intersection({StaffRole.COORDINATOR, StaffRole.LEAD, StaffRole.ADMIN}):
        return
    if evaluation.panel_id is None:
        raise conflict(
            "PANEL_REQUIRED", "Assign a panel before an evaluator can update this evaluation."
        )
    membership = await session.scalar(
        select(PanelMember.id).where(
            PanelMember.panel_id == evaluation.panel_id, PanelMember.user_id == user.id
        )
    )
    if membership is None:
        from app.core.errors import APIError

        raise APIError(
            403,
            "PANEL_ACCESS_REQUIRED",
            "Panel access required",
            "You are not assigned to this panel.",
        )


def staff_evaluation_view(
    evaluation: Evaluation, team: Team, panel: JudgingPanel | None, room: Room | None
) -> EvaluationStaff:
    public = evaluation_public(evaluation, team, panel, room)
    return EvaluationStaff(**public.model_dump(), private_note=evaluation.private_note)


@router.post(
    "/events/{event_id}/rounds/{round_id}/evaluations",
    response_model=EvaluationStaff,
    status_code=201,
)
async def create_evaluation(
    event_id: UUID,
    round_id: UUID,
    payload: EvaluationCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    await require_event_role(session, user, event_id, COORDINATORS)
    round_record = await session.scalar(
        select(Round).where(Round.id == round_id, Round.event_id == event_id)
    )
    team = await session.scalar(
        select(Team).where(Team.id == payload.team_id, Team.event_id == event_id)
    )
    if round_record is None:
        raise not_found("Round")
    if team is None:
        raise not_found("Team")
    if team.registration_status.value == "withdrawn":
        raise conflict("TEAM_WITHDRAWN", "A withdrawn team cannot enter an evaluation queue.")
    panel = await session.get(JudgingPanel, payload.panel_id) if payload.panel_id else None
    room = await session.get(Room, payload.room_id) if payload.room_id else None
    if panel and panel.event_id != event_id:
        raise not_found("Panel")
    if room and room.event_id != event_id:
        raise not_found("Room")
    status = (
        EvaluationStatus.QUEUED
        if payload.panel_id and payload.queue_position
        else EvaluationStatus.UNASSIGNED
    )
    record = Evaluation(
        round_id=round_id, status=status, updated_by=user.id, **payload.model_dump()
    )
    session.add(record)
    await session.flush()
    add_activity(
        session,
        event_id=event_id,
        actor_user_id=user.id,
        team_id=team.id,
        room_id=payload.room_id,
        evaluation_id=record.id,
        event_type="evaluation_created",
        title="Evaluation scheduled",
        description=f"{team.name} entered the {round_record.name} queue.",
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="evaluation.create",
        entity_type="evaluation",
        entity_id=record.id,
        after={"status": status.value, "team_id": str(team.id)},
    )
    await session.commit()
    return staff_evaluation_view(record, team, panel, room)


TRANSITIONS = {
    "call": ({EvaluationStatus.QUEUED}, EvaluationStatus.CALLED),
    "start": ({EvaluationStatus.CALLED}, EvaluationStatus.IN_PROGRESS),
    "complete": ({EvaluationStatus.IN_PROGRESS}, EvaluationStatus.COMPLETED),
    "no-show": ({EvaluationStatus.CALLED, EvaluationStatus.IN_PROGRESS}, EvaluationStatus.NO_SHOW),
    "cancel": (
        {EvaluationStatus.UNASSIGNED, EvaluationStatus.QUEUED, EvaluationStatus.CALLED},
        EvaluationStatus.CANCELLED,
    ),
}


async def transition_evaluation(
    event_id: UUID,
    evaluation_id: UUID,
    action: str,
    payload: EvaluationTransition,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    if action not in TRANSITIONS:
        raise not_found("Evaluation action")
    evaluation, round_record, team, panel, room = await load_evaluation_context(
        session, event_id, evaluation_id
    )
    await authorize_evaluation(session, user, event_id, evaluation)
    if action != "cancel" and round_record.status != RoundStatus.LIVE:
        raise conflict(
            "ROUND_NOT_LIVE",
            "Evaluation actions are available only while the round is live.",
        )
    if evaluation.version != payload.expected_version:
        raise conflict("STALE_VERSION", "The evaluation changed. Refresh and retry.")
    allowed_from, target = TRANSITIONS[action]
    if evaluation.status not in allowed_from:
        raise conflict(
            "INVALID_EVALUATION_TRANSITION",
            f"Cannot {action} an evaluation in {evaluation.status.value} state.",
        )
    before = evaluation.status
    now = datetime.now(UTC)
    evaluation.status = target
    evaluation.version += 1
    evaluation.updated_by = user.id
    if payload.public_note is not None:
        evaluation.public_note = payload.public_note
    if payload.private_note is not None:
        evaluation.private_note = payload.private_note
    if target == EvaluationStatus.CALLED:
        evaluation.called_at = now
    elif target == EvaluationStatus.IN_PROGRESS:
        evaluation.started_at = now
    elif target == EvaluationStatus.COMPLETED:
        evaluation.completed_at = now
    add_activity(
        session,
        event_id=event_id,
        actor_user_id=user.id,
        team_id=team.id,
        room_id=evaluation.room_id,
        evaluation_id=evaluation.id,
        event_type=f"evaluation_{target.value}",
        title=f"Evaluation {target.value.replace('_', ' ')}",
        description=f"{team.name} is now {target.value.replace('_', ' ')} for {round_record.name}.",
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action=f"evaluation.{action}",
        entity_type="evaluation",
        entity_id=evaluation.id,
        before={"status": before.value, "version": payload.expected_version},
        after={"status": target.value, "version": evaluation.version},
    )
    await session.commit()
    return staff_evaluation_view(evaluation, team, panel, room)


@router.post("/events/{event_id}/evaluations/{evaluation_id}/call", response_model=EvaluationStaff)
async def call_evaluation(
    event_id: UUID,
    evaluation_id: UUID,
    payload: EvaluationTransition,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    return await transition_evaluation(
        event_id, evaluation_id, "call", payload, request, user, session
    )


@router.post("/events/{event_id}/evaluations/{evaluation_id}/start", response_model=EvaluationStaff)
async def start_evaluation(
    event_id: UUID,
    evaluation_id: UUID,
    payload: EvaluationTransition,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    return await transition_evaluation(
        event_id, evaluation_id, "start", payload, request, user, session
    )


@router.post(
    "/events/{event_id}/evaluations/{evaluation_id}/complete", response_model=EvaluationStaff
)
async def complete_evaluation(
    event_id: UUID,
    evaluation_id: UUID,
    payload: EvaluationTransition,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    return await transition_evaluation(
        event_id, evaluation_id, "complete", payload, request, user, session
    )


@router.post(
    "/events/{event_id}/evaluations/{evaluation_id}/no-show", response_model=EvaluationStaff
)
async def no_show_evaluation(
    event_id: UUID,
    evaluation_id: UUID,
    payload: EvaluationTransition,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    return await transition_evaluation(
        event_id, evaluation_id, "no-show", payload, request, user, session
    )


@router.post(
    "/events/{event_id}/evaluations/{evaluation_id}/cancel", response_model=EvaluationStaff
)
async def cancel_evaluation(
    event_id: UUID,
    evaluation_id: UUID,
    payload: EvaluationTransition,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> EvaluationStaff:
    return await transition_evaluation(
        event_id, evaluation_id, "cancel", payload, request, user, session
    )


@router.post("/events/{event_id}/announcements", response_model=AnnouncementStaff, status_code=201)
async def create_announcement(
    event_id: UUID,
    payload: AnnouncementCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> AnnouncementStaff:
    await require_event(session, event_id)
    await require_event_role(session, user, event_id, LEADS)
    values = payload.model_dump(exclude={"publish_now"})
    record = Announcement(
        event_id=event_id,
        published_at=datetime.now(UTC) if payload.publish_now else None,
        published_by=user.id if payload.publish_now else None,
        **values,
    )
    session.add(record)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="announcement.create",
        entity_type="announcement",
        entity_id=record.id,
        after={"title": record.title, "published": payload.publish_now},
    )
    if payload.publish_now:
        add_activity(
            session,
            event_id=event_id,
            actor_user_id=user.id,
            event_type="announcement_published",
            title="Announcement",
            description=record.title,
            visibility=ActivityVisibility.PUBLIC,
        )
    await session.commit()
    return AnnouncementStaff.model_validate(record)


@router.patch(
    "/events/{event_id}/announcements/{announcement_id}", response_model=AnnouncementStaff
)
async def update_announcement(
    event_id: UUID,
    announcement_id: UUID,
    payload: AnnouncementUpdate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> AnnouncementStaff:
    await require_event_role(session, user, event_id, LEADS)
    record = await session.scalar(
        select(Announcement).where(
            Announcement.id == announcement_id, Announcement.event_id == event_id
        )
    )
    if record is None:
        raise not_found("Announcement")
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(record, field, value)
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="announcement.update",
        entity_type="announcement",
        entity_id=record.id,
        after={key: str(value) for key, value in changes.items()},
    )
    await session.commit()
    return AnnouncementStaff.model_validate(record)


@router.post(
    "/events/{event_id}/announcements/{announcement_id}/publish", response_model=AnnouncementStaff
)
async def publish_announcement(
    event_id: UUID,
    announcement_id: UUID,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> AnnouncementStaff:
    await require_event_role(session, user, event_id, LEADS)
    record = await session.scalar(
        select(Announcement).where(
            Announcement.id == announcement_id, Announcement.event_id == event_id
        )
    )
    if record is None:
        raise not_found("Announcement")
    if record.published_at is None:
        record.published_at = datetime.now(UTC)
        record.published_by = user.id
        add_activity(
            session,
            event_id=event_id,
            actor_user_id=user.id,
            event_type="announcement_published",
            title="Announcement",
            description=record.title,
        )
        add_audit(
            session,
            request,
            event_id=event_id,
            actor_user_id=user.id,
            action="announcement.publish",
            entity_type="announcement",
            entity_id=record.id,
            after={"published_at": record.published_at.isoformat()},
        )
        await session.commit()
    return AnnouncementStaff.model_validate(record)
