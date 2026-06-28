"""add description and updated_at to cases

Revision ID: d4a1e8f39c12
Revises: c92e0a314db7
Create Date: 2026-06-27
"""

from alembic import op
import sqlalchemy as sa

revision = "d4a1e8f39c12"
down_revision = "c92e0a314db7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cases", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "cases",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("cases", "updated_at")
    op.drop_column("cases", "description")
