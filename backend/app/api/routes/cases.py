from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.case import (
    CaseDetailResponse,
    CaseResponse,
    CreateCaseRequest,
    TimelineResponse,
)
from app.schemas.file import FileMetadataResponse
from app.services.case_service import create_case, get_case_detail, get_case_timeline, list_cases

router = APIRouter(prefix="/cases", tags=["cases"])


def owner_id(x_user_id: UUID = Header(alias="X-User-Id")) -> UUID:
    return x_user_id


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case_route(
    payload: CreateCaseRequest,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> CaseResponse:
    with session.begin():
        case = create_case(session, user_id, payload)
    return CaseResponse.model_validate(case)


@router.get("", response_model=list[CaseResponse])
def list_cases_route(
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> list[CaseResponse]:
    cases = list_cases(session, user_id)
    return [CaseResponse.model_validate(c) for c in cases]


@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case_route(
    case_id: UUID,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> CaseDetailResponse:
    try:
        case, files = get_case_detail(session, case_id, user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    response = CaseDetailResponse.model_validate(case)
    response.files = [FileMetadataResponse.model_validate(f) for f in files]
    return response


@router.get("/{case_id}/timeline", response_model=TimelineResponse)
def get_case_timeline_route(
    case_id: UUID,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> TimelineResponse:
    try:
        case, _ = get_case_detail(session, case_id, user_id)
        events = get_case_timeline(session, case_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return TimelineResponse(case_id=case.id, events=events)
