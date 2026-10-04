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
    Text,
    UniqueConstraint,
    text,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import RoomDutyRole, enum_type
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Room(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("event_id", "code", name="uq_rooms_event_code"),
        CheckConstraint("capacity IS NULL OR capacity > 0", name="capacity_positive"),
    )

    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    floor: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    capacity: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true(), index=True
    )


class TeamRoomAssignment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "team_room_assignments"
    __table_args__ = (
        Index(
            "uq_team_room_assignments_current_team",
            "team_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
        ),
        Index("ix_team_room_assignments_room_current", "room_id", "ended_at"),
    )

    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    assigned_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str | None] = mapped_column(Text)


class RoomStaffAssignment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "room_staff_assignments"
    __table_args__ = (
        CheckConstraint(
            "duty_role IN ('volunteer', 'coordinator')",
            name="duty_role_valid",
        ),
        CheckConstraint(
            "ends_at IS NULL OR ends_at > starts_at",
            name="date_range_valid",
        ),
        Index(
            "uq_room_staff_assignments_current_user_duty",
            "user_id",
            "duty_role",
            unique=True,
            postgresql_where=text("ends_at IS NULL"),
        ),
        Index("ix_room_staff_assignments_room_current", "room_id", "ends_at"),
    )

    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("staff_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    duty_role: Mapped[RoomDutyRole] = mapped_column(
        enum_type(RoomDutyRole, "room_duty_role"),
        nullable=False,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    assigned_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )
