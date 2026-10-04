from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AttendanceStatus
from app.models.team import Attendance, Team, TeamMember
from app.schemas.contracts import MemberStaff, TeamStaff
from app.services.read_models import build_team_summaries


async def staff_team_view(session: AsyncSession, team: Team) -> TeamStaff:
    public = (await build_team_summaries(session, [team]))[0]
    rows = (
        await session.execute(
            select(TeamMember, Attendance)
            .outerjoin(Attendance, Attendance.team_member_id == TeamMember.id)
            .where(TeamMember.team_id == team.id)
            .order_by(TeamMember.is_leader.desc(), TeamMember.full_name)
        )
    ).all()
    return TeamStaff(
        **public.model_dump(),
        registration_status=team.registration_status,
        expected_member_count=team.expected_member_count,
        version=team.version,
        members=[
            MemberStaff(
                id=member.id,
                full_name=member.full_name,
                phone_e164=member.phone_e164,
                email=member.email,
                is_leader=member.is_leader,
                is_active=member.is_active,
                attendance_status=(
                    attendance.status if attendance else AttendanceStatus.NOT_CHECKED_IN
                ),
            )
            for member, attendance in rows
        ],
    )
