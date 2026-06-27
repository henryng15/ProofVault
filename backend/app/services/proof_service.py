from uuid import UUID

from sqlalchemy.orm import Session

from app.models.case_event import CaseEvent
from app.models.proof import Proof
from app.schemas.proof import StoredProofConfirmationRequest


def confirm_proof_and_add_event(
    session: Session,
    proof_id: UUID,
    payload: StoredProofConfirmationRequest,
) -> Proof:
    with session.begin():
        proof = session.get(Proof, proof_id)
        if proof is None:
            raise LookupError("proof not found")

        proof.tx_hash = payload.tx_hash
        proof.block_number = payload.block_number
        proof.chain_id = payload.chain_id
        proof.proof_status = "confirmed"
        session.add(
            CaseEvent(
                case_id=payload.case_id,
                file_id=proof.file_id,
                event_type="proof_confirmed",
                event_data={
                    "proof_id": str(proof.id),
                    "tx_hash": payload.tx_hash,
                    "chain_id": payload.chain_id,
                },
            )
        )
        session.flush()

    return proof
