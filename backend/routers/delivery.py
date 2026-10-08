from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import AuthUser, get_current_user
from database import get_db
from models.enums import OrderStatus, UserRole
from models.order import Order
from models.store import Store
from models.user import User
from routers.orders import _order_to_response
from schemas.delivery import DeliveryOrderSummaryResponse
from schemas.order import OrderResponse

router = APIRouter(prefix="/api/v1/delivery", tags=["delivery"])

DELIVERY_ACTIVE_STATUSES = (
    OrderStatus.ready_for_pickup,
    OrderStatus.picked_up,
)


async def require_delivery_partner(
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == auth_user.id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /api/v1/users/me after sign-in.",
        )
    if user.role != UserRole.delivery_partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Delivery partner access required",
        )
    return user


async def _get_delivery_order(
    db: AsyncSession,
    partner_id: UUID,
    order_id: UUID,
    *,
    must_be_assigned: bool,
) -> tuple[Order, str]:
    result = await db.execute(
        select(Order, Store.store_name)
        .join(Store, Store.id == Order.store_id)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")

    order, store_name = row
    if order.status not in DELIVERY_ACTIVE_STATUSES and not (
        order.status == OrderStatus.delivered
        and order.delivery_partner_id == partner_id
    ):
        raise HTTPException(status_code=404, detail="Order not found")

    if must_be_assigned:
        if order.delivery_partner_id != partner_id:
            raise HTTPException(
                status_code=403,
                detail="This delivery is assigned to another partner",
            )
    elif order.delivery_partner_id is not None and order.delivery_partner_id != partner_id:
        raise HTTPException(
            status_code=403,
            detail="This delivery is assigned to another partner",
        )

    return order, store_name


@router.get("/orders", response_model=list[DeliveryOrderSummaryResponse])
async def list_delivery_orders(
    partner: User = Depends(require_delivery_partner),
    db: AsyncSession = Depends(get_db),
) -> list[DeliveryOrderSummaryResponse]:
    result = await db.execute(
        text(
            """
            SELECT
                o.id,
                o.store_id,
                s.store_name,
                o.consumer_id,
                u.email AS consumer_email,
                u.full_name AS consumer_name,
                o.status::text AS status,
                o.total_amount,
                o.payment_method,
                o.delivery_address,
                o.delivery_partner_id,
                o.created_at,
                COUNT(oi.id)::int AS item_count
            FROM orders o
            JOIN stores s ON s.id = o.store_id
            JOIN users u ON u.id = o.consumer_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE
                (
                    o.status = 'ready_for_pickup'
                    AND o.delivery_partner_id IS NULL
                )
                OR (
                    o.status = 'picked_up'
                    AND o.delivery_partner_id = :partner_id
                )
                OR (
                    o.status = 'delivered'
                    AND o.delivery_partner_id = :partner_id
                )
            GROUP BY
                o.id,
                s.store_name,
                u.email,
                u.full_name
            ORDER BY
                CASE
                    WHEN o.status = 'ready_for_pickup' THEN 0
                    WHEN o.status = 'picked_up' THEN 1
                    ELSE 2
                END,
                o.created_at DESC
            """
        ),
        {"partner_id": partner.id},
    )

    return [
        DeliveryOrderSummaryResponse(
            id=row.id,
            store_id=row.store_id,
            store_name=row.store_name,
            consumer_id=row.consumer_id,
            consumer_email=row.consumer_email,
            consumer_name=row.consumer_name,
            status=row.status,
            total_amount=row.total_amount,
            payment_method=row.payment_method,
            item_count=row.item_count,
            delivery_address=row.delivery_address,
            delivery_partner_id=row.delivery_partner_id,
            created_at=row.created_at,
        )
        for row in result.all()
    ]


@router.post("/orders/{order_id}/accept", response_model=OrderResponse)
async def accept_delivery_order(
    order_id: UUID,
    partner: User = Depends(require_delivery_partner),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order, store_name = await _get_delivery_order(
        db, partner.id, order_id, must_be_assigned=False
    )

    if order.status != OrderStatus.ready_for_pickup:
        raise HTTPException(
            status_code=400,
            detail="Only ready-for-pickup orders can be accepted",
        )
    if order.delivery_partner_id is not None:
        raise HTTPException(status_code=400, detail="Delivery already assigned")

    order.delivery_partner_id = partner.id
    order.status = OrderStatus.picked_up
    await db.commit()
    await db.refresh(order)
    return _order_to_response(order, store_name)


@router.post("/orders/{order_id}/deliver", response_model=OrderResponse)
async def mark_order_delivered(
    order_id: UUID,
    partner: User = Depends(require_delivery_partner),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order, store_name = await _get_delivery_order(
        db, partner.id, order_id, must_be_assigned=True
    )

    if order.status != OrderStatus.picked_up:
        raise HTTPException(
            status_code=400,
            detail="Only active deliveries can be marked delivered",
        )

    order.status = OrderStatus.delivered
    if order.payment_method == "mock_cod":
        order.payment_status = "paid"

    await db.commit()
    await db.refresh(order)
    return _order_to_response(order, store_name)
