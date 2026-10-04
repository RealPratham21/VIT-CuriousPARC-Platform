from __future__ import annotations

import argparse
import asyncio
import os

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionFactory
from app.models.enums import StaffRole
from app.models.event import Event
from app.models.staff import EventStaffRole, StaffUser


async def bootstrap(args: argparse.Namespace) -> None:
    password = os.environ.get(args.password_env)
    if not password or len(password) < 12:
        raise SystemExit(f"Set {args.password_env} to a password of at least 12 characters.")
    async with SessionFactory() as session:
        event = await session.scalar(select(Event).where(Event.slug == args.event_slug))
        if event is None:
            raise SystemExit(
                f"Event {args.event_slug!r} was not found. Run the reference seed first."
            )
        user = await session.scalar(
            select(StaffUser).where(StaffUser.staff_code == args.staff_code)
        )
        if user is None:
            user = StaffUser(
                staff_code=args.staff_code,
                full_name=args.full_name,
                email=args.email,
                password_hash=hash_password(password),
            )
            session.add(user)
            await session.flush()
        role = await session.scalar(
            select(EventStaffRole).where(
                EventStaffRole.event_id == event.id,
                EventStaffRole.user_id == user.id,
                EventStaffRole.role == StaffRole.ADMIN,
            )
        )
        if role is None:
            session.add(EventStaffRole(event_id=event.id, user_id=user.id, role=StaffRole.ADMIN))
        await session.commit()
        print(f"Administrator {user.staff_code} is ready for {event.slug}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first HackOps administrator.")
    parser.add_argument("--event-slug", default="curiousparc-2026")
    parser.add_argument("--staff-code", required=True)
    parser.add_argument("--full-name", required=True)
    parser.add_argument("--email")
    parser.add_argument("--password-env", default="HACKOPS_BOOTSTRAP_PASSWORD")
    asyncio.run(bootstrap(parser.parse_args()))


if __name__ == "__main__":
    main()
