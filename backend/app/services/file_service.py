from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.evidence_file import EvidenceFile
from app.schemas.file import HashConfirmRequest, PresignRequest

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


def create_file_metadata(
    session: Session,
    case_id: UUID,
    owner_user_id: UUID,
    payload: PresignRequest,
) -> EvidenceFile:
    case = session.get(Case, case_id)
    if case is None:
        raise LookupError("case not found")
    if case.owner_user_id != owner_user_id:
        raise PermissionError("you do not own this case")
    if payload.mime_type not in ALLOWED_MIME_TYPES:
        raise ValueError("unsupported file type")

    safe_name = Path(payload.file_name).name
    if not safe_name:
        raise ValueError("file name is required")

    file_id = uuid4()
    evidence_file = EvidenceFile(
        id=file_id,
        case_id=case_id,
        owner_user_id=owner_user_id,
        file_name=safe_name,
        object_key=f"cases/{case_id}/files/{file_id}/{safe_name}",
        file_size=payload.file_size,
        mime_type=payload.mime_type,
    )
    session.add(evidence_file)
    session.flush()
    return evidence_file


def confirm_file_hash(
    session: Session,
    file_id: UUID,
    owner_user_id: UUID,
    payload: HashConfirmRequest,
) -> EvidenceFile:
    evidence_file = session.get(EvidenceFile, file_id)
    if evidence_file is None:
        raise LookupError("file not found")
    if evidence_file.owner_user_id != owner_user_id:
        raise PermissionError("you do not own this file")

    evidence_file.file_hash = payload.file_hash.lower()
    evidence_file.hash_algorithm = payload.hash_algorithm
    session.flush()
    return evidence_file
