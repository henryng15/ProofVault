from datetime import datetime, timezone
from threading import Lock
from uuid import UUID, uuid4

from app.schemas.proof import (
    ProofConfirmationRequest,
    ProofConfirmationResponse,
    ProofStatus,
)


class BlockchainService:
    def __init__(self) -> None:
        self._proofs: dict[UUID, ProofConfirmationResponse] = {}
        self._lock = Lock()

    def mock_confirm(
        self, payload: ProofConfirmationRequest
    ) -> ProofConfirmationResponse:
        proof = ProofConfirmationResponse(
            id=uuid4(),
            tx_hash=payload.tx_hash,
            block_number=payload.block_number,
            chain_id=payload.chain_id,
            proof_status=ProofStatus.CONFIRMED,
            created_at=datetime.now(timezone.utc),
        )

        with self._lock:
            self._proofs[proof.id] = proof

        return proof

    def get_mock_proof(self, proof_id: UUID) -> ProofConfirmationResponse | None:
        with self._lock:
            return self._proofs.get(proof_id)

    def clear_mock_proofs(self) -> None:
        with self._lock:
            self._proofs.clear()


blockchain_service = BlockchainService()
