from app import models  # noqa: F401
from app.db.base import Base

EXPECTED_TABLES = {
    "activity_events",
    "announcements",
    "attendance",
    "audit_logs",
    "auth_sessions",
    "evaluations",
    "event_staff_roles",
    "events",
    "judging_panels",
    "panel_members",
    "room_staff_assignments",
    "rooms",
    "rounds",
    "staff_users",
    "team_members",
    "team_room_assignments",
    "teams",
    "tracks",
}


def test_all_operational_tables_are_registered() -> None:
    assert set(Base.metadata.tables) == EXPECTED_TABLES


def test_critical_partial_unique_indexes_exist() -> None:
    index_names = {
        index.name
        for table in Base.metadata.tables.values()
        for index in table.indexes
    }

    assert {
        "uq_evaluations_active_queue_position",
        "uq_evaluations_panel_in_progress",
        "uq_rounds_one_live_per_event",
        "uq_team_members_one_active_leader",
        "uq_team_room_assignments_current_team",
    } <= index_names

