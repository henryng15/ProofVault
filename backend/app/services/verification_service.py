from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence_file import EvidenceFile
from app.models.proof import Proof
from app.models.verification_attempt import VerificationAttempt
from app.schemas.verification import VerifyFileRequest


def verify_file(session: Session, payload: VerifyFileRequest) -> VerificationAttempt:
    evidence_file = session.get(EvidenceFile, payload.file_id)
    if evidence_file is None or evidence_file.file_hash is None:
        raise LookupError("original file hash not found")

    proof = session.scalar(
        select(Proof)
        .where(Proof.file_id == payload.file_id)
        .order_by(Proof.created_at.desc())
        .limit(1)
    )
    if proof is None:
        raise LookupError("proof not found")

    result = (
        "match"
        if evidence_file.file_hash.lower() == payload.uploaded_hash.lower()
        else "mismatch"
    )
    attempt = VerificationAttempt(
        proof_id=proof.id,
        file_id=evidence_file.id,
        uploaded_hash=payload.uploaded_hash.lower(),
        result=result,
    )
    session.add(attempt)
    session.flush()
    return attempt
