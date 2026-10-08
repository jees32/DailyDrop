from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class DeliveryOrderSummaryResponse(BaseModel):
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
    delivery_partner_id: UUID | None = None
    created_at: datetime
