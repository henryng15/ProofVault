from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.file import (
    FileMetadataResponse,
    HashConfirmRequest,
    PresignRequest,
    PresignResponse,
)
from app.schemas.proof import ProofRequestResponse
from app.services.file_service import confirm_file_hash, create_file_metadata
from app.services.proof_request_service import create_proof_request
from app.services.storage_service import storage_service

router = APIRouter(tags=["files"])


def owner_id(x_user_id: UUID = Header(alias="X-User-Id")) -> UUID:
    return x_user_id


@router.post(
    "/cases/{case_id}/files/presign",
    response_model=PresignResponse,
    status_code=status.HTTP_201_CREATED,
)
def presign_file_upload(
    case_id: UUID,
    payload: PresignRequest,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> PresignResponse:
    try:
        with session.begin():
            evidence_file = create_file_metadata(session, case_id, user_id, payload)
            upload_url = storage_service.create_upload_url(
                evidence_file.object_key, evidence_file.mime_type
            )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return PresignResponse(
        file_id=evidence_file.id,
        object_key=evidence_file.object_key,
        upload_url=upload_url,
        headers={"Content-Type": evidence_file.mime_type},
    )


@router.post("/files/{file_id}/hash-confirm", response_model=FileMetadataResponse)
def hash_confirm(
    file_id: UUID,
    payload: HashConfirmRequest,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> FileMetadataResponse:
    try:
        with session.begin():
            evidence_file = confirm_file_hash(session, file_id, user_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return FileMetadataResponse.model_validate(evidence_file)


@router.post(
    "/files/{file_id}/proof-request",
    response_model=ProofRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def proof_request(
    file_id: UUID,
    user_id: UUID = Depends(owner_id),
    session: Session = Depends(get_db),
) -> ProofRequestResponse:
    try:
        with session.begin():
            response = create_proof_request(session, file_id, user_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return response
