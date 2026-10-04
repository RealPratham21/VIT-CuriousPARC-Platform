from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import current_user, db_session, require_event_role
from app.core.errors import conflict, not_found
from app.models.enums import AttendanceStatus, RegistrationStatus, StaffRole
from app.models.event import Event, Track
from app.models.room import Room, TeamRoomAssignment
from app.models.staff import StaffUser
from app.models.team import Attendance, Team, TeamMember
from app.schemas.contracts import (
    AttendanceMutation,
    MemberCreate,
    MemberStaff,
    MemberUpdate,
    RoomAssignmentCreate,
    TeamCreate,
    TeamStaff,
    TeamUpdate,
)
from app.services.audit import add_activity, add_audit
from app.services.staff_views import staff_team_view

router = APIRouter()

TEAM_WRITERS = {StaffRole.COORDINATOR, StaffRole.LEAD}
CHECKIN_WRITERS = {StaffRole.CHECKIN_VOLUNTEER, StaffRole.COORDINATOR, StaffRole.LEAD}


async def event_record(session: AsyncSession, event_id: UUID) -> Event:
    event = await session.get(Event, event_id)
    if event is None:
        raise not_found("Event")
    return event


async def team_record(session: AsyncSession, event_id: UUID, team_id: UUID) -> Team:
    team = await session.scalar(select(Team).where(Team.id == team_id, Team.event_id == event_id))
    if team is None:
        raise not_found("Team")
    return team


@router.get("/events/{event_id}/teams/{team_id}", response_model=TeamStaff)
async def get_team_staff(
    event_id: UUID,
    team_id: UUID,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> TeamStaff:
    await event_record(session, event_id)
    await require_event_role(session, user, event_id, set(StaffRole))
    return await staff_team_view(session, await team_record(session, event_id, team_id))


@router.post("/events/{event_id}/teams", response_model=TeamStaff, status_code=201)
async def create_team(
    event_id: UUID,
    payload: TeamCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> TeamStaff:
    await event_record(session, event_id)
    await require_event_role(session, user, event_id, TEAM_WRITERS)
    track = await session.scalar(
        select(Track).where(Track.id == payload.track_id, Track.event_id == event_id)
    )
    if track is None:
        raise not_found("Track")
    existing = await session.scalar(
        select(Team.id).where(
            Team.event_id == event_id, Team.team_code == payload.team_code.strip()
        )
    )
    if existing:
        raise conflict("TEAM_CODE_EXISTS", "That team code is already in use for this event.")
    team = Team(
        event_id=event_id,
        team_code=payload.team_code.strip(),
        name=payload.name.strip(),
        track_id=payload.track_id,
        registration_status=RegistrationStatus.REGISTERED,
        expected_member_count=payload.expected_member_count,
        created_by=user.id,
        updated_by=user.id,
    )
    session.add(team)
    await session.flush()
    session.add(
        TeamMember(
            team_id=team.id,
            full_name=payload.leader_name.strip(),
            phone_e164=payload.leader_phone_e164,
            email=payload.leader_email,
            is_leader=True,
        )
    )
    add_activity(
        session,
        event_id=event_id,
        actor_user_id=user.id,
        team_id=team.id,
        event_type="team_registered",
        title="Team registered",
        description=f"{team.name} was registered.",
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="team.create",
        entity_type="team",
        entity_id=team.id,
        after={"team_code": team.team_code, "name": team.name},
    )
    await session.commit()
    return await staff_team_view(session, team)


@router.patch("/events/{event_id}/teams/{team_id}", response_model=TeamStaff)
async def update_team(
    event_id: UUID,
    team_id: UUID,
    payload: TeamUpdate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> TeamStaff:
    await require_event_role(session, user, event_id, TEAM_WRITERS)
    team = await team_record(session, event_id, team_id)
    if team.version != payload.expected_version:
        raise conflict("STALE_VERSION", "The team was changed by another user. Refresh and retry.")
    before = {
        "name": team.name,
        "track_id": str(team.track_id),
        "status": team.registration_status.value,
    }
    changes = payload.model_dump(exclude_unset=True, exclude={"expected_version"})
    if "track_id" in changes:
        track = await session.scalar(
            select(Track.id).where(Track.id == changes["track_id"], Track.event_id == event_id)
        )
        if track is None:
            raise not_found("Track")
    for field, value in changes.items():
        setattr(team, field, value)
    team.updated_by = user.id
    team.version += 1
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="team.update",
        entity_type="team",
        entity_id=team.id,
        before=before,
        after={"version": team.version, **{key: str(value) for key, value in changes.items()}},
    )
    await session.commit()
    return await staff_team_view(session, team)


@router.post(
    "/events/{event_id}/teams/{team_id}/members", response_model=MemberStaff, status_code=201
)
async def add_member(
    event_id: UUID,
    team_id: UUID,
    payload: MemberCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MemberStaff:
    await require_event_role(session, user, event_id, TEAM_WRITERS)
    team = await team_record(session, event_id, team_id)
    if payload.is_leader:
        current_leader = await session.scalar(
            select(TeamMember).where(
                TeamMember.team_id == team.id,
                TeamMember.is_leader.is_(True),
                TeamMember.is_active.is_(True),
            )
        )
        if current_leader:
            current_leader.is_leader = False
    member = TeamMember(team_id=team.id, **payload.model_dump())
    session.add(member)
    await session.flush()
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="team_member.create",
        entity_type="team_member",
        entity_id=member.id,
        after={"full_name": member.full_name, "team_id": str(team.id)},
    )
    await session.commit()
    return MemberStaff(
        **payload.model_dump(),
        id=member.id,
        is_active=True,
        attendance_status=AttendanceStatus.NOT_CHECKED_IN,
    )


@router.patch("/events/{event_id}/members/{member_id}", response_model=MemberStaff)
async def update_member(
    event_id: UUID,
    member_id: UUID,
    payload: MemberUpdate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MemberStaff:
    await require_event_role(session, user, event_id, TEAM_WRITERS)
    member = await session.scalar(
        select(TeamMember).join(Team).where(TeamMember.id == member_id, Team.event_id == event_id)
    )
    if member is None:
        raise not_found("Team member")
    changes = payload.model_dump(exclude_unset=True)
    removes_current_leader = member.is_leader and (
        changes.get("is_leader") is False or changes.get("is_active") is False
    )
    if removes_current_leader:
        raise conflict(
            "ACTIVE_LEADER_REQUIRED",
            "Assign another active member as leader before changing this leader.",
        )
    if changes.get("is_leader") is True:
        current = await session.scalar(
            select(TeamMember).where(
                TeamMember.team_id == member.team_id,
                TeamMember.is_leader.is_(True),
                TeamMember.is_active.is_(True),
                TeamMember.id != member.id,
            )
        )
        if current:
            current.is_leader = False
    for field, value in changes.items():
        setattr(member, field, value)
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="team_member.update",
        entity_type="team_member",
        entity_id=member.id,
        after={key: str(value) for key, value in changes.items()},
    )
    await session.commit()
    attendance = await session.scalar(
        select(Attendance).where(Attendance.team_member_id == member.id)
    )
    return MemberStaff(
        id=member.id,
        full_name=member.full_name,
        phone_e164=member.phone_e164,
        email=member.email,
        is_leader=member.is_leader,
        is_active=member.is_active,
        attendance_status=attendance.status if attendance else AttendanceStatus.NOT_CHECKED_IN,
    )


@router.put("/events/{event_id}/members/{member_id}/check-in", response_model=MemberStaff)
async def check_in_member(
    event_id: UUID,
    member_id: UUID,
    payload: AttendanceMutation,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MemberStaff:
    await require_event_role(session, user, event_id, CHECKIN_WRITERS)
    member = await session.scalar(
        select(TeamMember)
        .join(Team)
        .where(
            TeamMember.id == member_id, Team.event_id == event_id, TeamMember.is_active.is_(True)
        )
    )
    if member is None:
        raise not_found("Active team member")
    attendance = await session.scalar(
        select(Attendance).where(
            Attendance.event_id == event_id, Attendance.team_member_id == member.id
        )
    )
    now = datetime.now(UTC)
    if attendance is None:
        attendance = Attendance(
            event_id=event_id,
            team_member_id=member.id,
            status=AttendanceStatus.CHECKED_IN,
            checked_in_at=now,
            checked_in_by=user.id,
        )
        session.add(attendance)
    elif attendance.status == AttendanceStatus.CHECKED_IN:
        return MemberStaff(
            id=member.id,
            full_name=member.full_name,
            phone_e164=member.phone_e164,
            email=member.email,
            is_leader=member.is_leader,
            is_active=member.is_active,
            attendance_status=AttendanceStatus.CHECKED_IN,
        )
    elif attendance.status != AttendanceStatus.CHECKED_IN:
        if payload.expected_version and payload.expected_version != attendance.version:
            raise conflict("STALE_VERSION", "Attendance changed. Refresh and retry.")
        attendance.status = AttendanceStatus.CHECKED_IN
        attendance.checked_in_at = now
        attendance.checked_in_by = user.id
        attendance.revoked_at = None
        attendance.revoked_by = None
        attendance.version += 1
    add_activity(
        session,
        event_id=event_id,
        actor_user_id=user.id,
        team_id=member.team_id,
        event_type="member_checked_in",
        title="Team member checked in",
        description="A member of the team checked in at the venue.",
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="attendance.check_in",
        entity_type="team_member",
        entity_id=member.id,
        after={"status": AttendanceStatus.CHECKED_IN.value},
    )
    await session.commit()
    return MemberStaff(
        id=member.id,
        full_name=member.full_name,
        phone_e164=member.phone_e164,
        email=member.email,
        is_leader=member.is_leader,
        is_active=member.is_active,
        attendance_status=AttendanceStatus.CHECKED_IN,
    )


@router.delete("/events/{event_id}/members/{member_id}/check-in", response_model=MemberStaff)
async def revoke_check_in(
    event_id: UUID,
    member_id: UUID,
    payload: AttendanceMutation,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> MemberStaff:
    await require_event_role(session, user, event_id, CHECKIN_WRITERS)
    member = await session.scalar(
        select(TeamMember).join(Team).where(TeamMember.id == member_id, Team.event_id == event_id)
    )
    if member is None:
        raise not_found("Team member")
    attendance = await session.scalar(
        select(Attendance).where(
            Attendance.event_id == event_id, Attendance.team_member_id == member.id
        )
    )
    if attendance is None or attendance.status == AttendanceStatus.NOT_CHECKED_IN:
        return MemberStaff(
            id=member.id,
            full_name=member.full_name,
            phone_e164=member.phone_e164,
            email=member.email,
            is_leader=member.is_leader,
            is_active=member.is_active,
            attendance_status=AttendanceStatus.NOT_CHECKED_IN,
        )
    if payload.expected_version and payload.expected_version != attendance.version:
        raise conflict("STALE_VERSION", "Attendance changed. Refresh and retry.")
    attendance.status = AttendanceStatus.NOT_CHECKED_IN
    attendance.revoked_at = datetime.now(UTC)
    attendance.revoked_by = user.id
    attendance.version += 1
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="attendance.revoke",
        entity_type="team_member",
        entity_id=member.id,
        after={"status": AttendanceStatus.NOT_CHECKED_IN.value},
    )
    await session.commit()
    return MemberStaff(
        id=member.id,
        full_name=member.full_name,
        phone_e164=member.phone_e164,
        email=member.email,
        is_leader=member.is_leader,
        is_active=member.is_active,
        attendance_status=AttendanceStatus.NOT_CHECKED_IN,
    )


@router.post("/events/{event_id}/teams/{team_id}/room-assignment", response_model=TeamStaff)
async def assign_team_room(
    event_id: UUID,
    team_id: UUID,
    payload: RoomAssignmentCreate,
    request: Request,
    user: StaffUser = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> TeamStaff:
    await require_event_role(session, user, event_id, TEAM_WRITERS)
    team = await team_record(session, event_id, team_id)
    room = await session.scalar(
        select(Room).where(
            Room.id == payload.room_id, Room.event_id == event_id, Room.is_active.is_(True)
        )
    )
    if room is None:
        raise not_found("Active room")
    current = await session.scalar(
        select(TeamRoomAssignment).where(
            TeamRoomAssignment.team_id == team.id, TeamRoomAssignment.ended_at.is_(None)
        )
    )
    if current and current.room_id == room.id:
        return await staff_team_view(session, team)
    if current:
        current.ended_at = datetime.now(UTC)
    assignment = TeamRoomAssignment(
        team_id=team.id,
        room_id=room.id,
        assigned_by=user.id,
        reason=payload.reason,
    )
    session.add(assignment)
    await session.flush()
    add_activity(
        session,
        event_id=event_id,
        actor_user_id=user.id,
        team_id=team.id,
        room_id=room.id,
        event_type="room_assigned",
        title="Room assignment updated",
        description=f"{team.name} was assigned to room {room.code}.",
    )
    add_audit(
        session,
        request,
        event_id=event_id,
        actor_user_id=user.id,
        action="team_room.assign",
        entity_type="team_room_assignment",
        entity_id=assignment.id,
        after={"team_id": str(team.id), "room_id": str(room.id)},
    )
    await session.commit()
    return await staff_team_view(session, team)
