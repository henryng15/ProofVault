from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class ProofStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class ProofRequest(BaseModel):
    file_id: UUID
    case_id: UUID
    file_hash: str = Field(min_length=1, max_length=66)
    metadata_hash: str = Field(min_length=1, max_length=66)


class ProofConfirmationRequest(BaseModel):
    tx_hash: str = Field(min_length=3, max_length=66)
    block_number: int = Field(ge=0)
    chain_id: int = Field(gt=0)


class ProofConfirmationResponse(ProofConfirmationRequest):
    id: UUID
    proof_status: ProofStatus
    created_at: datetime
