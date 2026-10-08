from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MerchantStoreResponse(BaseModel):
    id: UUID
    store_name: str
    town: str | None = None
    is_active: bool


class MerchantOrderSummaryResponse(BaseModel):
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
    delivery_address: str
    created_at: datetime


class MerchantOrderStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1)
