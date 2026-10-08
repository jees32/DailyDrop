from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    id: UUID
    email: str | None = None
    phone_number: str | None = None
    full_name: str | None = None
    role: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    address_count: int = 0
    has_default_address: bool = False


class UserMeUpsert(BaseModel):
    email: str | None = Field(
        default=None,
        description="Optional override; defaults to email from JWT claims",
    )
    phone_number: str | None = Field(
        default=None,
        description="Optional override; defaults to phone from JWT claims",
    )
    full_name: str | None = Field(default=None, max_length=255)


class UserMeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
