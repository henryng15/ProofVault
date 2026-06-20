from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"
    __table_args__ = (
        Index(
            "ix_verification_attempts_file_id_created_at", "file_id", "created_at"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    proof_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("proofs.id", ondelete="CASCADE"), nullable=False
    )
    file_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    uploaded_hash: Mapped[str] = mapped_column(String(66), nullable=False)
    result: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
