"""One published announcement for the local dashboard banner."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionFactory
from app.models.activity import Announcement
from app.models.enums import AnnouncementAudience
from app.models.event import Event
from app.models.staff import StaffUser

EVENT_SLUG = "curiousparc-2026"
TITLE = "Lunch service"
TIMEZONE = ZoneInfo("Asia/Kolkata")


async def main() -> None:
    if get_settings().environment == "production":
        raise SystemExit("Demo announcement seeding is disabled in production.")

    async with SessionFactory() as session:
        async with session.begin():
            event = await session.scalar(select(Event).where(Event.slug == EVENT_SLUG))
            if event is None:
                raise SystemExit("Run the reference seed before the demo announcement.")
            existing = await session.scalar(
                select(Announcement.id).where(
                    Announcement.event_id == event.id,
                    Announcement.title == TITLE,
                )
            )
            if existing is not None:
                print("Demo announcement already present.")
                return
            actor = await session.scalar(
                select(StaffUser).where(StaffUser.staff_code == "HC-ADMIN-001")
            )
            published_at = min(
                datetime(2026, 10, 4, 13, 5, tzinfo=TIMEZONE),
                datetime.now(TIMEZONE) - timedelta(minutes=1),
            )
            session.add(
                Announcement(
                    event_id=event.id,
                    title=TITLE,
                    message=(
                        "Lunch service begins at 13:30 in the central atrium. "
                        "Teams may report after evaluation handoff."
                    ),
                    audience=AnnouncementAudience.ALL,
                    published_at=published_at,
                    published_by=actor.id if actor else None,
                    expires_at=datetime(2026, 10, 6, 20, 0, tzinfo=TIMEZONE),
                )
            )
    print(f"Demo announcement ready for {EVENT_SLUG}.")


if __name__ == "__main__":
    asyncio.run(main())
