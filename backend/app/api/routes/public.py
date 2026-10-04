from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import db_session
from app.core.errors import not_found
from app.models.activity import ActivityEvent, Announcement
from app.models.enums import (
    ActivityVisibility,
    AnnouncementAudience,
    EvaluationStatus,
    RegistrationStatus,
    RoomDutyRole,
    RoundStatus,
)
from app.models.evaluation import Evaluation, JudgingPanel, Round
from app.models.event import Event, Track
from app.models.room import Room, RoomStaffAssignment, TeamRoomAssignment
from app.models.staff import EventStaffRole, StaffUser
from app.models.team import Team
from app.schemas.contracts import (
    ActivityPublic,
    AnnouncementPublic,
    DashboardPublic,
    EvaluationPublic,
    EventPublic,
    OfficialPublic,
    Page,
    RoomDetailPublic,
    RoomRef,
    RoomSummaryPublic,
    RoundPublic,
    TeamDetailPublic,
    TeamSummaryPublic,
    TrackPublic,
)
from app.services.read_models import build_team_summaries, evaluation_public, room_needs_attention

router = APIRouter()


async def event_by_slug(session: AsyncSession, slug: str) -> Event:
    event = await session.scalar(select(Event).where(Event.slug == slug))
    if event is None:
        raise not_found("Event")
    return event


@router.get("", response_model=EventPublic)
async def get_event(slug: str, session: AsyncSession = Depends(db_session)) -> EventPublic:
    return EventPublic.model_validate(await event_by_slug(session, slug))


@router.get("/tracks", response_model=list[TrackPublic])
async def list_tracks(slug: str, session: AsyncSession = Depends(db_session)) -> list[TrackPublic]:
    event = await event_by_slug(session, slug)
    tracks = (
        await session.scalars(
            select(Track)
            .where(Track.event_id == event.id, Track.is_active.is_(True))
            .order_by(Track.code)
        )
    ).all()
    return [TrackPublic.model_validate(track) for track in tracks]


@router.get("/teams", response_model=Page[TeamSummaryPublic])
async def list_teams(
    slug: str,
    q: str | None = None,
    evaluation_status: EvaluationStatus | None = None,
    track_id: UUID | None = None,
    room_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
) -> Page[TeamSummaryPublic]:
    event = await event_by_slug(session, slug)
    statement = select(Team).where(
        Team.event_id == event.id,
        Team.registration_status == RegistrationStatus.REGISTERED,
    )
    if q:
        pattern = f"%{q.strip()}%"
        statement = statement.where(or_(Team.team_code.ilike(pattern), Team.name.ilike(pattern)))
    if track_id:
        statement = statement.where(Team.track_id == track_id)
    if room_id:
        statement = statement.join(TeamRoomAssignment).where(
            TeamRoomAssignment.room_id == room_id, TeamRoomAssignment.ended_at.is_(None)
        )
    if evaluation_status:
        statement = (
            statement.join(Evaluation)
            .join(Round)
            .where(Round.status == RoundStatus.LIVE, Evaluation.status == evaluation_status)
        )
    total = await session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    teams = (
        await session.scalars(
            statement.order_by(Team.team_code).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()
    return Page(
        items=await build_team_summaries(session, list(teams)),
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/teams/{team_id}", response_model=TeamDetailPublic)
async def get_team(
    slug: str, team_id: UUID, session: AsyncSession = Depends(db_session)
) -> TeamDetailPublic:
    event = await event_by_slug(session, slug)
    team = await session.scalar(
        select(Team).where(
            Team.id == team_id,
            Team.event_id == event.id,
            Team.registration_status == RegistrationStatus.REGISTERED,
        )
    )
    if team is None:
        raise not_found("Team")
    summary = (await build_team_summaries(session, [team]))[0]
    activity = (
        await session.scalars(
            select(ActivityEvent)
            .where(
                ActivityEvent.team_id == team.id,
                ActivityEvent.visibility == ActivityVisibility.PUBLIC,
            )
            .order_by(ActivityEvent.created_at.desc())
            .limit(100)
        )
    ).all()
    return TeamDetailPublic(
        **summary.model_dump(),
        timeline=[
            ActivityPublic(
                id=item.id,
                event_type=item.event_type,
                title=item.title,
                description=item.public_description,
                created_at=item.created_at,
            )
            for item in activity
        ],
    )


async def officials_for_event(session: AsyncSession, event: Event) -> list[OfficialPublic]:
    role_rows = (
        await session.execute(
            select(StaffUser, EventStaffRole.role)
            .join(EventStaffRole, EventStaffRole.user_id == StaffUser.id)
            .where(EventStaffRole.event_id == event.id, StaffUser.is_active.is_(True))
            .order_by(StaffUser.full_name)
        )
    ).all()
    grouped: dict[UUID, tuple[StaffUser, list]] = {}
    for user, role in role_rows:
        grouped.setdefault(user.id, (user, []))[1].append(role)
    now = datetime.now(UTC)
    assignment_rows = (
        await session.execute(
            select(RoomStaffAssignment.user_id, Room)
            .join(Room, Room.id == RoomStaffAssignment.room_id)
            .where(
                Room.event_id == event.id,
                RoomStaffAssignment.starts_at <= now,
                or_(RoomStaffAssignment.ends_at.is_(None), RoomStaffAssignment.ends_at > now),
            )
        )
    ).all()
    room_map: dict[UUID, list[RoomRef]] = {}
    for user_id, room in assignment_rows:
        room_map.setdefault(user_id, []).append(RoomRef.model_validate(room))
    results = []
    for user_id, (user, roles) in grouped.items():
        rooms = room_map.get(user_id, [])
        managed = 0
        if rooms:
            managed = (
                await session.scalar(
                    select(func.count(TeamRoomAssignment.id)).where(
                        TeamRoomAssignment.room_id.in_([room.id for room in rooms]),
                        TeamRoomAssignment.ended_at.is_(None),
                    )
                )
                or 0
            )
        results.append(
            OfficialPublic(
                id=user.id,
                full_name=user.full_name,
                roles=roles,
                rooms=rooms,
                managed_team_count=managed,
            )
        )
    return results


@router.get("/officials", response_model=list[OfficialPublic])
async def list_officials(
    slug: str, session: AsyncSession = Depends(db_session)
) -> list[OfficialPublic]:
    return await officials_for_event(session, await event_by_slug(session, slug))


async def build_room_summaries(
    session: AsyncSession, event: Event, rooms: list[Room]
) -> list[RoomSummaryPublic]:
    teams = list(
        (
            await session.scalars(
                select(Team).where(
                    Team.event_id == event.id,
                    Team.registration_status == RegistrationStatus.REGISTERED,
                )
            )
        ).all()
    )
    summaries = await build_team_summaries(session, teams)
    by_room: dict[UUID, list[TeamSummaryPublic]] = {}
    for item in summaries:
        if item.room:
            by_room.setdefault(item.room.id, []).append(item)
    officials = await officials_for_event(session, event)
    volunteer_by_room: dict[UUID, OfficialPublic] = {}
    coordinator_by_room: dict[UUID, OfficialPublic] = {}
    now = datetime.now(UTC)
    duty_rows = (
        (
            await session.execute(
                select(
                    RoomStaffAssignment.room_id,
                    RoomStaffAssignment.user_id,
                    RoomStaffAssignment.duty_role,
                ).where(
                    RoomStaffAssignment.room_id.in_([room.id for room in rooms]),
                    RoomStaffAssignment.starts_at <= now,
                    or_(RoomStaffAssignment.ends_at.is_(None), RoomStaffAssignment.ends_at > now),
                )
            )
        ).all()
        if rooms
        else []
    )
    official_map = {official.id: official for official in officials}
    for room_id, user_id, duty in duty_rows:
        official = official_map.get(user_id)
        if official and duty == RoomDutyRole.VOLUNTEER:
            volunteer_by_room[room_id] = official
        elif official:
            coordinator_by_room[room_id] = official
    results = []
    for room in rooms:
        allocated = by_room.get(room.id, [])
        volunteer = volunteer_by_room.get(room.id)
        coordinator = coordinator_by_room.get(room.id)
        results.append(
            RoomSummaryPublic(
                id=room.id,
                code=room.code,
                floor=room.floor,
                capacity=room.capacity,
                allocated_teams=len(allocated),
                checked_in_teams=sum(item.attendance.status == "checked_in" for item in allocated),
                volunteer=volunteer,
                coordinator=coordinator,
                coverage="covered" if volunteer and coordinator else "needs_attention",
            )
        )
    return results


@router.get("/rooms", response_model=list[RoomSummaryPublic])
async def list_rooms(
    slug: str, session: AsyncSession = Depends(db_session)
) -> list[RoomSummaryPublic]:
    event = await event_by_slug(session, slug)
    rooms = list(
        (
            await session.scalars(
                select(Room)
                .where(Room.event_id == event.id, Room.is_active.is_(True))
                .order_by(Room.code)
            )
        ).all()
    )
    return await build_room_summaries(session, event, rooms)


@router.get("/rooms/{room_id}", response_model=RoomDetailPublic)
async def get_room(
    slug: str, room_id: UUID, session: AsyncSession = Depends(db_session)
) -> RoomDetailPublic:
    event = await event_by_slug(session, slug)
    room = await session.scalar(select(Room).where(Room.id == room_id, Room.event_id == event.id))
    if room is None:
        raise not_found("Room")
    summary = (await build_room_summaries(session, event, [room]))[0]
    teams = list(
        (
            await session.scalars(
                select(Team)
                .join(TeamRoomAssignment)
                .where(
                    TeamRoomAssignment.room_id == room.id,
                    TeamRoomAssignment.ended_at.is_(None),
                    Team.registration_status == RegistrationStatus.REGISTERED,
                )
                .order_by(Team.team_code)
            )
        ).all()
    )
    return RoomDetailPublic(
        **summary.model_dump(), teams=await build_team_summaries(session, teams)
    )


@router.get("/rounds/current", response_model=RoundPublic | None)
async def current_round(
    slug: str, session: AsyncSession = Depends(db_session)
) -> RoundPublic | None:
    event = await event_by_slug(session, slug)
    round_record = await session.scalar(
        select(Round).where(Round.event_id == event.id, Round.status == RoundStatus.LIVE)
    )
    return RoundPublic.model_validate(round_record) if round_record else None


@router.get("/rounds/{round_id}/evaluations", response_model=Page[EvaluationPublic])
async def list_evaluations(
    slug: str,
    round_id: UUID,
    status: EvaluationStatus | None = None,
    panel_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(db_session),
) -> Page[EvaluationPublic]:
    event = await event_by_slug(session, slug)
    round_record = await session.scalar(
        select(Round).where(Round.id == round_id, Round.event_id == event.id)
    )
    if round_record is None:
        raise not_found("Round")
    statement = (
        select(Evaluation, Team, JudgingPanel, Room)
        .join(Team, Team.id == Evaluation.team_id)
        .outerjoin(JudgingPanel, JudgingPanel.id == Evaluation.panel_id)
        .outerjoin(Room, Room.id == Evaluation.room_id)
        .where(Evaluation.round_id == round_id)
    )
    if status:
        statement = statement.where(Evaluation.status == status)
    if panel_id:
        statement = statement.where(Evaluation.panel_id == panel_id)
    total = await session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = (
        await session.execute(
            statement.order_by(Evaluation.queue_position.nulls_last(), Team.team_code)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return Page(
        items=[evaluation_public(*row) for row in rows],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/announcements", response_model=list[AnnouncementPublic])
async def list_announcements(
    slug: str, session: AsyncSession = Depends(db_session)
) -> list[AnnouncementPublic]:
    event = await event_by_slug(session, slug)
    now = datetime.now(UTC)
    records = (
        await session.scalars(
            select(Announcement)
            .where(
                Announcement.event_id == event.id,
                Announcement.audience.in_([AnnouncementAudience.PUBLIC, AnnouncementAudience.ALL]),
                Announcement.published_at.is_not(None),
                Announcement.published_at <= now,
                or_(Announcement.expires_at.is_(None), Announcement.expires_at > now),
            )
            .order_by(Announcement.published_at.desc())
        )
    ).all()
    return [AnnouncementPublic.model_validate(record) for record in records]


@router.get("/dashboard", response_model=DashboardPublic)
async def dashboard(slug: str, session: AsyncSession = Depends(db_session)) -> DashboardPublic:
    event = await event_by_slug(session, slug)
    teams = list(
        (
            await session.scalars(
                select(Team).where(
                    Team.event_id == event.id,
                    Team.registration_status == RegistrationStatus.REGISTERED,
                )
            )
        ).all()
    )
    summaries = await build_team_summaries(session, teams)
    round_record = await session.scalar(
        select(Round).where(Round.event_id == event.id, Round.status == RoundStatus.LIVE)
    )
    evaluations: list[EvaluationPublic] = []
    if round_record:
        rows = (
            await session.execute(
                select(Evaluation, Team, JudgingPanel, Room)
                .join(Team, Team.id == Evaluation.team_id)
                .outerjoin(JudgingPanel, JudgingPanel.id == Evaluation.panel_id)
                .outerjoin(Room, Room.id == Evaluation.room_id)
                .where(Evaluation.round_id == round_record.id)
            )
        ).all()
        evaluations = [evaluation_public(*row) for row in rows]
    rooms = (
        await session.scalars(
            select(Room).where(Room.event_id == event.id, Room.is_active.is_(True))
        )
    ).all()
    needs_attention = sum([await room_needs_attention(session, room.id) for room in rooms])
    activity = (
        await session.scalars(
            select(ActivityEvent)
            .where(
                ActivityEvent.event_id == event.id,
                ActivityEvent.visibility == ActivityVisibility.PUBLIC,
            )
            .order_by(ActivityEvent.created_at.desc())
            .limit(10)
        )
    ).all()
    announcements = await list_announcements(slug, session)
    completed = sum(item.status == EvaluationStatus.COMPLETED for item in evaluations)
    eligible = len(teams)
    return DashboardPublic(
        registered_teams=eligible,
        checked_in_teams=sum(item.attendance.status == "checked_in" for item in summaries),
        awaiting_evaluation=sum(
            item.status in {EvaluationStatus.QUEUED, EvaluationStatus.CALLED}
            for item in evaluations
        ),
        under_evaluation=sum(item.status == EvaluationStatus.IN_PROGRESS for item in evaluations),
        evaluated=completed,
        rooms_needing_attention=needs_attention,
        evaluation_progress_percent=round(completed / eligible * 100) if eligible else 0,
        current_round=RoundPublic.model_validate(round_record) if round_record else None,
        live_evaluations=[
            item for item in evaluations if item.status == EvaluationStatus.IN_PROGRESS
        ],
        recent_activity=[
            ActivityPublic(
                id=item.id,
                event_type=item.event_type,
                title=item.title,
                description=item.public_description,
                created_at=item.created_at,
            )
            for item in activity
        ],
        latest_announcement=announcements[0] if announcements else None,
        generated_at=datetime.now(UTC),
    )
