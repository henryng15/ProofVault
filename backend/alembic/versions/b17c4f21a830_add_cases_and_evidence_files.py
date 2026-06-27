"""add cases and evidence files

Revision ID: b17c4f21a830
Revises: 48f27aeb2e09
Create Date: 2026-06-26
"""

from alembic import op
import sqlalchemy as sa

revision = "b17c4f21a830"
down_revision = "48f27aeb2e09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cases",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cases_owner_user_id", "cases", ["owner_user_id"])
    op.create_table(
        "evidence_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("file_hash", sa.String(length=66), nullable=True),
        sa.Column("hash_algorithm", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key"),
    )
    op.create_index(
        "ix_evidence_files_case_id_created_at",
        "evidence_files",
        ["case_id", "created_at"],
    )
    op.create_index(
        "ix_evidence_files_owner_user_id", "evidence_files", ["owner_user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_evidence_files_owner_user_id", table_name="evidence_files")
    op.drop_index(
        "ix_evidence_files_case_id_created_at", table_name="evidence_files"
    )
    op.drop_table("evidence_files")
    op.drop_index("ix_cases_owner_user_id", table_name="cases")
    op.drop_table("cases")
