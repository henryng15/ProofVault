from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateCaseRequest(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = None


class CaseResponse(BaseModel):
    id: UUID
    owner_user_id: UUID
    title: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CaseDetailResponse(CaseResponse):
    files: list[dict] = []


class TimelineEventResponse(BaseModel):
    event_type: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineResponse(BaseModel):
    case_id: UUID
    events: list[TimelineEventResponse] = []
