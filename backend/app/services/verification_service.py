from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.evidence_file import EvidenceFile
from app.models.proof import Proof
from app.models.verification_attempt import VerificationAttempt
from app.schemas.verification import VerifyFileRequest
from app.services.blockchain_reader import get_file_hash_from_blockchain


def verify_file(session: Session, payload: VerifyFileRequest) -> VerificationAttempt:
    # Step 1: Load the evidence file — we need it for ownership and proof lookup.
    evidence_file = session.get(EvidenceFile, payload.file_id)
    if evidence_file is None:
        raise LookupError("file not found")

    # Step 2: Load the latest confirmed proof for this file.
    # We need proof.tx_hash to look up the on-chain data.
    proof = session.scalar(
        select(Proof)
        .where(Proof.file_id == payload.file_id)
        .where(Proof.proof_status == "confirmed")
        .order_by(Proof.created_at.desc())
        .limit(1)
    )
    if proof is None:
        raise LookupError("no confirmed proof found for this file")

    if proof.tx_hash is None:
        raise LookupError("proof has no transaction hash — cannot verify on-chain")

    # Step 3: Fetch the original fileHash directly from the blockchain.
    # This is the ground truth — immutable, tamper-proof.
    # If PostgreSQL was hacked and file_hash changed, this still returns
    # the real value that was recorded on-chain.
    on_chain_file_hash = get_file_hash_from_blockchain(
        tx_hash=proof.tx_hash,
        contract_address=settings.contract_address,
    )

    # Step 4: Compare the re-uploaded file hash against the on-chain hash.
    result = (
        "match"
        if on_chain_file_hash.lower() == payload.uploaded_hash.lower()
        else "mismatch"
    )

    # Step 5: Save the verification attempt as an audit record.
    attempt = VerificationAttempt(
        proof_id=proof.id,
        file_id=evidence_file.id,
        uploaded_hash=payload.uploaded_hash.lower(),
        result=result,
    )
    session.add(attempt)
    session.flush()
    return attempt
