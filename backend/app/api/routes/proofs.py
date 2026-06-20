from fastapi import APIRouter, status

from app.schemas.proof import ProofConfirmationRequest, ProofConfirmationResponse
from app.services.blockchain_service import blockchain_service

router = APIRouter(prefix="/proofs", tags=["proofs"])


@router.post(
    "/mock-confirm",
    response_model=ProofConfirmationResponse,
    status_code=status.HTTP_201_CREATED,
)
def mock_confirm_proof(payload: ProofConfirmationRequest) -> ProofConfirmationResponse:
    return blockchain_service.mock_confirm(payload)
