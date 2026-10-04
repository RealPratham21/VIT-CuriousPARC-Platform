from enum import StrEnum

from sqlalchemy import Enum


def enum_type(enum_class: type[StrEnum], name: str) -> Enum:
    """Persist enum values as lowercase strings with explicit table checks."""

    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=False,
        validate_strings=True,
        values_callable=lambda members: [member.value for member in members],
    )


class EventStatus(StrEnum):
    DRAFT = "draft"
    REGISTRATION = "registration"
    LIVE = "live"
    COMPLETED = "completed"


class RegistrationStatus(StrEnum):
    DRAFT = "draft"
    REGISTERED = "registered"
    WITHDRAWN = "withdrawn"


class AttendanceStatus(StrEnum):
    NOT_CHECKED_IN = "not_checked_in"
    CHECKED_IN = "checked_in"


class StaffRole(StrEnum):
    VIEWER = "viewer"
    CHECKIN_VOLUNTEER = "checkin_volunteer"
    COORDINATOR = "coordinator"
    EVALUATOR = "evaluator"
    LEAD = "lead"
    ADMIN = "admin"


class RoomDutyRole(StrEnum):
    VOLUNTEER = "volunteer"
    COORDINATOR = "coordinator"


class PanelMemberRole(StrEnum):
    MEMBER = "member"
    LEAD = "lead"


class RoundStatus(StrEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    CLOSED = "closed"


class EvaluationStatus(StrEnum):
    UNASSIGNED = "unassigned"
    QUEUED = "queued"
    CALLED = "called"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"


class AnnouncementAudience(StrEnum):
    PUBLIC = "public"
    STAFF = "staff"
    ALL = "all"


class ActivityVisibility(StrEnum):
    PUBLIC = "public"
    STAFF = "staff"
    TEAM = "team"
