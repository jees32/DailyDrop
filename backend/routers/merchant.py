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
from catalog.product_service import (
    create_store_product,
    get_store_product,
    list_store_products,
    update_store_product,
)
from routers.orders import _order_to_response
from schemas.merchant import (
    MerchantOrderStatusUpdate,
    MerchantOrderSummaryResponse,
    MerchantStoreResponse,
)
from schemas.order import OrderResponse
from schemas.product import (
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
)

router = APIRouter(prefix="/api/v1/merchant", tags=["merchant"])

MERCHANT_STATUS_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.pending: OrderStatus.accepted,
    OrderStatus.accepted: OrderStatus.preparing,
    OrderStatus.preparing: OrderStatus.ready_for_pickup,
}


async def require_merchant(
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
    if user.role != UserRole.merchant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant access required",
        )
    return user


async def _get_merchant_store(
    db: AsyncSession,
    merchant_id: UUID,
    store_id: UUID,
) -> Store:
    result = await db.execute(
        select(Store).where(Store.id == store_id, Store.merchant_id == merchant_id)
    )
    store = result.scalar_one_or_none()
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


async def _get_merchant_order(
    db: AsyncSession,
    merchant_id: UUID,
    order_id: UUID,
) -> tuple[Order, str]:
    result = await db.execute(
        select(Order, Store.store_name)
        .join(Store, Store.id == Order.store_id)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Store.merchant_id == merchant_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order, store_name = row
    return order, store_name


@router.get("/stores", response_model=list[MerchantStoreResponse])
async def list_merchant_stores(
    merchant: User = Depends(require_merchant),
    db: AsyncSession = Depends(get_db),
) -> list[MerchantStoreResponse]:
    result = await db.execute(
        select(Store)
        .where(Store.merchant_id == merchant.id)
        .order_by(Store.store_name)
    )
    stores = result.scalars().all()
    return [
        MerchantStoreResponse(
            id=store.id,
            store_name=store.store_name,
            town=store.town,
            is_active=store.is_active,
        )
        for store in stores
    ]


@router.get("/orders", response_model=list[MerchantOrderSummaryResponse])
async def list_merchant_orders(
    merchant: User = Depends(require_merchant),
    db: AsyncSession = Depends(get_db),
) -> list[MerchantOrderSummaryResponse]:
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
                o.created_at,
                COUNT(oi.id)::int AS item_count
            FROM orders o
            JOIN stores s ON s.id = o.store_id
            JOIN users u ON u.id = o.consumer_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE s.merchant_id = :merchant_id
            GROUP BY
                o.id,
                s.store_name,
                u.email,
                u.full_name
            ORDER BY o.created_at DESC
            """
        ),
        {"merchant_id": merchant.id},
    )

    return [
        MerchantOrderSummaryResponse(
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
            created_at=row.created_at,
        )
        for row in result.all()
    ]


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_merchant_order_status(
    order_id: UUID,
    payload: MerchantOrderStatusUpdate,
    merchant: User = Depends(require_merchant),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    try:
        next_status = OrderStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order status",
        ) from exc

    order, store_name = await _get_merchant_order(db, merchant.id, order_id)
    expected_next = MERCHANT_STATUS_TRANSITIONS.get(order.status)
    if expected_next is None or next_status != expected_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move order from {order.status.value} to {next_status.value}",
        )

    order.status = next_status

    await db.commit()
    await db.refresh(order)
    return _order_to_response(order, store_name)


@router.get(
    "/stores/{store_id}/products",
    response_model=list[ProductResponse],
)
async def list_merchant_store_products(
    store_id: UUID,
    merchant: User = Depends(require_merchant),
    db: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
    await _get_merchant_store(db, merchant.id, store_id)
    return await list_store_products(db, store_id)


@router.post(
    "/stores/{store_id}/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_merchant_store_product(
    store_id: UUID,
    payload: ProductCreateRequest,
    merchant: User = Depends(require_merchant),
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    store = await _get_merchant_store(db, merchant.id, store_id)
    if not store.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add products to an inactive store",
        )
    return await create_store_product(db, store_id, payload)


@router.patch(
    "/stores/{store_id}/products/{product_id}",
    response_model=ProductResponse,
)
async def update_merchant_store_product(
    store_id: UUID,
    product_id: UUID,
    payload: ProductUpdateRequest,
    merchant: User = Depends(require_merchant),
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    if (
        payload.name is None
        and payload.price is None
        and payload.stock_count is None
        and payload.category is None
        and payload.description is None
        and payload.image_url is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    await _get_merchant_store(db, merchant.id, store_id)
    product = await get_store_product(db, store_id, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return await update_store_product(db, store_id, product_id, payload)
