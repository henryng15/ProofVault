from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.proof import (
    ProofConfirmationRequest,
    ProofConfirmationResponse,
    StoredProofConfirmationRequest,
)
from app.services.blockchain_service import blockchain_service
from app.services.proof_service import confirm_proof_and_add_event

router = APIRouter(prefix="/proofs", tags=["proofs"])


@router.post(
    "/mock-confirm",
    response_model=ProofConfirmationResponse,
    status_code=status.HTTP_201_CREATED,
)
def mock_confirm_proof(payload: ProofConfirmationRequest) -> ProofConfirmationResponse:
    return blockchain_service.mock_confirm(payload)


@router.post("/{proof_id}/confirm")
def confirm_stored_proof(
    proof_id: UUID,
    payload: StoredProofConfirmationRequest,
    session: Session = Depends(get_db),
) -> dict[str, str]:
    try:
        proof = confirm_proof_and_add_event(session, proof_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {"proof_id": str(proof.id), "proof_status": proof.proof_status}
