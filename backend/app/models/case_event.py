from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Index, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CaseEvent(Base):
    __tablename__ = "case_events"
    __table_args__ = (
        Index("ix_case_events_case_id", "case_id"),
        Index("ix_case_events_file_id", "file_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    case_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    file_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    event_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
