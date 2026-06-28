"""add case_events and verification_attempts

Revision ID: e5b2f9a17c34
Revises: d4a1e8f39c12
Create Date: 2026-06-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "e5b2f9a17c34"
down_revision = "d4a1e8f39c12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "case_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("event_data", JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_case_events_case_id", "case_events", ["case_id"])
    op.create_index("ix_case_events_file_id", "case_events", ["file_id"])

    op.create_table(
        "verification_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("proof_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_hash", sa.String(length=66), nullable=False),
        sa.Column("result", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_verification_attempts_file_id", "verification_attempts", ["file_id"]
    )
    op.create_index(
        "ix_verification_attempts_proof_id", "verification_attempts", ["proof_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_verification_attempts_proof_id", table_name="verification_attempts")
    op.drop_index("ix_verification_attempts_file_id", table_name="verification_attempts")
    op.drop_table("verification_attempts")
    op.drop_index("ix_case_events_file_id", table_name="case_events")
    op.drop_index("ix_case_events_case_id", table_name="case_events")
    op.drop_table("case_events")
