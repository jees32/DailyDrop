from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cache import invalidate_catalog
from models.enums import ProductCategory
from models.product import Product
from models.store import Store
from catalog.product_catalog import CATEGORY_IMAGES
from schemas.product import (
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
)


def resolve_image_url(category: ProductCategory, image_url: str | None) -> str:
    if image_url:
        return image_url
    return CATEGORY_IMAGES.get(category.value, "")


def product_to_response(product: Product) -> ProductResponse:
    category = (
        product.category.value
        if isinstance(product.category, ProductCategory)
        else str(product.category)
    )
    return ProductResponse(
        id=product.id,
        store_id=product.store_id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock_count=product.stock_count,
        category=category,
        image_url=product.image_url or resolve_image_url(product.category, None),
        created_at=product.created_at,
    )


async def get_store_or_none(
    session: AsyncSession,
    store_id: UUID,
) -> Store | None:
    result = await session.execute(select(Store).where(Store.id == store_id))
    return result.scalar_one_or_none()


async def list_store_products(
    session: AsyncSession,
    store_id: UUID,
) -> list[ProductResponse]:
    result = await session.execute(
        select(Product)
        .where(Product.store_id == store_id)
        .order_by(Product.name)
    )
    products = result.scalars().all()
    return [product_to_response(product) for product in products]


async def create_store_product(
    session: AsyncSession,
    store_id: UUID,
    payload: ProductCreateRequest,
) -> ProductResponse:
    product = Product(
        store_id=store_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        stock_count=payload.stock_count,
        category=payload.category,
        image_url=resolve_image_url(payload.category, payload.image_url),
    )
    session.add(product)
    await session.commit()
    await session.refresh(product)
    await invalidate_catalog(store_id=store_id)
    return product_to_response(product)


async def get_store_product(
    session: AsyncSession,
    store_id: UUID,
    product_id: UUID,
) -> Product | None:
    result = await session.execute(
        select(Product).where(
            Product.id == product_id,
            Product.store_id == store_id,
        )
    )
    return result.scalar_one_or_none()


async def update_store_product(
    session: AsyncSession,
    store_id: UUID,
    product_id: UUID,
    payload: ProductUpdateRequest,
) -> ProductResponse:
    product = await get_store_product(session, store_id, product_id)
    if product is None:
        raise ValueError("Product not found")

    if payload.name is not None:
        product.name = payload.name
    if payload.price is not None:
        product.price = payload.price
    if payload.stock_count is not None:
        product.stock_count = payload.stock_count
    if payload.description is not None:
        product.description = payload.description

    category = product.category
    if payload.category is not None:
        category = payload.category
        product.category = payload.category

    if payload.image_url is not None:
        product.image_url = resolve_image_url(category, payload.image_url or None)
    elif payload.category is not None and not product.image_url:
        product.image_url = resolve_image_url(category, None)

    await session.commit()
    await session.refresh(product)
    await invalidate_catalog(store_id=store_id)
    return product_to_response(product)
