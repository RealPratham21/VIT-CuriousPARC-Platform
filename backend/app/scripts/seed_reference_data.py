from __future__ import annotations

import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import SessionFactory
from app.models.enums import EventStatus, RoundStatus
from app.models.evaluation import JudgingPanel, Round
from app.models.event import Event, Track
from app.models.room import Room

EVENT_SLUG = "curiousparc-2026"
EVENT_TIMEZONE = ZoneInfo("Asia/Kolkata")

TRACKS = (("THEME-1", "Open Innovation"),)
PANELS = ("Panel Alpha", "Panel Beta", "Panel Gamma", "Panel Delta", "Panel Epsilon")
ROOM_CODES = (
    "1307",
    "1308",
    "1309",
    "1316A",
    "1316D",
    "1321A",
    "1321D",
    "1323A",
    "1323D",
    "1324",
    "1325",
    "1326",
    "1327",
    "1328",
    "1329",
    "1401",
    "1402",
    "1410",
    "1411",
    "1412",
    "1413",
)
ROOMS = tuple((code, code[:2]) for code in ROOM_CODES)


async def seed_event(session: AsyncSession) -> Event:
    event = await session.scalar(select(Event).where(Event.slug == EVENT_SLUG))
    if event is None:
        event = Event(
            slug=EVENT_SLUG,
            name="CuriousPARC 2026",
            timezone="Asia/Kolkata",
            starts_at=datetime(2026, 10, 5, 8, 0, tzinfo=EVENT_TIMEZONE),
            ends_at=datetime(2026, 10, 6, 20, 0, tzinfo=EVENT_TIMEZONE),
            status=EventStatus.REGISTRATION,
        )
        session.add(event)
        await session.flush()
    return event


async def seed_tracks(session: AsyncSession, event: Event) -> int:
    created = 0
    for code, name in TRACKS:
        track = await session.scalar(
            select(Track).where(Track.event_id == event.id, Track.code == code)
        )
        if track is None:
            session.add(Track(event_id=event.id, code=code, name=name))
            created += 1
    return created


async def seed_rooms(session: AsyncSession, event: Event) -> int:
    created = 0
    for code, floor in ROOMS:
        room = await session.scalar(
            select(Room).where(Room.event_id == event.id, Room.code == code)
        )
        if room is None:
            session.add(Room(event_id=event.id, code=code, floor=floor))
            created += 1
    return created


async def seed_panels(session: AsyncSession, event: Event) -> int:
    created = 0
    for name in PANELS:
        panel = await session.scalar(
            select(JudgingPanel).where(
                JudgingPanel.event_id == event.id,
                JudgingPanel.name == name,
            )
        )
        if panel is None:
            session.add(JudgingPanel(event_id=event.id, name=name))
            created += 1
    return created


async def seed_round(session: AsyncSession, event: Event) -> int:
    round_record = await session.scalar(
        select(Round).where(Round.event_id == event.id, Round.code == "ROUND-1")
    )
    if round_record is not None:
        return 0

    session.add(
        Round(
            event_id=event.id,
            code="ROUND-1",
            name="Prototype Evaluation",
            sequence_number=1,
            status=RoundStatus.SCHEDULED,
            starts_at=datetime(2026, 10, 5, 9, 0, tzinfo=EVENT_TIMEZONE),
            ends_at=datetime(2026, 10, 5, 18, 0, tzinfo=EVENT_TIMEZONE),
        )
    )
    return 1


async def main() -> None:
    settings = get_settings()
    if settings.environment == "production":
        raise SystemExit(
            "Reference-data seeding is disabled in production. Use reviewed production data."
        )

    async with SessionFactory() as session:
        async with session.begin():
            event = await seed_event(session)
            tracks = await seed_tracks(session, event)
            rooms = await seed_rooms(session, event)
            panels = await seed_panels(session, event)
            rounds = await seed_round(session, event)

    print(
        "Reference data ready: "
        f"event={EVENT_SLUG}, tracks_created={tracks}, rooms_created={rooms}, "
        f"panels_created={panels}, rounds_created={rounds}"
    )


if __name__ == "__main__":
    asyncio.run(main())

