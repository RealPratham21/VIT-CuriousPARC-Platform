from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AttendanceStatus, RoundStatus
from app.models.evaluation import Evaluation, JudgingPanel, Round
from app.models.event import Track
from app.models.room import Room, TeamRoomAssignment
from app.models.team import Attendance, Team, TeamMember
from app.schemas.contracts import (
    AttendanceSummary,
    EvaluationPublic,
    EvaluationSummary,
    PanelRef,
    RoomRef,
    TeamSummaryPublic,
    TrackPublic,
)


def attendance_summary(checked_in: int, expected: int) -> AttendanceSummary:
    if checked_in == 0:
        status = "not_arrived"
    elif expected > 0 and checked_in >= expected:
        status = "checked_in"
    else:
        status = "partial"
    return AttendanceSummary(status=status, checked_in=checked_in, expected=expected)


async def build_team_summaries(session: AsyncSession, teams: list[Team]) -> list[TeamSummaryPublic]:
    if not teams:
        return []
    team_ids = [team.id for team in teams]
    track_ids = {team.track_id for team in teams}

    tracks = {
        track.id: track
        for track in (await session.scalars(select(Track).where(Track.id.in_(track_ids)))).all()
    }
    member_counts = dict(
        (
            await session.execute(
                select(TeamMember.team_id, func.count(TeamMember.id))
                .where(TeamMember.team_id.in_(team_ids), TeamMember.is_active.is_(True))
                .group_by(TeamMember.team_id)
            )
        ).all()
    )
    checked_counts = dict(
        (
            await session.execute(
                select(TeamMember.team_id, func.count(Attendance.id))
                .join(Attendance, Attendance.team_member_id == TeamMember.id)
                .where(
                    TeamMember.team_id.in_(team_ids),
                    TeamMember.is_active.is_(True),
                    Attendance.status == AttendanceStatus.CHECKED_IN,
                )
                .group_by(TeamMember.team_id)
            )
        ).all()
    )
    room_rows = (
        await session.execute(
            select(TeamRoomAssignment.team_id, Room)
            .join(Room, Room.id == TeamRoomAssignment.room_id)
            .where(
                TeamRoomAssignment.team_id.in_(team_ids),
                TeamRoomAssignment.ended_at.is_(None),
            )
        )
    ).all()
    rooms = {team_id: room for team_id, room in room_rows}

    evaluation_rows = (
        await session.execute(
            select(Evaluation, JudgingPanel, Room)
            .join(Round, Round.id == Evaluation.round_id)
            .outerjoin(JudgingPanel, JudgingPanel.id == Evaluation.panel_id)
            .outerjoin(Room, Room.id == Evaluation.room_id)
            .where(Evaluation.team_id.in_(team_ids), Round.status == RoundStatus.LIVE)
        )
    ).all()
    evaluations = {
        evaluation.team_id: (evaluation, panel, room) for evaluation, panel, room in evaluation_rows
    }

    items: list[TeamSummaryPublic] = []
    for team in teams:
        track = tracks[team.track_id]
        active_members = member_counts.get(team.id, 0)
        expected = team.expected_member_count or active_members
        room = rooms.get(team.id)
        evaluation_data = evaluations.get(team.id)
        evaluation = None
        if evaluation_data:
            record, panel, evaluation_room = evaluation_data
            evaluation = EvaluationSummary(
                id=record.id,
                status=record.status,
                queue_position=record.queue_position,
                panel=PanelRef(id=panel.id, name=panel.name) if panel else None,
                room=(
                    RoomRef(
                        id=evaluation_room.id,
                        code=evaluation_room.code,
                        floor=evaluation_room.floor,
                    )
                    if evaluation_room
                    else None
                ),
                public_note=record.public_note,
                called_at=record.called_at,
                started_at=record.started_at,
                completed_at=record.completed_at,
                version=record.version,
            )
        items.append(
            TeamSummaryPublic(
                id=team.id,
                team_code=team.team_code,
                name=team.name,
                track=TrackPublic.model_validate(track),
                member_count=active_members,
                attendance=attendance_summary(checked_counts.get(team.id, 0), expected),
                room=RoomRef.model_validate(room) if room else None,
                evaluation=evaluation,
            )
        )
    return items


def evaluation_public(
    evaluation: Evaluation,
    team: Team,
    panel: JudgingPanel | None,
    room: Room | None,
) -> EvaluationPublic:
    return EvaluationPublic(
        id=evaluation.id,
        team_id=team.id,
        team_code=team.team_code,
        team_name=team.name,
        status=evaluation.status,
        queue_position=evaluation.queue_position,
        panel=PanelRef(id=panel.id, name=panel.name) if panel else None,
        room=RoomRef.model_validate(room) if room else None,
        public_note=evaluation.public_note,
        called_at=evaluation.called_at,
        started_at=evaluation.started_at,
        completed_at=evaluation.completed_at,
        version=evaluation.version,
    )


async def room_needs_attention(session: AsyncSession, room_id: UUID) -> bool:
    from app.models.enums import RoomDutyRole
    from app.models.room import RoomStaffAssignment

    now = datetime.now(UTC)
    duties = set(
        (
            await session.scalars(
                select(RoomStaffAssignment.duty_role).where(
                    RoomStaffAssignment.room_id == room_id,
                    RoomStaffAssignment.starts_at <= now,
                    (RoomStaffAssignment.ends_at.is_(None) | (RoomStaffAssignment.ends_at > now)),
                )
            )
        ).all()
    )
    return not {RoomDutyRole.VOLUNTEER, RoomDutyRole.COORDINATOR}.issubset(duties)
