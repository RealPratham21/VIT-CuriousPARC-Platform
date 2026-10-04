from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import (
    AnnouncementAudience,
    AttendanceStatus,
    EvaluationStatus,
    PanelMemberRole,
    RegistrationStatus,
    RoomDutyRole,
    RoundStatus,
    StaffRole,
)


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page[T](APIModel):
    items: list[T]
    page: int
    page_size: int
    total: int


class EventPublic(APIModel):
    id: UUID
    slug: str
    name: str
    timezone: str
    starts_at: datetime
    ends_at: datetime
    status: str


class TrackPublic(APIModel):
    id: UUID
    code: str
    name: str
    description: str | None


class RoomRef(APIModel):
    id: UUID
    code: str
    floor: str


class PanelRef(APIModel):
    id: UUID
    name: str


class AttendanceSummary(APIModel):
    status: Literal["not_arrived", "partial", "checked_in"]
    checked_in: int
    expected: int


class EvaluationSummary(APIModel):
    id: UUID
    status: EvaluationStatus
    queue_position: int | None
    panel: PanelRef | None
    room: RoomRef | None
    public_note: str | None
    called_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    version: int


class TeamSummaryPublic(APIModel):
    id: UUID
    team_code: str
    name: str
    track: TrackPublic
    member_count: int
    attendance: AttendanceSummary
    room: RoomRef | None
    evaluation: EvaluationSummary | None


class ActivityPublic(APIModel):
    id: UUID
    event_type: str
    title: str
    description: str
    created_at: datetime


class TeamDetailPublic(TeamSummaryPublic):
    timeline: list[ActivityPublic]


class OfficialPublic(APIModel):
    id: UUID
    full_name: str
    roles: list[StaffRole]
    rooms: list[RoomRef]
    managed_team_count: int


class RoomSummaryPublic(APIModel):
    id: UUID
    code: str
    floor: str
    capacity: int | None
    allocated_teams: int
    checked_in_teams: int
    volunteer: OfficialPublic | None
    coordinator: OfficialPublic | None
    coverage: Literal["covered", "needs_attention"]


class RoomDetailPublic(RoomSummaryPublic):
    teams: list[TeamSummaryPublic]


class RoundPublic(APIModel):
    id: UUID
    code: str
    name: str
    sequence_number: int
    status: RoundStatus
    starts_at: datetime
    ends_at: datetime


class EvaluationPublic(EvaluationSummary):
    team_id: UUID
    team_code: str
    team_name: str


class AnnouncementPublic(APIModel):
    id: UUID
    title: str
    message: str
    published_at: datetime
    expires_at: datetime | None


class DashboardPublic(APIModel):
    registered_teams: int
    checked_in_teams: int
    awaiting_evaluation: int
    under_evaluation: int
    evaluated: int
    rooms_needing_attention: int
    evaluation_progress_percent: int
    current_round: RoundPublic | None
    live_evaluations: list[EvaluationPublic]
    recent_activity: list[ActivityPublic]
    latest_announcement: AnnouncementPublic | None
    generated_at: datetime


class StaffRoleView(APIModel):
    event_id: UUID
    event_slug: str
    role: StaffRole


class StaffUserView(APIModel):
    id: UUID
    staff_code: str
    full_name: str
    email: str | None
    phone_e164: str | None
    is_active: bool
    roles: list[StaffRoleView] = []


class LoginRequest(APIModel):
    staff_code: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=200)


class TokenResponse(APIModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: StaffUserView


class MessageResponse(APIModel):
    message: str


class MemberStaff(APIModel):
    id: UUID
    full_name: str
    phone_e164: str | None
    email: str | None
    is_leader: bool
    is_active: bool
    attendance_status: AttendanceStatus


class TeamStaff(TeamSummaryPublic):
    registration_status: RegistrationStatus
    expected_member_count: int | None
    version: int
    members: list[MemberStaff]


class TeamCreate(APIModel):
    team_code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    track_id: UUID
    expected_member_count: int | None = Field(default=None, gt=0)
    leader_name: str = Field(min_length=1, max_length=200)
    leader_phone_e164: str | None = Field(default=None, max_length=32)
    leader_email: str | None = Field(default=None, max_length=320)


class TeamUpdate(APIModel):
    expected_version: int = Field(gt=0)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    track_id: UUID | None = None
    expected_member_count: int | None = Field(default=None, gt=0)
    registration_status: RegistrationStatus | None = None


class MemberCreate(APIModel):
    full_name: str = Field(min_length=1, max_length=200)
    phone_e164: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=320)
    is_leader: bool = False


class MemberUpdate(APIModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    phone_e164: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=320)
    is_leader: bool | None = None
    is_active: bool | None = None


class AttendanceMutation(APIModel):
    expected_version: int | None = Field(default=None, gt=0)


class RoomAssignmentCreate(APIModel):
    room_id: UUID
    reason: str | None = Field(default=None, max_length=1000)


class RoomStaffAssignmentCreate(APIModel):
    user_id: UUID
    duty_role: RoomDutyRole
    starts_at: datetime
    ends_at: datetime | None = None

    @field_validator("ends_at")
    @classmethod
    def validate_assignment_ends_at(cls, value: datetime | None, info):
        starts_at = info.data.get("starts_at")
        if value is not None and starts_at and value <= starts_at:
            raise ValueError("ends_at must be after starts_at")
        return value


class RoomStaffAssignmentView(RoomStaffAssignmentCreate):
    id: UUID
    room_id: UUID


class PanelView(APIModel):
    id: UUID
    event_id: UUID
    name: str
    is_active: bool


class PanelMemberView(APIModel):
    id: UUID
    panel_id: UUID
    user_id: UUID
    role: PanelMemberRole


class EvaluationCreate(APIModel):
    team_id: UUID
    panel_id: UUID | None = None
    room_id: UUID | None = None
    queue_position: int | None = Field(default=None, gt=0)
    public_note: str | None = None


class EvaluationTransition(APIModel):
    expected_version: int = Field(gt=0)
    public_note: str | None = None
    private_note: str | None = None


class EvaluationStaff(EvaluationPublic):
    private_note: str | None


class AnnouncementCreate(APIModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)
    audience: AnnouncementAudience
    publish_now: bool = False
    expires_at: datetime | None = None


class AnnouncementUpdate(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    message: str | None = Field(default=None, min_length=1, max_length=5000)
    audience: AnnouncementAudience | None = None
    expires_at: datetime | None = None


class AnnouncementStaff(APIModel):
    id: UUID
    event_id: UUID
    title: str
    message: str
    audience: AnnouncementAudience
    published_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime


class RoundCreate(APIModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    sequence_number: int = Field(gt=0)
    starts_at: datetime
    ends_at: datetime

    @field_validator("ends_at")
    @classmethod
    def validate_ends_at(cls, value: datetime, info):
        starts_at = info.data.get("starts_at")
        if starts_at and value <= starts_at:
            raise ValueError("ends_at must be after starts_at")
        return value


class PanelCreate(APIModel):
    name: str = Field(min_length=1, max_length=100)


class PanelMemberCreate(APIModel):
    user_id: UUID
    role: PanelMemberRole = PanelMemberRole.MEMBER


class StaffUserCreate(APIModel):
    staff_code: str = Field(min_length=2, max_length=50)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=12, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone_e164: str | None = Field(default=None, max_length=32)


class StaffRoleCreate(APIModel):
    role: StaffRole


class PasswordReset(APIModel):
    password: str = Field(min_length=12, max_length=200)
