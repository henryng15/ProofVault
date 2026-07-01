from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.share import ShareLinkResponse, ShareReportResponse
from app.services.share_service import create_share, get_share_report

router = APIRouter(tags=["share"])


def owner_id(x_user_id: UUID = Header(alias="X-User-Id")) -> UUID:
    return x_user_id


@router.post("/cases/{case_id}/share", response_model=ShareLinkResponse)
def share_case(
    case_id: UUID,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> ShareLinkResponse:
    try:
        with session.begin():
            return create_share(session, case_id, user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


# No auth — the unguessable token is the credential.
@router.get("/share/{token}", response_model=ShareReportResponse)
def view_share(
    token: str,
    session: Session = Depends(get_db),
) -> ShareReportResponse:
    try:
        return get_share_report(session, token)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
