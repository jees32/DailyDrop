from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

OrderFilter = str  # all | active | delivered | cancelled


def _search_pattern(query: str) -> str | None:
    trimmed = query.strip()
    if not trimmed:
        return None
    return f"%{trimmed}%"


def _order_filter_clause(order_filter: OrderFilter) -> str:
    if order_filter == "active":
        return "AND o.status NOT IN ('delivered', 'cancelled')"
    if order_filter == "delivered":
        return "AND o.status = 'delivered'"
    if order_filter == "cancelled":
        return "AND o.status = 'cancelled'"
    return ""


async def search_admin_orders(
    session: AsyncSession,
    query: str = "",
    order_filter: OrderFilter = "all",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    pattern = _search_pattern(query)
    filter_clause = _order_filter_clause(order_filter)
    search_clause = ""
    params: dict[str, Any] = {
        "limit": limit,
        "offset": offset,
    }

    if pattern is not None:
        search_clause = """
            AND (
                u.email ILIKE :pattern
                OR COALESCE(u.full_name, '') ILIKE :pattern
                OR s.store_name ILIKE :pattern
                OR REPLACE(o.id::text, '-', '') ILIKE :pattern
            )
        """
        params["pattern"] = pattern

    count_sql = f"""
        SELECT COUNT(DISTINCT o.id)::int
        FROM orders o
        JOIN stores s ON s.id = o.store_id
        JOIN users u ON u.id = o.consumer_id
        WHERE 1 = 1
        {filter_clause}
        {search_clause}
    """
    total = (await session.execute(text(count_sql), params)).scalar_one()

    list_sql = f"""
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
            o.created_at,
            COUNT(oi.id)::int AS item_count
        FROM orders o
        JOIN stores s ON s.id = o.store_id
        JOIN users u ON u.id = o.consumer_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE 1 = 1
        {filter_clause}
        {search_clause}
        GROUP BY
            o.id,
            s.store_name,
            u.email,
            u.full_name
        ORDER BY o.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    result = await session.execute(text(list_sql), params)

    rows = [
        {
            "id": row.id,
            "store_id": row.store_id,
            "store_name": row.store_name,
            "consumer_id": row.consumer_id,
            "consumer_email": row.consumer_email,
            "consumer_name": row.consumer_name,
            "status": row.status,
            "total_amount": Decimal(str(row.total_amount)),
            "payment_method": row.payment_method,
            "item_count": row.item_count,
            "created_at": row.created_at,
        }
        for row in result
    ]
    return rows, total


async def search_admin_stores(
    session: AsyncSession,
    query: str = "",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    pattern = _search_pattern(query)
    search_clause = ""
    params: dict[str, Any] = {
        "limit": limit,
        "offset": offset,
    }

    if pattern is not None:
        search_clause = """
            AND (
                s.store_name ILIKE :pattern
                OR COALESCE(s.town, '') ILIKE :pattern
                OR COALESCE(m.email, '') ILIKE :pattern
                OR COALESCE(m.full_name, '') ILIKE :pattern
            )
        """
        params["pattern"] = pattern

    count_sql = f"""
        SELECT COUNT(*)::int
        FROM stores s
        JOIN users m ON m.id = s.merchant_id
        WHERE 1 = 1
        {search_clause}
    """
    total = (await session.execute(text(count_sql), params)).scalar_one()

    list_sql = f"""
        SELECT
            s.id,
            s.store_name,
            s.town,
            s.is_active,
            s.merchant_id,
            m.email AS merchant_email,
            m.full_name AS merchant_name,
            s.created_at,
            COUNT(p.id)::int AS product_count
        FROM stores s
        JOIN users m ON m.id = s.merchant_id
        LEFT JOIN products p ON p.store_id = s.id
        WHERE 1 = 1
        {search_clause}
        GROUP BY
            s.id,
            m.email,
            m.full_name
        ORDER BY s.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    result = await session.execute(text(list_sql), params)

    rows = [
        {
            "id": row.id,
            "store_name": row.store_name,
            "town": row.town,
            "is_active": row.is_active,
            "merchant_id": row.merchant_id,
            "merchant_email": row.merchant_email,
            "merchant_name": row.merchant_name,
            "product_count": row.product_count,
            "created_at": row.created_at,
        }
        for row in result
    ]
    return rows, total


async def search_admin_users(
    session: AsyncSession,
    query: str = "",
    role: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    pattern = _search_pattern(query)
    search_clause = ""
    role_clause = ""
    params: dict[str, Any] = {
        "limit": limit,
        "offset": offset,
    }

    if pattern is not None:
        search_clause = """
            AND (
                COALESCE(u.email, '') ILIKE :pattern
                OR COALESCE(u.full_name, '') ILIKE :pattern
                OR COALESCE(u.phone_number, '') ILIKE :pattern
            )
        """
        params["pattern"] = pattern

    if role:
        role_clause = "AND u.role::text = :role"
        params["role"] = role

    count_sql = f"""
        SELECT COUNT(*)::int
        FROM users u
        WHERE 1 = 1
        {role_clause}
        {search_clause}
    """
    total = (await session.execute(text(count_sql), params)).scalar_one()

    list_sql = f"""
        SELECT
            u.id,
            u.email,
            u.full_name,
            u.phone_number,
            u.role::text AS role,
            u.is_active,
            u.is_verified,
            u.created_at,
            COUNT(s.id)::int AS store_count
        FROM users u
        LEFT JOIN stores s ON s.merchant_id = u.id
        WHERE 1 = 1
        {role_clause}
        {search_clause}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    result = await session.execute(text(list_sql), params)

    rows = [
        {
            "id": row.id,
            "email": row.email,
            "full_name": row.full_name,
            "phone_number": row.phone_number,
            "role": row.role,
            "is_active": row.is_active,
            "is_verified": row.is_verified,
            "store_count": row.store_count,
            "created_at": row.created_at,
        }
        for row in result
    ]
    return rows, total


async def get_admin_store_summary(
    session: AsyncSession,
    store_id: UUID,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            SELECT
                s.id,
                s.store_name,
                s.town,
                s.is_active,
                s.merchant_id,
                m.email AS merchant_email,
                m.full_name AS merchant_name,
                s.created_at,
                COUNT(p.id)::int AS product_count
            FROM stores s
            JOIN users m ON m.id = s.merchant_id
            LEFT JOIN products p ON p.store_id = s.id
            WHERE s.id = :store_id
            GROUP BY
                s.id,
                m.email,
                m.full_name
            """
        ),
        {"store_id": store_id},
    )
    row = result.first()
    if row is None:
        return None

    return {
        "id": row.id,
        "store_name": row.store_name,
        "town": row.town,
        "is_active": row.is_active,
        "merchant_id": row.merchant_id,
        "merchant_email": row.merchant_email,
        "merchant_name": row.merchant_name,
        "product_count": row.product_count,
        "created_at": row.created_at,
    }


async def get_admin_user_summary(
    session: AsyncSession,
    user_id: UUID,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            SELECT
                u.id,
                u.email,
                u.full_name,
                u.phone_number,
                u.role::text AS role,
                u.is_active,
                u.is_verified,
                u.created_at,
                COUNT(s.id)::int AS store_count
            FROM users u
            LEFT JOIN stores s ON s.merchant_id = u.id
            WHERE u.id = :user_id
            GROUP BY u.id
            """
        ),
        {"user_id": user_id},
    )
    row = result.first()
    if row is None:
        return None

    return {
        "id": row.id,
        "email": row.email,
        "full_name": row.full_name,
        "phone_number": row.phone_number,
        "role": row.role,
        "is_active": row.is_active,
        "is_verified": row.is_verified,
        "store_count": row.store_count,
        "created_at": row.created_at,
    }
