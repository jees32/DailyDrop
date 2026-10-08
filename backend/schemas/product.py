from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from models.enums import ProductCategory


class ProductCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock_count: int = Field(ge=0, default=0)
    category: ProductCategory
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=512)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Product name cannot be empty")
        return trimmed

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("image_url")
    @classmethod
    def strip_image_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    stock_count: int | None = Field(default=None, ge=0)
    category: ProductCategory | None = None
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=512)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Product name cannot be empty")
        return trimmed

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @field_validator("image_url")
    @classmethod
    def strip_image_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class ProductResponse(BaseModel):
    id: UUID
    store_id: UUID
    name: str
    description: str | None = None
    price: Decimal
    stock_count: int
    category: str
    image_url: str
    created_at: datetime
