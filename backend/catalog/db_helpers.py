from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Default user location — Paingottoor village center (see region_coords.py).
DEFAULT_USER_LAT = 10.0070
DEFAULT_USER_LNG = 76.7100

STORE_SELECT = """
    SELECT
        s.id,
        s.merchant_id,
        s.store_name,
        s.town,
        s.is_active,
        s.created_at,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        ST_Distance(
            s.location::geography,
            ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326)::geography
        ) / 1000.0 AS distance_km
    FROM stores s
"""

PRODUCT_SELECT = """
    SELECT
        p.id,
        p.store_id,
        p.name,
        p.description,
        p.price,
        p.stock_count,
        p.category::text AS category,
        p.image_url,
        p.created_at
    FROM products p
"""


def row_to_store(row: Any) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "merchant_id": str(row.merchant_id),
        "store_name": row.store_name,
        "town": row.town,
        "location": {"lat": float(row.lat), "lng": float(row.lng)},
        "is_active": row.is_active,
        "created_at": row.created_at,
        "distance_km": round(float(row.distance_km), 1),
    }


def row_to_product(row: Any) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "store_id": str(row.store_id),
        "name": row.name,
        "description": row.description,
        "price": Decimal(str(row.price)),
        "stock_count": row.stock_count,
        "category": row.category,
        "image_url": row.image_url or "",
        "created_at": row.created_at,
    }


async def fetch_stores(
    session: AsyncSession,
    user_lat: float = DEFAULT_USER_LAT,
    user_lng: float = DEFAULT_USER_LNG,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(f"{STORE_SELECT} ORDER BY distance_km"),
        {"user_lat": user_lat, "user_lng": user_lng},
    )
    return [row_to_store(row) for row in result]


async def fetch_store_by_id(
    session: AsyncSession,
    store_id: UUID,
    user_lat: float = DEFAULT_USER_LAT,
    user_lng: float = DEFAULT_USER_LNG,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(f"{STORE_SELECT} WHERE s.id = :store_id"),
        {"store_id": store_id, "user_lat": user_lat, "user_lng": user_lng},
    )
    row = result.first()
    return row_to_store(row) if row else None


async def fetch_store_products(
    session: AsyncSession,
    store_id: UUID,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(f"{PRODUCT_SELECT} WHERE p.store_id = :store_id ORDER BY p.name"),
        {"store_id": store_id},
    )
    return [row_to_product(row) for row in result]


async def fetch_stores_for_category(
    session: AsyncSession,
    category: str,
    user_lat: float = DEFAULT_USER_LAT,
    user_lng: float = DEFAULT_USER_LNG,
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            f"""
            SELECT
                s.id,
                s.store_name,
                s.town,
                s.is_active,
                COUNT(p.id) AS product_count,
                ST_Distance(
                    s.location::geography,
                    ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326)::geography
                ) / 1000.0 AS distance_km
            FROM stores s
            JOIN products p ON p.store_id = s.id
            WHERE p.category::text = :category
            GROUP BY s.id, s.store_name, s.town, s.is_active, s.location
            ORDER BY distance_km
            """
        ),
        {
            "category": category,
            "user_lat": user_lat,
            "user_lng": user_lng,
        },
    )
    return [
        {
            "id": str(row.id),
            "store_name": row.store_name,
            "town": row.town,
            "distance_km": round(float(row.distance_km), 1),
            "is_active": row.is_active,
            "product_count": row.product_count,
        }
        for row in result
    ]


async def search_products(
    session: AsyncSession,
    query: str,
    user_lat: float = DEFAULT_USER_LAT,
    user_lng: float = DEFAULT_USER_LNG,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    pattern = f"%{query.strip()}%"
    params = {
        "pattern": pattern,
        "user_lat": user_lat,
        "user_lng": user_lng,
        "limit": limit,
        "offset": offset,
    }

    count_result = await session.execute(
        text(
            """
            SELECT COUNT(*)::int
            FROM products p
            JOIN stores s ON s.id = p.store_id
            WHERE
                s.is_active = TRUE
                AND (
                    p.name ILIKE :pattern
                    OR COALESCE(p.description, '') ILIKE :pattern
                )
            """
        ),
        params,
    )
    total = count_result.scalar_one()

    result = await session.execute(
        text(
            f"""
            SELECT
                p.id,
                p.store_id,
                p.name,
                p.description,
                p.price,
                p.stock_count,
                p.category::text AS category,
                p.image_url,
                p.created_at,
                s.store_name,
                s.town,
                s.is_active AS store_is_active,
                ST_Distance(
                    s.location::geography,
                    ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326)::geography
                ) / 1000.0 AS distance_km
            FROM products p
            JOIN stores s ON s.id = p.store_id
            WHERE
                s.is_active = TRUE
                AND (
                    p.name ILIKE :pattern
                    OR COALESCE(p.description, '') ILIKE :pattern
                )
            ORDER BY distance_km, s.store_name, p.name
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )

    rows = [
        {
            "id": str(row.id),
            "store_id": str(row.store_id),
            "name": row.name,
            "description": row.description,
            "price": Decimal(str(row.price)),
            "stock_count": row.stock_count,
            "category": row.category,
            "image_url": row.image_url or "",
            "created_at": row.created_at,
            "store_name": row.store_name,
            "store_town": row.town,
            "store_is_active": row.store_is_active,
            "distance_km": round(float(row.distance_km), 1),
        }
        for row in result
    ]
    return rows, total
