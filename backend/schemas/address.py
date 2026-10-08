from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class LocationInput(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class AddressCreate(BaseModel):
    label: str = Field(default="Home", max_length=50)
    recipient_name: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=15)
    address_line1: str = Field(..., min_length=3, max_length=500)
    address_line2: str | None = Field(default=None, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    pincode: str | None = Field(default=None, max_length=10)
    location: LocationInput
    is_default: bool = True


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=50)
    recipient_name: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=15)
    address_line1: str | None = Field(default=None, min_length=3, max_length=500)
    address_line2: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    pincode: str | None = Field(default=None, max_length=10)
    location: LocationInput | None = None
    is_default: bool | None = None


class AddressResponse(BaseModel):
    id: UUID
    user_id: UUID
    label: str
    recipient_name: str | None
    contact_phone: str | None
    address_line1: str
    address_line2: str | None
    city: str
    pincode: str | None
    location: LocationInput
    is_default: bool
    created_at: datetime

    @property
    def formatted(self) -> str:
        parts = [self.address_line1]
        if self.address_line2:
            parts.append(self.address_line2)
        parts.append(self.city)
        if self.pincode:
            parts.append(self.pincode)
        return ", ".join(parts)
