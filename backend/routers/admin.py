from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_helpers import (
    get_admin_store_summary,
    get_admin_user_summary,
    search_admin_orders,
    search_admin_stores,
    search_admin_users,
)
from auth import AuthUser, get_current_user
from cache import invalidate_catalog
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
from region_coords import TOWN_BY_ID
from schemas.admin import (
    AdminCreateStoreRequest,
    AdminOrderListResponse,
    AdminOrderSummaryResponse,
    AdminStatsResponse,
    AdminStoreListResponse,
    AdminStoreSummaryResponse,
    AdminUpdateStoreRequest,
    AdminUpdateUserRequest,
    AdminUserListResponse,
    AdminUserSummaryResponse,
)
from schemas.product import (
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

OrderFilterParam = Literal["all", "active", "delivered", "cancelled"]


def _store_summary_from_row(row: dict) -> AdminStoreSummaryResponse:
    return AdminStoreSummaryResponse(
        id=row["id"],
        store_name=row["store_name"],
        town=row["town"],
        is_active=row["is_active"],
        merchant_id=row["merchant_id"],
        merchant_email=row["merchant_email"],
        merchant_name=row["merchant_name"],
        product_count=row["product_count"],
        created_at=row["created_at"],
    )


def _user_summary_from_row(row: dict) -> AdminUserSummaryResponse:
    return AdminUserSummaryResponse(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        phone_number=row["phone_number"],
        role=row["role"],
        is_active=row["is_active"],
        is_verified=row["is_verified"],
        store_count=row["store_count"],
        created_at=row["created_at"],
    )


async def _get_store_or_404(db: AsyncSession, store_id: UUID) -> Store:
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    return store


async def _get_user_or_404(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


async def _prepare_merchant(db: AsyncSession, merchant_id: UUID) -> User:
    merchant = await _get_user_or_404(db, merchant_id)
    if not merchant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive user as merchant",
        )
    if merchant.role == UserRole.delivery_partner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery partners cannot be assigned as store merchants",
        )
    if merchant.role == UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot be assigned as store merchants",
        )
    if merchant.role == UserRole.consumer:
        merchant.role = UserRole.merchant
    return merchant


async def require_admin(
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
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminStatsResponse:
    total_orders = int(
        await db.scalar(select(func.count()).select_from(Order)) or 0
    )
    active_orders = int(
        await db.scalar(
            select(func.count())
            .select_from(Order)
            .where(
                Order.status.not_in([OrderStatus.delivered, OrderStatus.cancelled])
            )
        )
        or 0
    )
    delivered_orders = int(
        await db.scalar(
            select(func.count())
            .select_from(Order)
            .where(Order.status == OrderStatus.delivered)
        )
        or 0
    )
    cancelled_orders = int(
        await db.scalar(
            select(func.count())
            .select_from(Order)
            .where(Order.status == OrderStatus.cancelled)
        )
        or 0
    )
    total_users = int(
        await db.scalar(select(func.count()).select_from(User)) or 0
    )
    total_stores = int(
        await db.scalar(select(func.count()).select_from(Store)) or 0
    )

    return AdminStatsResponse(
        total_orders=total_orders,
        active_orders=active_orders,
        delivered_orders=delivered_orders,
        cancelled_orders=cancelled_orders,
        total_users=total_users,
        total_stores=total_stores,
    )


@router.get("/orders", response_model=AdminOrderListResponse)
async def list_admin_orders(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    q: str = Query(default="", max_length=120),
    filter: OrderFilterParam = Query(default="all"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminOrderListResponse:
    rows, total = await search_admin_orders(
        db,
        query=q,
        order_filter=filter,
        limit=limit,
        offset=offset,
    )

    return AdminOrderListResponse(
        items=[
            AdminOrderSummaryResponse(
                id=row["id"],
                store_id=row["store_id"],
                store_name=row["store_name"],
                consumer_id=row["consumer_id"],
                consumer_email=row["consumer_email"],
                consumer_name=row["consumer_name"],
                status=row["status"],
                total_amount=row["total_amount"],
                payment_method=row["payment_method"],
                item_count=row["item_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
        query=q.strip(),
        filter=filter,
    )


@router.get("/stores", response_model=AdminStoreListResponse)
async def list_admin_stores(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminStoreListResponse:
    rows, total = await search_admin_stores(
        db,
        query=q,
        limit=limit,
        offset=offset,
    )

    return AdminStoreListResponse(
        items=[
            AdminStoreSummaryResponse(
                id=row["id"],
                store_name=row["store_name"],
                town=row["town"],
                is_active=row["is_active"],
                merchant_id=row["merchant_id"],
                merchant_email=row["merchant_email"],
                merchant_name=row["merchant_name"],
                product_count=row["product_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
        query=q.strip(),
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    q: str = Query(default="", max_length=120),
    role: UserRole | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminUserListResponse:
    rows, total = await search_admin_users(
        db,
        query=q,
        role=role.value if role else None,
        limit=limit,
        offset=offset,
    )

    return AdminUserListResponse(
        items=[
            AdminUserSummaryResponse(
                id=row["id"],
                email=row["email"],
                full_name=row["full_name"],
                phone_number=row["phone_number"],
                role=row["role"],
                is_active=row["is_active"],
                is_verified=row["is_verified"],
                store_count=row["store_count"],
                created_at=row["created_at"],
            )
            for row in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
        query=q.strip(),
        role=role.value if role else None,
    )


@router.post("/stores", response_model=AdminStoreSummaryResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_store(
    payload: AdminCreateStoreRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminStoreSummaryResponse:
    town = TOWN_BY_ID.get(payload.town_id.strip().lower())
    if town is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown town_id. Use paingottoor, kothamangalam, muvattupuzha, or thodupuzha.",
        )

    merchant = await _prepare_merchant(db, payload.merchant_id)

    store = Store(
        merchant_id=merchant.id,
        store_name=payload.store_name.strip(),
        town=town.name,
        location=WKTElement(f"POINT({town.lng} {town.lat})", srid=4326),
        is_active=payload.is_active,
    )
    db.add(store)
    await db.commit()
    await db.refresh(store)
    await invalidate_catalog()

    summary = await get_admin_store_summary(db, store.id)
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Store created but could not be loaded",
        )
    return _store_summary_from_row(summary)


@router.patch("/stores/{store_id}", response_model=AdminStoreSummaryResponse)
async def update_admin_store(
    store_id: UUID,
    payload: AdminUpdateStoreRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminStoreSummaryResponse:
    if (
        payload.store_name is None
        and payload.town_id is None
        and payload.merchant_id is None
        and payload.is_active is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    store = await _get_store_or_404(db, store_id)

    if payload.store_name is not None:
        store.store_name = payload.store_name.strip()

    if payload.town_id is not None:
        town = TOWN_BY_ID.get(payload.town_id.strip().lower())
        if town is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unknown town_id. Use paingottoor, kothamangalam, muvattupuzha, or thodupuzha.",
            )
        store.town = town.name
        store.location = WKTElement(f"POINT({town.lng} {town.lat})", srid=4326)

    if payload.merchant_id is not None:
        merchant = await _prepare_merchant(db, payload.merchant_id)
        store.merchant_id = merchant.id

    if payload.is_active is not None:
        store.is_active = payload.is_active

    await db.commit()
    await invalidate_catalog(store_id=store_id)

    summary = await get_admin_store_summary(db, store_id)
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Store updated but could not be loaded",
        )
    return _store_summary_from_row(summary)


@router.patch("/users/{user_id}", response_model=AdminUserSummaryResponse)
async def update_admin_user(
    user_id: UUID,
    payload: AdminUpdateUserRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminUserSummaryResponse:
    if payload.role is None and payload.is_active is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role or active status",
        )

    user = await _get_user_or_404(db, user_id)

    if payload.role is not None and payload.role != user.role:
        if user.role == UserRole.admin:
            other_admins = int(
                await db.scalar(
                    select(func.count())
                    .select_from(User)
                    .where(User.role == UserRole.admin, User.id != user.id)
                )
                or 0
            )
            if other_admins == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last admin account",
                )
        user.role = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.commit()

    summary = await get_admin_user_summary(db, user_id)
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User updated but could not be loaded",
        )
    return _user_summary_from_row(summary)


@router.get(
    "/stores/{store_id}/products",
    response_model=list[ProductResponse],
)
async def list_admin_store_products(
    store_id: UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
    await _get_store_or_404(db, store_id)
    return await list_store_products(db, store_id)


@router.post(
    "/stores/{store_id}/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_store_product(
    store_id: UUID,
    payload: ProductCreateRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    await _get_store_or_404(db, store_id)
    return await create_store_product(db, store_id, payload)


@router.patch(
    "/stores/{store_id}/products/{product_id}",
    response_model=ProductResponse,
)
async def update_admin_store_product(
    store_id: UUID,
    product_id: UUID,
    payload: ProductUpdateRequest,
    _admin: User = Depends(require_admin),
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

    await _get_store_or_404(db, store_id)
    product = await get_store_product(db, store_id, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    return await update_store_product(db, store_id, product_id, payload)
