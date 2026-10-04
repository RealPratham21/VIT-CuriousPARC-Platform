"""Install themes 1 through 9 and retire any other track codes."""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.session import SessionFactory, engine
from app.models.event import Event, Track
from app.scripts.seed_reference_data import EVENT_SLUG, seed_tracks


async def main() -> None:
    async with SessionFactory() as session:
        async with session.begin():
            event = await session.scalar(select(Event).where(Event.slug == EVENT_SLUG))
            if event is None:
                raise SystemExit(
                    f"Event {EVENT_SLUG!r} was not found. Run the reference seed first."
                )
            created = await seed_tracks(session, event)
            tracks = list(
                (
                    await session.scalars(
                        select(Track)
                        .where(Track.event_id == event.id, Track.is_active.is_(True))
                        .order_by(Track.code)
                    )
                ).all()
            )
    print(f"Tracks ready for {EVENT_SLUG}: created={created}, active={len(tracks)}")
    for track in tracks:
        number = track.code.removeprefix("THEME-")
        print(f"THEME {number}: {track.name}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
