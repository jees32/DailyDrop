from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import AuthUser, get_current_user
from cache import invalidate_catalog
from database import get_db
from models.enums import OrderStatus, UserRole
from models.order import Order
from models.order_item import OrderItem
from models.product import Product
from models.store import Store
from models.user import User
from schemas.order import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    OrderSummaryResponse,
)

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

TAX_RATE = Decimal("0.05")
DELIVERY_FEE = Decimal("20")
FREE_DELIVERY_MIN = Decimal("199")
MONEY = Decimal("0.01")

CARD_DIGITS_RE = re.compile(r"^\d{16}$")
UPI_ID_RE = re.compile(r"^[\w.-]+@[\w.-]+$", re.IGNORECASE)


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


ADDRESS_SELECT = """
    SELECT
        a.address_line1,
        a.address_line2,
        a.city,
        a.pincode,
        ST_Y(a.location::geometry) AS lat,
        ST_X(a.location::geometry) AS lng
    FROM user_addresses a
"""


def _format_address_row(row) -> str:
    parts = [row.address_line1]
    if row.address_line2:
        parts.append(row.address_line2)
    parts.append(row.city)
    if row.pincode:
        parts.append(row.pincode)
    return ", ".join(parts)


def _validate_mock_payment(payload: OrderCreate) -> None:
    if payload.payment_method == "mock_card":
        assert payload.card is not None
        digits = re.sub(r"\D", "", payload.card.card_number)
        if not CARD_DIGITS_RE.match(digits):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter a valid 16-digit card number (test only — no real charge).",
            )
        if payload.card.expiry:
            if not re.match(r"^\d{2}/\d{2}$", payload.card.expiry.strip()):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Expiry must be MM/YY.",
                )
    elif payload.payment_method == "mock_upi":
        assert payload.upi is not None
        if not UPI_ID_RE.match(payload.upi.upi_id.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter a valid UPI ID (e.g. name@okaxis).",
            )
    elif payload.payment_method == "mock_cod":
        return


def _order_to_response(order: Order, store_name: str | None = None) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        store_id=order.store_id,
        store_name=store_name,
        status=order.status.value if hasattr(order.status, "value") else str(order.status),
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        delivery_fee=order.delivery_fee,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        delivery_address=order.delivery_address,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                unit_price=item.unit_price,
                quantity=item.quantity,
                line_total=item.line_total,
            )
            for item in order.items
        ],
    )


async def _get_delivery_address(
    db: AsyncSession,
    user_id: UUID,
    address_id: UUID | None,
):
    if address_id is not None:
        result = await db.execute(
            text(f"{ADDRESS_SELECT} WHERE a.id = :address_id AND a.user_id = :user_id"),
            {"address_id": address_id, "user_id": user_id},
        )
        row = result.first()
        if row is None:
            raise HTTPException(status_code=404, detail="Address not found")
        return row

    result = await db.execute(
        text(
            f"{ADDRESS_SELECT} WHERE a.user_id = :user_id AND a.is_default = true LIMIT 1"
        ),
        {"user_id": user_id},
    )
    row = result.first()
    if row is None:
        raise HTTPException(
            status_code=400,
            detail="Add a default delivery address before placing an order.",
        )
    return row


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    _validate_mock_payment(payload)

    store_result = await db.execute(
        select(Store).where(Store.id == payload.store_id, Store.is_active.is_(True))
    )
    store = store_result.scalar_one_or_none()
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")

    product_ids = [item.product_id for item in payload.items]
    products_result = await db.execute(
        select(Product).where(Product.id.in_(product_ids), Product.store_id == payload.store_id)
    )
    products = {product.id: product for product in products_result.scalars().all()}

    if len(products) != len(set(product_ids)):
        raise HTTPException(status_code=400, detail="One or more products are invalid for this store")

    subtotal = Decimal("0")
    line_items: list[tuple[Product, int, Decimal]] = []

    for cart_item in payload.items:
        product = products[cart_item.product_id]
        if product.stock_count < cart_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}",
            )
        line_total = _money(Decimal(product.price) * cart_item.quantity)
        subtotal += line_total
        line_items.append((product, cart_item.quantity, line_total))

    subtotal = _money(subtotal)
    tax_amount = _money(subtotal * TAX_RATE)
    delivery_fee = Decimal("0") if subtotal >= FREE_DELIVERY_MIN else DELIVERY_FEE
    total_amount = _money(subtotal + tax_amount + delivery_fee)

    address = await _get_delivery_address(db, auth_user.id, payload.address_id)
    delivery_address = _format_address_row(address)
    delivery_location = WKTElement(
        f"POINT({float(address.lng)} {float(address.lat)})",
        srid=4326,
    )

    order = Order(
        consumer_id=auth_user.id,
        store_id=payload.store_id,
        status=OrderStatus.pending,
        subtotal=subtotal,
        tax_amount=tax_amount,
        delivery_fee=delivery_fee,
        total_amount=total_amount,
        payment_method=payload.payment_method,
        payment_status="paid" if payload.payment_method != "mock_cod" else "pending",
        delivery_address=delivery_address,
        delivery_location=delivery_location,
    )
    db.add(order)
    await db.flush()

    for product, quantity, line_total in line_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                unit_price=product.price,
                quantity=quantity,
                line_total=line_total,
            )
        )
        await db.execute(
            update(Product)
            .where(Product.id == product.id)
            .values(stock_count=Product.stock_count - quantity)
        )

    await db.commit()
    await invalidate_catalog(store_id=payload.store_id)

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    created = result.scalar_one()
    return _order_to_response(created, store.store_name)


@router.get("", response_model=list[OrderSummaryResponse])
async def list_orders(
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[OrderSummaryResponse]:
    result = await db.execute(
        text(
            """
            SELECT
                o.id,
                o.store_id,
                s.store_name,
                o.status::text AS status,
                o.total_amount,
                o.payment_method,
                o.created_at,
                COUNT(oi.id)::int AS item_count
            FROM orders o
            JOIN stores s ON s.id = o.store_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.consumer_id = :user_id
            GROUP BY o.id, s.store_name
            ORDER BY o.created_at DESC
            """
        ),
        {"user_id": auth_user.id},
    )

    return [
        OrderSummaryResponse(
            id=row.id,
            store_id=row.store_id,
            store_name=row.store_name,
            status=row.status,
            total_amount=row.total_amount,
            payment_method=row.payment_method,
            item_count=row.item_count,
            created_at=row.created_at,
        )
        for row in result.all()
    ]


async def _user_is_admin(db: AsyncSession, user_id: UUID) -> bool:
    result = await db.execute(select(User.role).where(User.id == user_id))
    role = result.scalar_one_or_none()
    return role == UserRole.admin


async def _user_is_merchant_for_order(
    db: AsyncSession,
    user_id: UUID,
    order_id: UUID,
) -> bool:
    result = await db.execute(
        select(Store.merchant_id)
        .join(Order, Order.store_id == Store.id)
        .where(Order.id == order_id)
    )
    merchant_id = result.scalar_one_or_none()
    return merchant_id == user_id


async def _user_is_delivery_partner_for_order(
    db: AsyncSession,
    user_id: UUID,
    order_id: UUID,
) -> bool:
    result = await db.execute(
        select(Order.delivery_partner_id, Order.status).where(Order.id == order_id)
    )
    row = result.first()
    if row is None:
        return False
    partner_id, order_status = row
    if partner_id == user_id:
        return True
    return order_status == OrderStatus.ready_for_pickup and partner_id is None


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    is_admin = await _user_is_admin(db, auth_user.id)
    is_merchant = False
    is_delivery_partner = False
    if not is_admin:
        is_merchant = await _user_is_merchant_for_order(db, auth_user.id, order_id)
        if not is_merchant:
            is_delivery_partner = await _user_is_delivery_partner_for_order(
                db, auth_user.id, order_id
            )

    query = (
        select(Order, Store.store_name)
        .join(Store, Store.id == Order.store_id)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    if not is_admin and not is_merchant and not is_delivery_partner:
        query = query.where(Order.consumer_id == auth_user.id)

    result = await db.execute(query)
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order, store_name = row
    return _order_to_response(order, store_name)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    result = await db.execute(
        select(Order, Store.store_name)
        .join(Store, Store.id == Order.store_id)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.consumer_id == auth_user.id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order, store_name = row
    if order.status != OrderStatus.pending:
        raise HTTPException(
            status_code=400,
            detail="Only pending orders can be cancelled",
        )

    order.status = OrderStatus.cancelled
    for item in order.items:
        await db.execute(
            update(Product)
            .where(Product.id == item.product_id)
            .values(stock_count=Product.stock_count + item.quantity)
        )

    await db.commit()
    await invalidate_catalog(store_id=order.store_id)
    await db.refresh(order)
    return _order_to_response(order, store_name)
