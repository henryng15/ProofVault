from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.case_event import CaseEvent
from app.models.evidence_file import EvidenceFile
from app.schemas.case import CreateCaseRequest, TimelineEventResponse


_EVENT_LABELS: dict[str, str] = {
    "proof_requested": "Proof requested",
    "proof_confirmed": "Blockchain proof confirmed",
    "file_added": "Evidence uploaded and hashed",
    "verification_completed": "File verification completed",
}


def create_case(
    session: Session,
    owner_user_id: UUID,
    payload: CreateCaseRequest,
) -> Case:
    case = Case(
        owner_user_id=owner_user_id,
        title=payload.title,
        description=payload.description,
    )
    session.add(case)
    session.flush()
    return case


def list_cases(
    session: Session,
    owner_user_id: UUID,
) -> list[Case]:
    return (
        session.query(Case)
        .filter(Case.owner_user_id == owner_user_id)
        .order_by(Case.created_at.desc())
        .all()
    )


def get_case_detail(
    session: Session,
    case_id: UUID,
    owner_user_id: UUID,
) -> tuple[Case, list[EvidenceFile]]:
    case = session.get(Case, case_id)
    if case is None:
        raise LookupError("case not found")
    if case.owner_user_id != owner_user_id:
        raise PermissionError("you do not own this case")

    files = (
        session.query(EvidenceFile)
        .filter(EvidenceFile.case_id == case_id)
        .order_by(EvidenceFile.created_at.asc())
        .all()
    )
    return case, files


def get_case_timeline(
    session: Session,
    case_id: UUID,
) -> list[TimelineEventResponse]:
    events = session.scalars(
        select(CaseEvent)
        .where(CaseEvent.case_id == case_id)
        .order_by(CaseEvent.created_at.desc())
    ).all()

    return [
        TimelineEventResponse(
            event_type=e.event_type,
            description=_EVENT_LABELS.get(e.event_type, e.event_type.replace("_", " ").title()),
            created_at=e.created_at,
        )
        for e in events
    ]
