"""Local demo teams for the public directory. Not for production."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionFactory
from app.models.activity import ActivityEvent
from app.models.enums import (
    ActivityVisibility,
    AttendanceStatus,
    EvaluationStatus,
    RegistrationStatus,
    RoundStatus,
)
from app.models.evaluation import Evaluation, JudgingPanel, Round
from app.models.event import Event, Track
from app.models.room import Room, TeamRoomAssignment
from app.models.staff import StaffUser
from app.models.team import Attendance, Team, TeamMember

EVENT_SLUG = "curiousparc-2026"
TIMEZONE = ZoneInfo("Asia/Kolkata")

# code, name, room, checked_in, expected, panel, evaluation status, queue
TEAMS = (
    ("VIT-001", "Binary Builders", "A-104", 3, 4, "Panel Alpha", EvaluationStatus.COMPLETED, None),
    ("VIT-002", "Ctrl Alt Elite", "A-105", 4, 4, "Panel Beta", EvaluationStatus.IN_PROGRESS, None),
    ("VIT-003", "Stack Trace", "A-106", 3, 4, "Panel Gamma", EvaluationStatus.QUEUED, 1),
    ("VIT-004", "Code Crusaders", "A-107", 4, 4, "Panel Alpha", EvaluationStatus.COMPLETED, None),
    ("VIT-005", "Syntax Squad", "A-108", 3, 3, "Panel Delta", EvaluationStatus.CALLED, 1),
    ("VIT-006", "Null Pointers", "B-201", 2, 4, "Panel Epsilon", EvaluationStatus.QUEUED, 1),
    ("VIT-007", "Runtime Rebels", "B-202", 4, 4, "Panel Beta", EvaluationStatus.COMPLETED, None),
    ("VIT-008", "The Semicolons", "B-203", 4, 4, "Panel Gamma", EvaluationStatus.QUEUED, 2),
    ("VIT-009", "Cloud Native", "B-204", 3, 4, "Panel Delta", EvaluationStatus.COMPLETED, None),
    ("VIT-010", "API Avengers", "B-205", 4, 4, "Panel Epsilon", EvaluationStatus.IN_PROGRESS, None),
    ("VIT-011", "Debug Thugs", None, 3, 4, None, EvaluationStatus.UNASSIGNED, None),
    ("VIT-012", "Byte Me", "C-302", 0, 4, None, None, None),
)


def activity(
    event_id,
    team_id,
    actor_id,
    event_type: str,
    title: str,
    description: str,
    created_at: datetime,
) -> ActivityEvent:
    return ActivityEvent(
        event_id=event_id,
        team_id=team_id,
        event_type=event_type,
        title=title,
        public_description=description,
        visibility=ActivityVisibility.PUBLIC,
        actor_user_id=actor_id,
        created_at=created_at,
    )


async def main() -> None:
    if get_settings().environment == "production":
        raise SystemExit("Demo team seeding is disabled in production.")

    async with SessionFactory() as session:
        async with session.begin():
            event = await session.scalar(select(Event).where(Event.slug == EVENT_SLUG))
            if event is None:
                raise SystemExit("Run the reference seed before demo teams.")
            existing = await session.scalar(
                select(Team.id).where(Team.event_id == event.id, Team.team_code == "VIT-001")
            )
            if existing is not None:
                print("Demo teams already present.")
                return

            actor = await session.scalar(
                select(StaffUser).where(StaffUser.staff_code == "HC-ADMIN-001")
            )
            track = await session.scalar(
                select(Track).where(Track.event_id == event.id, Track.code == "THEME-1")
            )
            if track is None:
                raise SystemExit("Theme 1 track is missing. Run the reference seed.")
            rooms = {
                room.code: room
                for room in (
                    await session.scalars(select(Room).where(Room.event_id == event.id))
                ).all()
            }
            panels = {
                panel.name: panel
                for panel in (
                    await session.scalars(
                        select(JudgingPanel).where(JudgingPanel.event_id == event.id)
                    )
                ).all()
            }
            round_record = await session.scalar(
                select(Round).where(Round.event_id == event.id, Round.code == "ROUND-1")
            )
            if round_record is None:
                raise SystemExit("Round 1 is missing. Run the reference seed.")
            if round_record.status == RoundStatus.SCHEDULED:
                round_record.status = RoundStatus.LIVE

            origin = datetime(2026, 10, 5, 8, 0, tzinfo=TIMEZONE)
            for index, spec in enumerate(TEAMS):
                code, name, room_code, checked_in, expected, panel_name, status, queue = spec
                team = Team(
                    event_id=event.id,
                    team_code=code,
                    name=name,
                    track_id=track.id,
                    registration_status=RegistrationStatus.REGISTERED,
                    expected_member_count=expected,
                    created_by=actor.id if actor else None,
                    updated_by=actor.id if actor else None,
                )
                session.add(team)
                await session.flush()

                registered_at = origin + timedelta(minutes=index)
                session.add(
                    activity(
                        event.id,
                        team.id,
                        actor.id if actor else None,
                        "team_registered",
                        "Team registered",
                        f"{name} was registered.",
                        registered_at,
                    )
                )

                for member_index in range(expected):
                    leader = member_index == 0
                    member = TeamMember(
                        team_id=team.id,
                        full_name=f"{name} Lead" if leader else f"{name} Member {member_index + 1}",
                        phone_e164=f"+91900000{index:02d}{member_index:02d}" if leader else None,
                        is_leader=leader,
                    )
                    session.add(member)
                    await session.flush()
                    if member_index < checked_in:
                        session.add(
                            Attendance(
                                event_id=event.id,
                                team_member_id=member.id,
                                status=AttendanceStatus.CHECKED_IN,
                                checked_in_at=registered_at + timedelta(minutes=20),
                                checked_in_by=actor.id if actor else None,
                            )
                        )
                if checked_in:
                    session.add(
                        activity(
                            event.id,
                            team.id,
                            actor.id if actor else None,
                            "team_checked_in",
                            "Checked in",
                            f"{checked_in} of {expected} members checked in.",
                            registered_at + timedelta(minutes=20),
                        )
                    )

                room = rooms.get(room_code) if room_code else None
                if room_code and room is None:
                    raise SystemExit(f"Room {room_code} was not found.")
                if room is not None:
                    session.add(
                        TeamRoomAssignment(
                            team_id=team.id,
                            room_id=room.id,
                            assigned_at=registered_at + timedelta(minutes=40),
                            assigned_by=actor.id if actor else None,
                            reason="Demo assignment",
                        )
                    )
                    session.add(
                        activity(
                            event.id,
                            team.id,
                            actor.id if actor else None,
                            "room_assigned",
                            "Room assigned",
                            f"Assigned to {room.code}.",
                            registered_at + timedelta(minutes=40),
                        )
                    )

                if status is None:
                    continue
                panel = panels.get(panel_name) if panel_name else None
                if panel_name and panel is None:
                    raise SystemExit(f"Panel {panel_name} was not found.")
                evaluated_at = registered_at + timedelta(hours=4)
                called = status in {
                    EvaluationStatus.CALLED,
                    EvaluationStatus.IN_PROGRESS,
                    EvaluationStatus.COMPLETED,
                }
                started = status in {EvaluationStatus.IN_PROGRESS, EvaluationStatus.COMPLETED}
                session.add(
                    Evaluation(
                        round_id=round_record.id,
                        team_id=team.id,
                        panel_id=panel.id if panel else None,
                        room_id=room.id if room else None,
                        status=status,
                        queue_position=queue,
                        called_at=evaluated_at if called else None,
                        started_at=evaluated_at + timedelta(minutes=10) if started else None,
                        completed_at=(
                            evaluated_at + timedelta(minutes=25)
                            if status == EvaluationStatus.COMPLETED
                            else None
                        ),
                        updated_by=actor.id if actor else None,
                    )
                )
                session.add(
                    activity(
                        event.id,
                        team.id,
                        actor.id if actor else None,
                        "evaluation_updated",
                        "Evaluation updated",
                        f"{name} is {status.value.replace('_', ' ')}.",
                        evaluated_at,
                    )
                )

    print(f"Demo teams ready: {len(TEAMS)} teams for {EVENT_SLUG}. Round 1 is live.")


if __name__ == "__main__":
    asyncio.run(main())
