"""Rebalance products: fix images and ensure every store stocks all categories.

Run once (safe to re-run):
    python scripts/rebalance_products.py
"""
from __future__ import annotations

from uuid import UUID, uuid4

import _bootstrap  # noqa: F401

from sqlalchemy import create_engine, text

from catalog.product_catalog import (
    ALL_CATEGORIES,
    CATEGORY_IMAGES,
    MIN_PRODUCTS_PER_CATEGORY,
    image_for_product_name,
    pick_templates_for_store,
)
from config import build_sync_database_url

IMAGE_UPDATE_SQL = text(
    """
    UPDATE products
    SET image_url = :image_url
    WHERE id = :id
    """
)

INSERT_SQL = text(
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
)


def rebalance() -> None:
    engine = create_engine(build_sync_database_url(), connect_args={"sslmode": "require"})

    with engine.begin() as conn:
        stores = conn.execute(
            text("SELECT id, store_name FROM stores ORDER BY store_name")
        ).fetchall()

        images_updated = 0
        products_added = 0

        for store_index, store in enumerate(stores):
            store_id: UUID = store.id

            # Fix images on existing products.
            existing = conn.execute(
                text(
                    """
                    SELECT id, name, category::text AS category
                    FROM products
                    WHERE store_id = :store_id
                    """
                ),
                {"store_id": store_id},
            ).fetchall()

            existing_names = {row.name for row in existing}

            for row in existing:
                image_url = image_for_product_name(row.name) or CATEGORY_IMAGES.get(row.category)
                if image_url:
                    conn.execute(
                        IMAGE_UPDATE_SQL,
                        {"id": row.id, "image_url": image_url},
                    )
                    images_updated += 1

            # Ensure minimum products per category.
            for category in ALL_CATEGORIES:
                count = conn.execute(
                    text(
                        """
                        SELECT COUNT(*) FROM products
                        WHERE store_id = :store_id AND category::text = :category
                        """
                    ),
                    {"store_id": store_id, "category": category},
                ).scalar_one()

                needed = MIN_PRODUCTS_PER_CATEGORY - count
                if needed <= 0:
                    continue

                templates = pick_templates_for_store(store_index)
                candidates = [t for t in templates if t.category == category]

                added_for_category = 0
                for template in candidates:
                    if template.name in existing_names:
                        continue
                    product_id = uuid4()
                    conn.execute(
                        INSERT_SQL,
                        {
                            "id": product_id,
                            "store_id": store_id,
                            "name": template.name,
                            "description": template.description,
                            "price": template.price,
                            "stock_count": template.stock + store_index * 2,
                            "category": template.category,
                            "image_url": template.image_url,
                        },
                    )
                    existing_names.add(template.name)
                    products_added += 1
                    added_for_category += 1
                    if added_for_category >= needed:
                        break

        # Summary per store × category
        print(f"Updated images on {images_updated} products.")
        print(f"Added {products_added} products to fill category gaps.\n")
        print("Products per store by category:")
        matrix = conn.execute(
            text(
                """
                SELECT s.store_name, p.category::text AS category, COUNT(*) AS cnt
                FROM stores s
                LEFT JOIN products p ON p.store_id = s.id
                GROUP BY s.id, s.store_name, p.category
                ORDER BY s.store_name, p.category
                """
            )
        ).fetchall()

        current_store = ""
        for row in matrix:
            if row.store_name != current_store:
                current_store = row.store_name
                print(f"\n  {current_store}:")
            if row.category:
                print(f"    {row.category}: {row.cnt}")


if __name__ == "__main__":
    rebalance()
