import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.case import Case
from app.models.evidence_file import EvidenceFile
from app.models.proof import Proof
from app.models.share_link import ShareLink
from app.schemas.share import ShareFileReport, ShareLinkResponse, ShareReportResponse


def create_share(session: Session, case_id: UUID, owner_user_id: UUID) -> ShareLinkResponse:
    case = session.get(Case, case_id)
    if case is None:
        raise LookupError("case not found")
    if case.owner_user_id != owner_user_id:
        raise PermissionError("you do not own this case")

    # Check if a share link already exists for this case and reuse it.
    existing = session.scalar(
        select(ShareLink).where(ShareLink.case_id == case_id)
    )
    if existing:
        link = existing
    else:
        # secrets.token_urlsafe(32) gives 256 bits of entropy —
        # unguessable even at billions of attempts per second.
        token = secrets.token_urlsafe(32)
        link = ShareLink(token=token, case_id=case_id)
        session.add(link)
        session.flush()

    share_url = f"{settings.frontend_url}?share={link.token}"
    return ShareLinkResponse(
        token=link.token,
        share_url=share_url,
        created_at=link.created_at,
    )


def get_share_report(session: Session, token: str) -> ShareReportResponse:
    link = session.scalar(select(ShareLink).where(ShareLink.token == token))
    if link is None:
        raise LookupError("share link not found or expired")

    case = session.get(Case, link.case_id)
    if case is None:
        raise LookupError("case not found")

    files = session.scalars(
        select(EvidenceFile)
        .where(EvidenceFile.case_id == link.case_id)
        .order_by(EvidenceFile.created_at.asc())
    ).all()

    file_reports: list[ShareFileReport] = []
    for f in files:
        proof = session.scalar(
            select(Proof)
            .where(Proof.file_id == f.id)
            .where(Proof.proof_status == "confirmed")
            .order_by(Proof.created_at.desc())
            .limit(1)
        )
        file_reports.append(
            ShareFileReport(
                file_name=f.file_name,
                file_size=f.file_size,
                mime_type=f.mime_type,
                file_hash=f.file_hash,
                proof_status=proof.proof_status if proof else None,
                tx_hash=proof.tx_hash if proof else None,
                block_number=proof.block_number if proof else None,
                chain_id=proof.chain_id if proof else None,
            )
        )

    return ShareReportResponse(
        case_id=case.id,
        case_title=case.title,
        case_description=case.description,
        created_at=case.created_at,
        files=file_reports,
    )
