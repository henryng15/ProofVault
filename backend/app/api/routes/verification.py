from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.verification import VerifyFileRequest, VerifyFileResponse
from app.services.verification_service import verify_file

router = APIRouter(tags=["verification"])


@router.post("/verify/file", response_model=VerifyFileResponse)
def verify_uploaded_file(
    payload: VerifyFileRequest,
    session: Session = Depends(get_db),
) -> VerifyFileResponse:
    try:
        with session.begin():
            attempt = verify_file(session, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return VerifyFileResponse(
        verification_attempt_id=attempt.id,
        file_id=attempt.file_id,
        result=attempt.result,
    )
