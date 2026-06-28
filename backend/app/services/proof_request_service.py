import hashlib
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.evidence_file import EvidenceFile
from app.models.proof import Proof
from app.schemas.proof import ProofRequestResponse, ProofStatus


def _to_bytes32_hex(value: str) -> str:
    # Hashes a string into a 32-byte hex string (0x-prefixed, 64 hex chars).
    # This is what Solidity's bytes32 expects.
    digest = hashlib.sha256(value.encode()).hexdigest()
    return "0x" + digest


def _build_metadata_hash(case_id: UUID, file_id: UUID, file_name: str) -> str:
    # Combines case + file identifiers into a single deterministic metadata hash.
    # The smart contract stores this alongside the file hash for extra provenance.
    raw = f"{case_id}:{file_id}:{file_name}"
    return _to_bytes32_hex(raw)


def create_proof_request(
    session: Session,
    file_id: UUID,
    owner_user_id: UUID,
) -> ProofRequestResponse:
    # Step 1: Load the file and verify ownership.
    evidence_file = session.get(EvidenceFile, file_id)
    if evidence_file is None:
        raise LookupError("file not found")
    if evidence_file.owner_user_id != owner_user_id:
        raise PermissionError("you do not own this file")

    # Step 2: File hash must exist before a proof can be requested.
    # The user must call POST /files/{id}/hash-confirm first.
    if evidence_file.file_hash is None:
        raise ValueError("file hash not confirmed yet — call hash-confirm first")

    # Step 3: Convert values to bytes32 hex for the smart contract.
    case_id_bytes32 = _to_bytes32_hex(str(evidence_file.case_id))
    file_hash_bytes32 = "0x" + evidence_file.file_hash.lower().zfill(64)
    metadata_hash_bytes32 = _build_metadata_hash(
        evidence_file.case_id,
        evidence_file.id,
        evidence_file.file_name,
    )

    # Step 4: Create a Proof row with status "pending".
    # This row tracks the blockchain transaction lifecycle.
    proof = Proof(
        id=uuid4(),
        file_id=file_id,
        chain_id=settings.chain_id,
        proof_status=ProofStatus.PENDING,
        token_hash=metadata_hash_bytes32,
    )
    session.add(proof)
    session.flush()

    # Step 5: Create a case_event audit row for "proof_requested".
    try:
        from app.models.case_event import CaseEvent
        session.add(
            CaseEvent(
                case_id=evidence_file.case_id,
                file_id=file_id,
                event_type="proof_requested",
                event_data={
                    "proof_id": str(proof.id),
                    "file_hash": evidence_file.file_hash,
                    "chain_id": settings.chain_id,
                },
            )
        )
        session.flush()
    except ImportError:
        # CaseEvent model not yet created by Dev B — skip for now.
        pass

    return ProofRequestResponse(
        proof_id=proof.id,
        file_id=evidence_file.id,
        case_id=evidence_file.case_id,
        case_id_bytes32=case_id_bytes32,
        file_hash_bytes32=file_hash_bytes32,
        metadata_hash_bytes32=metadata_hash_bytes32,
        proof_status=ProofStatus.PENDING,
        chain_id=settings.chain_id,
        contract_address=settings.contract_address,
    )
