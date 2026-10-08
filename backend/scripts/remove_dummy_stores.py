"""Remove the 3 initial dummy Paingottoor-area stores from the database.

These were early demo data with incorrect GPS pins and are not real supermarkets.

Run once:
    python scripts/remove_dummy_stores.py
"""
from __future__ import annotations

from uuid import UUID

import _bootstrap  # noqa: F401

from sqlalchemy import create_engine, text

from config import build_sync_database_url

DUMMY_STORE_IDS = (
    UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),  # Paingottoor Supermarket
    UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901"),  # City Fresh Mart
    UUID("c3d4e5f6-a7b8-9012-cdef-123456789012"),  # Green Valley Grocers
)

DUMMY_MERCHANT_IDS = (
    UUID("d4e5f6a7-b8c9-0123-def0-234567890123"),
    UUID("e5f6a7b8-c9d0-1234-ef01-345678901234"),
    UUID("f6a7b8c9-d0e1-2345-f012-456789012345"),
)


def remove_dummy_stores() -> None:
    engine = create_engine(build_sync_database_url(), connect_args={"sslmode": "require"})

    with engine.begin() as conn:
        for store_id in DUMMY_STORE_IDS:
            name = conn.execute(
                text("SELECT store_name FROM stores WHERE id = :id"),
                {"id": store_id},
            ).scalar_one_or_none()
            if name is None:
                print(f"  Skip (not found): {store_id}")
                continue

            products = conn.execute(
                text("DELETE FROM products WHERE store_id = :id"),
                {"id": store_id},
            ).rowcount
            orders = conn.execute(
                text("DELETE FROM orders WHERE store_id = :id"),
                {"id": store_id},
            ).rowcount
            conn.execute(
                text("DELETE FROM stores WHERE id = :id"),
                {"id": store_id},
            )
            print(f"  Removed {name}: {products} products, {orders} orders")

        for merchant_id in DUMMY_MERCHANT_IDS:
            conn.execute(
                text("DELETE FROM public.users WHERE id = :id"),
                {"id": merchant_id},
            )
            conn.execute(
                text("DELETE FROM auth.users WHERE id = :id"),
                {"id": merchant_id},
            )

        remaining = conn.execute(text("SELECT COUNT(*) FROM stores")).scalar_one()
        print(f"\nRemaining stores: {remaining}")

        print("\nStores from Paingottoor (10.007, 76.710):")
        rows = conn.execute(
            text(
                """
                SELECT store_name,
                       ROUND((ST_Distance(
                           location::geography,
                           ST_SetSRID(ST_MakePoint(76.710, 10.007), 4326)::geography
                       ) / 1000.0)::numeric, 1) AS km
                FROM stores
                ORDER BY km
                """
            )
        ).fetchall()
        for row in rows:
            print(f"  {row.km} km - {row.store_name}")


if __name__ == "__main__":
    remove_dummy_stores()
