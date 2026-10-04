"""Import all ORM models so Alembic can discover their metadata."""

from app.models.activity import ActivityEvent, Announcement, AuditLog
from app.models.evaluation import Evaluation, JudgingPanel, PanelMember, Round
from app.models.event import Event, Track
from app.models.room import Room, RoomStaffAssignment, TeamRoomAssignment
from app.models.staff import AuthSession, EventStaffRole, StaffUser
from app.models.team import Attendance, Team, TeamMember

__all__ = [
    "ActivityEvent",
    "Announcement",
    "Attendance",
    "AuditLog",
    "AuthSession",
    "Evaluation",
    "Event",
    "EventStaffRole",
    "JudgingPanel",
    "PanelMember",
    "Room",
    "RoomStaffAssignment",
    "Round",
    "StaffUser",
    "Team",
    "TeamMember",
    "TeamRoomAssignment",
    "Track",
]

