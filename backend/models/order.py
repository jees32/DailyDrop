import uuid
from datetime import datetime
from decimal import Decimal

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.enums import OrderStatus, order_status_enum


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    consumer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id"),
        nullable=False,
    )
    delivery_partner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    status: Mapped[OrderStatus] = mapped_column(
        order_status_enum,
        nullable=False,
        server_default=OrderStatus.pending.value,
    )
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    tax_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    delivery_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="paid"
    )
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_location: Mapped[object] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} status={self.status}>"
