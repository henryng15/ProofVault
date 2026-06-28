from uuid import uuid4

from app.schemas.proof import ProofConfirmationRequest, ProofConfirmationResponse, ProofStatus


class BlockchainService:
    def mock_confirm(self, payload: ProofConfirmationRequest) -> ProofConfirmationResponse:
        return ProofConfirmationResponse(
            id=uuid4(),
            proof_status=ProofStatus.CONFIRMED,
            tx_hash=payload.tx_hash,
            block_number=payload.block_number,
            chain_id=payload.chain_id,
            created_at=__import__("datetime").datetime.utcnow(),
        )


blockchain_service = BlockchainService()
