from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.enums import UserRole


class AdminStatsResponse(BaseModel):
    total_orders: int
    active_orders: int
    delivered_orders: int
    cancelled_orders: int
    total_users: int
    total_stores: int


class AdminOrderSummaryResponse(BaseModel):
    id: UUID
    store_id: UUID
    store_name: str | None = None
    consumer_id: UUID
    consumer_email: str | None = None
    consumer_name: str | None = None
    status: str
    total_amount: Decimal
    payment_method: str | None
    item_count: int
    created_at: datetime


class AdminOrderListResponse(BaseModel):
    items: list[AdminOrderSummaryResponse]
    total: int
    limit: int
    offset: int
    query: str
    filter: str


class AdminStoreSummaryResponse(BaseModel):
    id: UUID
    store_name: str
    town: str | None
    is_active: bool
    merchant_id: UUID
    merchant_email: str | None = None
    merchant_name: str | None = None
    product_count: int
    created_at: datetime


class AdminStoreListResponse(BaseModel):
    items: list[AdminStoreSummaryResponse]
    total: int
    limit: int
    offset: int
    query: str


class AdminUserSummaryResponse(BaseModel):
    id: UUID
    email: str | None
    full_name: str | None
    phone_number: str | None
    role: str
    is_active: bool
    is_verified: bool
    store_count: int
    created_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserSummaryResponse]
    total: int
    limit: int
    offset: int
    query: str
    role: str | None = None


class AdminCreateStoreRequest(BaseModel):
    store_name: str = Field(min_length=1, max_length=255)
    town_id: str = Field(min_length=1, max_length=50)
    merchant_id: UUID
    is_active: bool = True


class AdminUpdateStoreRequest(BaseModel):
    store_name: str | None = Field(default=None, min_length=1, max_length=255)
    town_id: str | None = Field(default=None, min_length=1, max_length=50)
    merchant_id: UUID | None = None
    is_active: bool | None = None


class AdminUpdateUserRequest(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
