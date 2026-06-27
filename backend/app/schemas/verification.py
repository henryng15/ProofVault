from uuid import UUID

from pydantic import BaseModel, Field


class VerifyFileRequest(BaseModel):
    file_id: UUID
    uploaded_hash: str = Field(pattern=r"^[0-9a-fA-F]{64}$")


class VerifyFileResponse(BaseModel):
    verification_attempt_id: UUID
    file_id: UUID
    result: str
