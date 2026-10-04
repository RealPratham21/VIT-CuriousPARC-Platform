"""Install Panel 1 through Panel 18 and retire any other panel names."""

from __future__ import annotations

import asyncio

from sqlalchemy import func, select

from app.db.session import SessionFactory, engine
from app.models.evaluation import JudgingPanel
from app.models.event import Event
from app.scripts.seed_reference_data import EVENT_SLUG, seed_panels


async def main() -> None:
    async with SessionFactory() as session:
        async with session.begin():
            event = await session.scalar(select(Event).where(Event.slug == EVENT_SLUG))
            if event is None:
                raise SystemExit(
                    f"Event {EVENT_SLUG!r} was not found. Run the reference seed first."
                )
            created = await seed_panels(session, event)
            active = await session.scalar(
                select(func.count())
                .select_from(JudgingPanel)
                .where(JudgingPanel.event_id == event.id, JudgingPanel.is_active.is_(True))
            )
            names = list(
                (
                    await session.scalars(
                        select(JudgingPanel.name).where(
                            JudgingPanel.event_id == event.id,
                            JudgingPanel.is_active.is_(True),
                        )
                    )
                ).all()
            )
    names.sort(key=lambda name: (int("".join(ch for ch in name if ch.isdigit()) or "0"), name))
    print(f"Panels ready for {EVENT_SLUG}: created={created}, active={active}")
    print(", ".join(names))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
