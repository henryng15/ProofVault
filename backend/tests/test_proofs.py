from uuid import UUID

from fastapi.testclient import TestClient

from app.main import app
from app.services.blockchain_service import blockchain_service

client = TestClient(app)


def setup_function() -> None:
    blockchain_service.clear_mock_proofs()


def test_mock_confirm_stores_confirmed_proof() -> None:
    response = client.post(
        "/proofs/mock-confirm",
        json={"tx_hash": "0xabc123", "block_number": 42, "chain_id": 80002},
    )

    assert response.status_code == 201
    body = response.json()
    proof_id = UUID(body["id"])
    assert body["proof_status"] == "confirmed"
    assert body["tx_hash"] == "0xabc123"
    assert body["block_number"] == 42
    assert body["chain_id"] == 80002
    assert blockchain_service.get_mock_proof(proof_id) is not None


def test_mock_confirm_rejects_invalid_block_number() -> None:
    response = client.post(
        "/proofs/mock-confirm",
        json={"tx_hash": "0xabc123", "block_number": -1, "chain_id": 80002},
    )

    assert response.status_code == 422
