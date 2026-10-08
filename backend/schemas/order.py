from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class OrderItemInput(BaseModel):
    product_id: UUID
    quantity: int = Field(..., ge=1, le=99)


class MockCardPayment(BaseModel):
    card_number: str = Field(..., min_length=13, max_length=23)
    card_name: str | None = Field(default=None, max_length=100)
    expiry: str | None = Field(default=None, max_length=7)


class MockUpiPayment(BaseModel):
    upi_id: str = Field(..., min_length=3, max_length=100)


PaymentMethod = Literal["mock_card", "mock_upi", "mock_cod"]


class OrderCreate(BaseModel):
    store_id: UUID
    items: list[OrderItemInput] = Field(..., min_length=1)
    payment_method: PaymentMethod
    card: MockCardPayment | None = None
    upi: MockUpiPayment | None = None
    address_id: UUID | None = None

    @model_validator(mode="after")
    def validate_payment_payload(self) -> OrderCreate:
        if self.payment_method == "mock_card" and self.card is None:
            raise ValueError("Card details are required for card payment")
        if self.payment_method == "mock_upi" and self.upi is None:
            raise ValueError("UPI ID is required for UPI payment")
        return self


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal


class OrderResponse(BaseModel):
    id: UUID
    store_id: UUID
    store_name: str | None = None
    status: str
    subtotal: Decimal | None
    tax_amount: Decimal | None
    delivery_fee: Decimal | None
    total_amount: Decimal
    payment_method: str | None
    payment_status: str
    delivery_address: str
    created_at: datetime
    items: list[OrderItemResponse] = Field(default_factory=list)


class OrderSummaryResponse(BaseModel):
    id: UUID
    store_id: UUID
    store_name: str | None = None
    status: str
    total_amount: Decimal
    payment_method: str | None
    item_count: int
    created_at: datetime
