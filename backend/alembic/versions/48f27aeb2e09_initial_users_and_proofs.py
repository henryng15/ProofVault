"""initial users and proofs

Revision ID: 48f27aeb2e09
Revises:
Create Date: 2026-06-26
"""

from alembic import op
import sqlalchemy as sa

revision = "48f27aeb2e09"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

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
            nullable=False,
            server_default="pending",
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
    op.create_index("ix_proofs_file_id_created_at", "proofs", ["file_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_proofs_file_id_created_at", table_name="proofs")
    op.drop_index("ix_proofs_token_hash", table_name="proofs")
    op.drop_index("ix_proofs_tx_hash", table_name="proofs")
    op.drop_index("ix_proofs_proof_status", table_name="proofs")
    op.drop_table("proofs")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
