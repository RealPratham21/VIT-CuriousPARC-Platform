"""Clear operational rows for one event and keep the standing setup.

Keeps the event, tracks, judging panels, round, staff accounts, and the final
room list. Removes teams, evaluations, announcements, activity, room staffing,
audit history, and sign-in sessions. Demo room codes outside the final list
are removed. The command does nothing unless --confirm is passed.
"""

from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import delete, func, or_, select

from app.db.session import SessionFactory, engine
from app.models.activity import ActivityEvent, Announcement, AuditLog
from app.models.enums import RoundStatus
from app.models.evaluation import Evaluation, Round
from app.models.event import Event
from app.models.room import Room, RoomStaffAssignment, TeamRoomAssignment
from app.models.staff import AuthSession, EventStaffRole, StaffUser
from app.models.team import Attendance, Team, TeamMember
from app.scripts.seed_reference_data import EVENT_SLUG, ROOM_CODES, seed_rooms


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description="Clear operational event data.")
    command.add_argument("--event-slug", default=EVENT_SLUG)
    command.add_argument(
        "--confirm",
        action="store_true",
        help="Apply the reset. Without this flag the command only prints counts.",
    )
    return command


async def event_by_slug(slug: str) -> Event:
    async with SessionFactory() as session:
        event = await session.scalar(select(Event).where(Event.slug == slug))
    if event is None:
        raise SystemExit(f"Event {slug!r} was not found.")
    return event


async def summarize(event: Event) -> dict[str, int]:
    team_ids = select(Team.id).where(Team.event_id == event.id)
    room_ids = select(Room.id).where(Room.event_id == event.id)
    staff_ids = select(EventStaffRole.user_id).where(EventStaffRole.event_id == event.id)
    queries = {
        "teams": select(func.count()).select_from(Team).where(Team.event_id == event.id),
        "announcements": select(func.count())
        .select_from(Announcement)
        .where(Announcement.event_id == event.id),
        "activity": select(func.count())
        .select_from(ActivityEvent)
        .where(ActivityEvent.event_id == event.id),
        "evaluations": select(func.count())
        .select_from(Evaluation)
        .where(Evaluation.team_id.in_(team_ids)),
        "room_staff": select(func.count())
        .select_from(RoomStaffAssignment)
        .where(RoomStaffAssignment.room_id.in_(room_ids)),
        "extra_rooms": select(func.count())
        .select_from(Room)
        .where(Room.event_id == event.id, Room.code.not_in(ROOM_CODES)),
        "sessions": select(func.count())
        .select_from(AuthSession)
        .where(AuthSession.user_id.in_(staff_ids)),
        "staff": select(func.count()).select_from(StaffUser).where(StaffUser.id.in_(staff_ids)),
        "rooms": select(func.count()).select_from(Room).where(Room.event_id == event.id),
    }
    totals: dict[str, int] = {}
    async with SessionFactory() as session:
        for name, query in queries.items():
            totals[name] = int(await session.scalar(query) or 0)
    return totals


def print_summary(title: str, totals: dict[str, int]) -> None:
    print(title)
    for name, count in totals.items():
        print(f"  {name}={count}")


async def apply_reset(event: Event) -> None:
    team_ids = select(Team.id).where(Team.event_id == event.id)
    room_ids = select(Room.id).where(Room.event_id == event.id)
    round_ids = select(Round.id).where(Round.event_id == event.id)
    staff_ids = select(EventStaffRole.user_id).where(EventStaffRole.event_id == event.id)
    async with SessionFactory() as session:
        async with session.begin():
            current = await session.get(Event, event.id)
            if current is None:
                raise SystemExit(f"Event {event.slug!r} was not found.")
            await session.execute(delete(Attendance).where(Attendance.event_id == current.id))
            await session.execute(delete(ActivityEvent).where(ActivityEvent.event_id == current.id))
            await session.execute(
                delete(Evaluation).where(
                    or_(
                        Evaluation.team_id.in_(team_ids),
                        Evaluation.round_id.in_(round_ids),
                    )
                )
            )
            await session.execute(
                delete(TeamRoomAssignment).where(TeamRoomAssignment.team_id.in_(team_ids))
            )
            await session.execute(delete(TeamMember).where(TeamMember.team_id.in_(team_ids)))
            await session.execute(delete(Team).where(Team.event_id == current.id))
            await session.execute(delete(Announcement).where(Announcement.event_id == current.id))
            await session.execute(
                delete(RoomStaffAssignment).where(RoomStaffAssignment.room_id.in_(room_ids))
            )
            await session.execute(delete(AuditLog).where(AuditLog.event_id == current.id))
            await session.execute(delete(AuthSession).where(AuthSession.user_id.in_(staff_ids)))
            await session.execute(
                delete(Room).where(Room.event_id == current.id, Room.code.not_in(ROOM_CODES))
            )
            created = await seed_rooms(session, current)
            round_record = await session.scalar(
                select(Round).where(Round.event_id == current.id, Round.code == "ROUND-1")
            )
            if round_record is not None:
                round_record.status = RoundStatus.SCHEDULED
            print(f"Final rooms created={created}. Round 1 is scheduled.")


async def main() -> None:
    args = parser().parse_args()
    event = await event_by_slug(args.event_slug)
    before = await summarize(event)
    print_summary(f"Before reset for {event.slug}:", before)
    if not args.confirm:
        print("No rows were changed. Re-run with --confirm to apply this reset.")
        await engine.dispose()
        return
    await apply_reset(event)
    after = await summarize(event)
    print_summary(f"After reset for {event.slug}:", after)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
