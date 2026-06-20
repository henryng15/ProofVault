"""add proof workflow tables

Revision ID: 48f27aeb2e09
Revises:
Create Date: 2026-06-20 19:11:08.248969

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48f27aeb2e09'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "proofs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("tx_hash", sa.String(length=66), nullable=True),
        sa.Column("block_number", sa.BigInteger(), nullable=True),
        sa.Column("chain_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "proof_status",
            sa.String(length=32),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=66), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_proofs_proof_status", "proofs", ["proof_status"])
    op.create_index("ix_proofs_tx_hash", "proofs", ["tx_hash"], unique=True)
    op.create_index("ix_proofs_token_hash", "proofs", ["token_hash"])
    op.create_index(
        "ix_proofs_file_id_created_at", "proofs", ["file_id", "created_at"]
    )

    op.create_table(
        "case_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_case_events_case_id_created_at", "case_events", ["case_id", "created_at"]
    )
    op.create_index(
        "ix_case_events_file_id_created_at", "case_events", ["file_id", "created_at"]
    )

    op.create_table(
        "share_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("case_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=66), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_share_links_token_hash", "share_links", ["token_hash"], unique=True
    )

    op.create_table(
        "verification_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("proof_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_hash", sa.String(length=66), nullable=False),
        sa.Column("result", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["proof_id"], ["proofs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_verification_attempts_file_id_created_at",
        "verification_attempts",
        ["file_id", "created_at"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_verification_attempts_file_id_created_at",
        table_name="verification_attempts",
    )
    op.drop_table("verification_attempts")
    op.drop_index("ix_share_links_token_hash", table_name="share_links")
    op.drop_table("share_links")
    op.drop_index("ix_case_events_file_id_created_at", table_name="case_events")
    op.drop_index("ix_case_events_case_id_created_at", table_name="case_events")
    op.drop_table("case_events")
    op.drop_index("ix_proofs_file_id_created_at", table_name="proofs")
    op.drop_index("ix_proofs_token_hash", table_name="proofs")
    op.drop_index("ix_proofs_tx_hash", table_name="proofs")
    op.drop_index("ix_proofs_proof_status", table_name="proofs")
    op.drop_table("proofs")
