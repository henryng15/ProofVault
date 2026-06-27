from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, DateTime, Index, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Proof(Base):
    __tablename__ = "proofs"
    __table_args__ = (
        Index("ix_proofs_proof_status", "proof_status"),
        Index("ix_proofs_tx_hash", "tx_hash", unique=True),
        Index("ix_proofs_token_hash", "token_hash"),
        Index("ix_proofs_file_id_created_at", "file_id", "created_at"),
        UniqueConstraint("file_id", "chain_id", name="uq_proofs_file_id_chain_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    file_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    chain_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    proof_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", server_default="pending"
    )
    token_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
