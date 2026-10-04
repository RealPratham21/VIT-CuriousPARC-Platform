from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import StaffRole, enum_type
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class StaffUser(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "staff_users"

    staff_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    phone_e164: Mapped[str | None] = mapped_column(String(32))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true(), index=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EventStaffRole(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "event_staff_roles"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "user_id",
            "role",
            name="uq_event_staff_roles_event_user_role",
        ),
        CheckConstraint(
            "role IN ('viewer', 'checkin_volunteer', 'coordinator', "
            "'evaluator', 'lead', 'admin')",
            name="role_valid",
        ),
    )

    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("staff_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[StaffRole] = mapped_column(
        enum_type(StaffRole, "staff_role"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AuthSession(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_user_expires", "user_id", "expires_at"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("staff_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
