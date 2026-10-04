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
from app.models.enums import EvaluationStatus, PanelMemberRole, RoundStatus, enum_type
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class JudgingPanel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "judging_panels"
    __table_args__ = (
        UniqueConstraint("event_id", "name", name="uq_judging_panels_event_name"),
    )

    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )


class PanelMember(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "panel_members"
    __table_args__ = (
        UniqueConstraint("panel_id", "user_id", name="uq_panel_members_panel_user"),
        CheckConstraint("role IN ('member', 'lead')", name="role_valid"),
    )

    panel_id: Mapped[UUID] = mapped_column(
        ForeignKey("judging_panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("staff_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[PanelMemberRole] = mapped_column(
        enum_type(PanelMemberRole, "panel_member_role"),
        nullable=False,
        default=PanelMemberRole.MEMBER,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class Round(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "rounds"
    __table_args__ = (
        UniqueConstraint("event_id", "code", name="uq_rounds_event_code"),
        UniqueConstraint(
            "event_id",
            "sequence_number",
            name="uq_rounds_event_sequence_number",
        ),
        CheckConstraint(
            "status IN ('scheduled', 'live', 'closed')",
            name="status_valid",
        ),
        CheckConstraint("ends_at > starts_at", name="date_range_valid"),
        CheckConstraint("sequence_number > 0", name="sequence_number_positive"),
        Index(
            "uq_rounds_one_live_per_event",
            "event_id",
            unique=True,
            postgresql_where=text("status = 'live'"),
        ),
    )

    event_id: Mapped[UUID] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RoundStatus] = mapped_column(
        enum_type(RoundStatus, "round_status"),
        nullable=False,
        default=RoundStatus.SCHEDULED,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Evaluation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint("round_id", "team_id", name="uq_evaluations_round_team"),
        CheckConstraint(
            "status IN ('unassigned', 'queued', 'called', 'in_progress', "
            "'completed', 'no_show', 'cancelled')",
            name="status_valid",
        ),
        CheckConstraint(
            "queue_position IS NULL OR queue_position > 0",
            name="queue_position_positive",
        ),
        CheckConstraint("version > 0", name="version_positive"),
        Index("ix_evaluations_round_status", "round_id", "status"),
        Index("ix_evaluations_round_panel_queue", "round_id", "panel_id", "queue_position"),
        Index(
            "uq_evaluations_panel_in_progress",
            "round_id",
            "panel_id",
            unique=True,
            postgresql_where=text("status = 'in_progress' AND panel_id IS NOT NULL"),
        ),
        Index(
            "uq_evaluations_active_queue_position",
            "round_id",
            "panel_id",
            "queue_position",
            unique=True,
            postgresql_where=text(
                "status IN ('queued', 'called') AND panel_id IS NOT NULL "
                "AND queue_position IS NOT NULL"
            ),
        ),
    )

    round_id: Mapped[UUID] = mapped_column(
        ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    panel_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("judging_panels.id", ondelete="SET NULL"), index=True
    )
    room_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("rooms.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[EvaluationStatus] = mapped_column(
        enum_type(EvaluationStatus, "evaluation_status"),
        nullable=False,
        default=EvaluationStatus.UNASSIGNED,
    )
    queue_position: Mapped[int | None] = mapped_column(Integer)
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    public_note: Mapped[str | None] = mapped_column(Text)
    private_note: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    updated_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("staff_users.id", ondelete="SET NULL")
    )
