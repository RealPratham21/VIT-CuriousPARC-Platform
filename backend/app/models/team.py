from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    false,
    text,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import AttendanceStatus, RegistrationStatus, enum_type
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Team(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "teams"
    __table_args__ = (
        UniqueConstraint("event_id", "team_code", name="uq_teams_event_team_code"),
        CheckConstraint(
            "registration_status IN ('draft', 'registered', 'withdrawn')",
            name="registration_status_valid",
        ),
        CheckConstraint(
            "expected_member_count IS NULL OR expected_member_count > 0",
            name="expected_member_count_positive",
        ),
        CheckConstraint("version > 0", name="version_positive"),
        Index("ix_teams_event_registration_status", "event_id", "registration_status"),
    )

    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    track_id: Mapped[UUID] = mapped_column(
        ForeignKey("tracks.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    registration_status: Mapped[RegistrationStatus] = mapped_column(
        enum_type(RegistrationStatus, "registration_status"),
        nullable=False,
        default=RegistrationStatus.REGISTERED,
    )
    expected_member_count: Mapped[int | None] = mapped_column(Integer)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )


class TeamMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "team_members"
    __table_args__ = (
        Index(
            "uq_team_members_one_active_leader",
            "team_id",
            unique=True,
            postgresql_where=text("is_leader AND is_active"),
        ),
    )

    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone_e164: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(320))
    is_leader: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )


class Attendance(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "team_member_id",
            name="uq_attendance_event_team_member",
        ),
        CheckConstraint(
            "status IN ('not_checked_in', 'checked_in')",
            name="status_valid",
        ),
        CheckConstraint("version > 0", name="version_positive"),
    )

    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_member_id: Mapped[UUID] = mapped_column(
        ForeignKey("team_members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        enum_type(AttendanceStatus, "attendance_status"),
        nullable=False,
        default=AttendanceStatus.NOT_CHECKED_IN,
    )
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    checked_in_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )
