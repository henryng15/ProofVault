"""add proof file and chain uniqueness

Revision ID: c92e0a314db7
Revises: b17c4f21a830
Create Date: 2026-06-26
"""

from alembic import op

revision = "c92e0a314db7"
down_revision = "b17c4f21a830"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("proofs") as batch_op:
        batch_op.create_unique_constraint(
            "uq_proofs_file_id_chain_id", ["file_id", "chain_id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("proofs") as batch_op:
        batch_op.drop_constraint("uq_proofs_file_id_chain_id", type_="unique")
