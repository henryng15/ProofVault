from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ShareLinkResponse(BaseModel):
    token: str
    share_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ShareFileReport(BaseModel):
    file_name: str
    file_size: int
    mime_type: str
    file_hash: str | None
    proof_status: str | None
    tx_hash: str | None
    block_number: int | None
    chain_id: int | None


class ShareReportResponse(BaseModel):
    case_id: UUID
    case_title: str
    case_description: str | None
    created_at: datetime
    files: list[ShareFileReport]
