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


# Returned to the frontend after POST /files/{id}/proof-request.
# The frontend wallet uses these three values to call
# contract.createProof(caseId, fileHash, metadataHash) on-chain.
class ProofRequestResponse(BaseModel):
    proof_id: UUID
    file_id: UUID
    case_id: UUID
    case_id_bytes32: str   # hex string the wallet passes as bytes32
    file_hash_bytes32: str # hex string the wallet passes as bytes32
    metadata_hash_bytes32: str
    proof_status: ProofStatus
    chain_id: int
    contract_address: str


class ProofConfirmationRequest(BaseModel):
    tx_hash: str = Field(min_length=3, max_length=66)
    block_number: int = Field(ge=0)
    chain_id: int = Field(gt=0)


class StoredProofConfirmationRequest(ProofConfirmationRequest):
    case_id: UUID


class ProofConfirmationResponse(BaseModel):
    id: UUID
    proof_status: ProofStatus
    tx_hash: str
    block_number: int
    chain_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
