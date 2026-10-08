"""Seed Kerala region supermarkets and expanded product catalog.

Adds real-world style stores in Kothamangalam, Muvattupuzha, and Thodupuzha,
plus pharmacy products across all stores. Safe to re-run (skips existing rows).

Run after migrations:
    python scripts/seed_kerala_region.py
"""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

import _bootstrap  # noqa: F401

from sqlalchemy import create_engine, text

from catalog.product_catalog import pick_templates_for_store
from config import build_sync_database_url

# Marker — if this store exists, regional seed was already applied.
REGION_SEED_MARKER = UUID("41000000-0000-4000-8000-000000000001")

MERCHANTS = [
    {"id": UUID("40000000-0000-4000-8000-000000000001"), "phone": "+919876543301"},
    {"id": UUID("40000000-0000-4000-8000-000000000002"), "phone": "+919876543302"},
    {"id": UUID("40000000-0000-4000-8000-000000000003"), "phone": "+919876543303"},
    {"id": UUID("40000000-0000-4000-8000-000000000004"), "phone": "+919876543304"},
    {"id": UUID("40000000-0000-4000-8000-000000000005"), "phone": "+919876543305"},
    {"id": UUID("40000000-0000-4000-8000-000000000006"), "phone": "+919876543306"},
    {"id": UUID("40000000-0000-4000-8000-000000000007"), "phone": "+919876543307"},
    {"id": UUID("40000000-0000-4000-8000-000000000008"), "phone": "+919876543308"},
    {"id": UUID("40000000-0000-4000-8000-000000000009"), "phone": "+919876543309"},
]

# Demo stores (fictional names) for the Kothamangalam–Muvattupuzha–Thodupuzha belt.
STORES = [
    # —— Kothamangalam (Ernakulam) ——
    {
        "id": REGION_SEED_MARKER,
        "merchant_id": MERCHANTS[0]["id"],
        "store_name": "Store 1",
        "lat": 10.0580,
        "lng": 76.6380,
        "is_active": True,
        "town": "Kothamangalam",
    },
    {
        "id": UUID("41000000-0000-4000-8000-000000000002"),
        "merchant_id": MERCHANTS[1]["id"],
        "store_name": "Store 2",
        "lat": 10.0620,
        "lng": 76.6320,
        "is_active": True,
        "town": "Kothamangalam",
    },
    {
        "id": UUID("41000000-0000-4000-8000-000000000003"),
        "merchant_id": MERCHANTS[2]["id"],
        "store_name": "Store 3",
        "lat": 10.0660,
        "lng": 76.6260,
        "is_active": True,
        "town": "Kothamangalam",
    },
    # —— Muvattupuzha (Ernakulam) ——
    {
        "id": UUID("41000000-0000-4000-8000-000000000004"),
        "merchant_id": MERCHANTS[3]["id"],
        "store_name": "Store 4",
        "lat": 9.9894,
        "lng": 76.5772,
        "is_active": True,
        "town": "Muvattupuzha",
    },
    {
        "id": UUID("41000000-0000-4000-8000-000000000005"),
        "merchant_id": MERCHANTS[4]["id"],
        "store_name": "Store 5",
        "lat": 9.9820,
        "lng": 76.5850,
        "is_active": True,
        "town": "Muvattupuzha",
    },
    {
        "id": UUID("41000000-0000-4000-8000-000000000006"),
        "merchant_id": MERCHANTS[5]["id"],
        "store_name": "Store 6",
        "lat": 9.9910,
        "lng": 76.5710,
        "is_active": True,
        "town": "Muvattupuzha",
    },
    # —— Thodupuzha (Idukki) ——
    {
        "id": UUID("41000000-0000-4000-8000-000000000007"),
        "merchant_id": MERCHANTS[6]["id"],
        "store_name": "Store 7",
        "lat": 9.8958,
        "lng": 76.7186,
        "is_active": True,
        "town": "Thodupuzha",
    },
    {
        "id": UUID("41000000-0000-4000-8000-000000000008"),
        "merchant_id": MERCHANTS[7]["id"],
        "store_name": "Store 8",
        "lat": 9.8930,
        "lng": 76.7150,
        "is_active": True,
        "town": "Thodupuzha",
    },
    {
        "id": UUID("41000000-0000-4000-8000-000000000009"),
        "merchant_id": MERCHANTS[8]["id"],
        "store_name": "Store 9",
        "lat": 9.9020,
        "lng": 76.7350,
        "is_active": True,
        "town": "Thodupuzha",
    },
]


def build_store_products(store_id: UUID, store_index: int) -> list[dict]:
    """14 products per store — 2+ in every category."""
    products: list[dict] = []
    templates = pick_templates_for_store(store_index)

    for seq, template in enumerate(templates, start=1):
        product_id = UUID(f"42000000-0000-4000-8000-{store_index:04d}{seq:08d}")
        products.append(
            {
                "id": product_id,
                "store_id": store_id,
                "name": template.name,
                "description": template.description,
                "price": template.price,
                "stock_count": template.stock + (store_index * 3),
                "category": template.category,
                "image_url": template.image_url,
            }
        )
    return products


def insert_merchant(conn, merchant: dict) -> None:
    conn.execute(
        text(
            """
            INSERT INTO auth.users (
                id, instance_id, aud, role, phone, phone_confirmed_at,
                created_at, updated_at
            )
            VALUES (
                :id,
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                :phone,
                now(),
                now(),
                now()
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        merchant,
    )
    conn.execute(
        text(
            """
            INSERT INTO public.users (id, phone_number, role)
            VALUES (:id, :phone, 'merchant')
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": merchant["id"], "phone": merchant["phone"]},
    )


def insert_store(conn, store: dict) -> None:
    conn.execute(
        text(
            """
            INSERT INTO stores (id, merchant_id, store_name, town, location, is_active)
            VALUES (
                :id,
                :merchant_id,
                :store_name,
                :town,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                :is_active
            )
            ON CONFLICT (id) DO UPDATE SET store_name = EXCLUDED.store_name
            """
        ),
        store,
    )


def insert_product(conn, product: dict) -> None:
    conn.execute(
        text(
            """
            INSERT INTO products (
                id, store_id, name, description, price,
                stock_count, category, image_url
            )
            VALUES (
                :id, :store_id, :name, :description, :price,
                :stock_count, :category, :image_url
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        product,
    )


def seed() -> None:
    engine = create_engine(build_sync_database_url(), connect_args={"sslmode": "require"})

    with engine.begin() as conn:
        already_seeded = conn.execute(
            text("SELECT 1 FROM stores WHERE id = :id"),
            {"id": REGION_SEED_MARKER},
        ).first()

        if already_seeded:
            for store in STORES:
                insert_store(conn, store)
            print("Store names updated to Store 1–9 (existing Kerala rows).")
            return

        for merchant in MERCHANTS:
            insert_merchant(conn, merchant)

        all_products: list[dict] = []
        for index, store in enumerate(STORES):
            insert_store(conn, store)
            all_products.extend(build_store_products(store["id"], index))

        for product in all_products:
            insert_product(conn, product)

    print(
        f"Seeded {len(MERCHANTS)} merchants, {len(STORES)} Kerala-region stores, "
        f"{len(all_products)} products."
    )
    print("Towns: Kothamangalam (3), Muvattupuzha (3), Thodupuzha (3)")


if __name__ == "__main__":
    seed()
