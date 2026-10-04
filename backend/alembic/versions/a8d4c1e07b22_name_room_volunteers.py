"""name room volunteers

Revision ID: a8d4c1e07b22
Revises: e1ab28e063db
Create Date: 2026-10-04 16:50:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "a8d4c1e07b22"
down_revision: str | Sequence[str] | None = "e1ab28e063db"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("room_staff_assignments", "user_id", existing_type=sa.Uuid(), nullable=True)
    op.add_column(
        "room_staff_assignments",
        sa.Column("volunteer_name", sa.String(length=200), nullable=True),
    )
    op.create_check_constraint(
        "ck_room_staff_assignments_assignee_shape",
        "room_staff_assignments",
        "(duty_role = 'coordinator' AND user_id IS NOT NULL AND volunteer_name IS NULL) OR "
        "(duty_role = 'volunteer' AND user_id IS NULL AND volunteer_name IS NOT NULL "
        "AND length(btrim(volunteer_name)) > 0)",
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_room_staff_assignments_current_volunteer_name "
        "ON room_staff_assignments (room_id, lower(volunteer_name)) "
        "WHERE ends_at IS NULL AND duty_role = 'volunteer'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_room_staff_assignments_current_volunteer_name")
    op.drop_constraint(
        "ck_room_staff_assignments_assignee_shape",
        "room_staff_assignments",
        type_="check",
    )
    op.drop_column("room_staff_assignments", "volunteer_name")
    op.alter_column("room_staff_assignments", "user_id", existing_type=sa.Uuid(), nullable=False)
