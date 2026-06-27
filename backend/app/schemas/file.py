from uuid import UUID

from pydantic import BaseModel, Field


class PresignRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    file_size: int = Field(gt=0, le=25 * 1024 * 1024)
    mime_type: str = Field(min_length=3, max_length=120)


class PresignResponse(BaseModel):
    file_id: UUID
    object_key: str
    upload_url: str
    method: str = "PUT"
    headers: dict[str, str]


class HashConfirmRequest(BaseModel):
    file_hash: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    hash_algorithm: str = Field(default="sha256", pattern=r"^sha256$")


class FileMetadataResponse(BaseModel):
    id: UUID
    case_id: UUID
    file_name: str
    object_key: str
    file_size: int
    mime_type: str
    file_hash: str | None
    hash_algorithm: str | None

    model_config = {"from_attributes": True}
