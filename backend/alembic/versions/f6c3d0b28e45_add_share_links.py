"""add share_links

Revision ID: f6c3d0b28e45
Revises: e5b2f9a17c34
Create Date: 2026-06-28
"""

from alembic import op
import sqlalchemy as sa

revision = "f6c3d0b28e45"
down_revision = "e5b2f9a17c34"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "share_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_share_links_token", "share_links", ["token"], unique=True)
    op.create_index("ix_share_links_case_id", "share_links", ["case_id"])


def downgrade() -> None:
    op.drop_index("ix_share_links_case_id", table_name="share_links")
    op.drop_index("ix_share_links_token", table_name="share_links")
    op.drop_table("share_links")
