from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.case import Case
from app.models.case_event import CaseEvent
from app.models.evidence_file import EvidenceFile
from app.models.proof import Proof
from app.models.verification_attempt import VerificationAttempt
from app.services.storage_service import storage_service

engine = create_engine(
    "sqlite+pysqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
client = TestClient(app)


@pytest.fixture(autouse=True)
def database(monkeypatch: pytest.MonkeyPatch):
    Base.metadata.create_all(engine)

    def override_db():
        with TestingSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    monkeypatch.setattr(
        storage_service,
        "create_upload_url",
        lambda key, mime: f"http://local-s3.test/{key}?content-type={mime}",
    )
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


def test_upload_and_hash_confirm() -> None:
    owner_id = uuid4()
    case_id = uuid4()
    with TestingSession.begin() as session:
        session.add(Case(id=case_id, owner_user_id=owner_id, title="Move-in"))

    response = client.post(
        f"/cases/{case_id}/files/presign",
        headers={"X-User-Id": str(owner_id)},
        json={
            "file_name": "kitchen.jpg",
            "file_size": 2048,
            "mime_type": "image/jpeg",
        },
    )
    assert response.status_code == 201
    file_id = response.json()["file_id"]
    assert response.json()["method"] == "PUT"

    denied = client.post(
        f"/files/{file_id}/hash-confirm",
        headers={"X-User-Id": str(uuid4())},
        json={"file_hash": "a" * 64, "hash_algorithm": "sha256"},
    )
    assert denied.status_code == 403

    confirmed = client.post(
        f"/files/{file_id}/hash-confirm",
        headers={"X-User-Id": str(owner_id)},
        json={"file_hash": "a" * 64, "hash_algorithm": "sha256"},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["file_hash"] == "a" * 64


def test_reject_unsupported_file_type() -> None:
    owner_id = uuid4()
    case_id = uuid4()
    with TestingSession.begin() as session:
        session.add(Case(id=case_id, owner_user_id=owner_id, title="Move-in"))

    response = client.post(
        f"/cases/{case_id}/files/presign",
        headers={"X-User-Id": str(owner_id)},
        json={
            "file_name": "archive.zip",
            "file_size": 100,
            "mime_type": "application/zip",
        },
    )
    assert response.status_code == 422


def test_verify_match_and_mismatch() -> None:
    owner_id = uuid4()
    case_id = uuid4()
    file_id = uuid4()
    proof_id = uuid4()
    with TestingSession.begin() as session:
        session.add(Case(id=case_id, owner_user_id=owner_id, title="Move-in"))
        session.add(
            EvidenceFile(
                id=file_id,
                case_id=case_id,
                owner_user_id=owner_id,
                file_name="room.jpg",
                object_key=f"files/{file_id}",
                file_size=100,
                mime_type="image/jpeg",
                file_hash="b" * 64,
                hash_algorithm="sha256",
            )
        )
        session.add(
            Proof(id=proof_id, file_id=file_id, chain_id=80002, proof_status="confirmed")
        )

    match = client.post(
        "/verify/file",
        json={"file_id": str(file_id), "uploaded_hash": "b" * 64},
    )
    mismatch = client.post(
        "/verify/file",
        json={"file_id": str(file_id), "uploaded_hash": "c" * 64},
    )
    assert match.json()["result"] == "match"
    assert mismatch.json()["result"] == "mismatch"

    with TestingSession() as session:
        results = session.scalars(
            select(VerificationAttempt.result).order_by(VerificationAttempt.created_at)
        ).all()
    assert results == ["match", "mismatch"]


def test_confirm_proof_adds_case_event() -> None:
    owner_id = uuid4()
    case_id = uuid4()
    file_id = uuid4()
    proof_id = uuid4()
    with TestingSession.begin() as session:
        session.add(Case(id=case_id, owner_user_id=owner_id, title="Move-in"))
        session.add(
            EvidenceFile(
                id=file_id,
                case_id=case_id,
                owner_user_id=owner_id,
                file_name="room.jpg",
                object_key=f"files/{file_id}",
                file_size=100,
                mime_type="image/jpeg",
            )
        )
        session.add(Proof(id=proof_id, file_id=file_id, chain_id=80002))

    response = client.post(
        f"/proofs/{proof_id}/confirm",
        json={
            "case_id": str(case_id),
            "tx_hash": "0xabc123",
            "block_number": 123,
            "chain_id": 80002,
        },
    )
    assert response.status_code == 200

    with TestingSession() as session:
        proof = session.get(Proof, proof_id)
        event = session.scalar(
            select(CaseEvent).where(CaseEvent.file_id == file_id)
        )
    assert proof is not None and proof.proof_status == "confirmed"
    assert event is not None and event.event_type == "proof_confirmed"
