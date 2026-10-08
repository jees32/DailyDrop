from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from cache import (
    PRODUCTS_TTL_SECONDS,
    SEARCH_TTL_SECONDS,
    STORES_TTL_SECONDS,
    category_stores_key,
    close_redis,
    connect_redis,
    get_json,
    ping_redis,
    search_key,
    set_json,
    store_key,
    store_products_key,
    stores_key,
)
from database import get_db
from catalog.db_helpers import (
    DEFAULT_USER_LAT,
    DEFAULT_USER_LNG,
    fetch_store_by_id,
    fetch_store_products,
    fetch_stores,
    fetch_stores_for_category,
    search_products,
)
from models.enums import ProductCategory
from routers import addresses, admin, chat, delivery, merchant, orders, users


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_redis()
    yield
    await close_redis()


app = FastAPI(
    title="DailyDrop API",
    description="Hyperlocal marketplace backend for fast delivery",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.2:3000",
        "http://192.168.1.4:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(addresses.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(merchant.router)
app.include_router(delivery.router)
app.include_router(chat.router)


class Location(BaseModel):
    lat: float = Field(..., description="Latitude (WGS 84 / SRID 4326)")
    lng: float = Field(..., description="Longitude (WGS 84 / SRID 4326)")


class StoreResponse(BaseModel):
    id: str
    merchant_id: str
    store_name: str
    town: str | None = None
    location: Location
    is_active: bool
    created_at: datetime
    distance_km: float = Field(..., description="Computed proximity to the user (not stored in DB)")


class ProductResponse(BaseModel):
    id: str
    store_id: str
    name: str
    description: str | None = None
    price: Decimal
    stock_count: int
    category: str
    image_url: str
    created_at: datetime


class CategoryStoreAvailability(BaseModel):
    id: str
    store_name: str
    town: str | None = None
    distance_km: float
    is_active: bool
    product_count: int


class ProductSearchHit(ProductResponse):
    store_name: str
    store_town: str | None = None
    store_is_active: bool
    distance_km: float


class ProductSearchResponse(BaseModel):
    items: list[ProductSearchHit]
    total: int
    limit: int
    offset: int
    query: str


VALID_CATEGORIES = frozenset(category.value for category in ProductCategory)


async def cache_or_load(
    response: Response,
    key: str,
    ttl_seconds: int,
    loader: Callable[[], Awaitable[Any]],
) -> Any:
    cached = await get_json(key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return cached

    payload = await loader()
    await set_json(key, payload, ttl_seconds)
    response.headers["X-Cache"] = "MISS"
    return payload


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    """Liveness probe plus Redis status."""
    redis_up = await ping_redis()
    return {
        "status": "ok",
        "redis": "up" if redis_up else "down",
    }


def parse_store_id(store_id: str) -> UUID:
    try:
        return UUID(store_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Store not found") from exc


@app.get("/api/v1/stores", response_model=list[StoreResponse])
async def get_stores(
    response: Response,
    user_lat: float = Query(DEFAULT_USER_LAT, description="User latitude for distance sort"),
    user_lng: float = Query(DEFAULT_USER_LNG, description="User longitude for distance sort"),
    db: AsyncSession = Depends(get_db),
) -> list[StoreResponse]:
    """Return nearby hyperlocal stores sorted by distance."""

    async def load() -> list[dict[str, Any]]:
        rows = await fetch_stores(db, user_lat=user_lat, user_lng=user_lng)
        return [StoreResponse(**row).model_dump(mode="json") for row in rows]

    payload = await cache_or_load(
        response,
        stores_key(user_lat, user_lng),
        STORES_TTL_SECONDS,
        load,
    )
    return [StoreResponse.model_validate(item) for item in payload]


@app.get("/api/v1/stores/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: str,
    response: Response,
    user_lat: float = Query(DEFAULT_USER_LAT),
    user_lng: float = Query(DEFAULT_USER_LNG),
    db: AsyncSession = Depends(get_db),
) -> StoreResponse:
    """Return a single store by ID."""
    store_uuid = parse_store_id(store_id)

    async def load() -> dict[str, Any]:
        row = await fetch_store_by_id(
            db,
            store_uuid,
            user_lat=user_lat,
            user_lng=user_lng,
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Store not found")
        return StoreResponse(**row).model_dump(mode="json")

    payload = await cache_or_load(
        response,
        store_key(store_uuid, user_lat, user_lng),
        STORES_TTL_SECONDS,
        load,
    )
    return StoreResponse.model_validate(payload)


@app.get("/api/v1/stores/{store_id}/products", response_model=list[ProductResponse])
async def get_store_products(
    store_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
    """Return products available at a specific store."""
    store_uuid = parse_store_id(store_id)
    store = await fetch_store_by_id(db, store_uuid)
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")

    async def load() -> list[dict[str, Any]]:
        rows = await fetch_store_products(db, store_uuid)
        return [ProductResponse(**row).model_dump(mode="json") for row in rows]

    payload = await cache_or_load(
        response,
        store_products_key(store_uuid),
        PRODUCTS_TTL_SECONDS,
        load,
    )
    return [ProductResponse.model_validate(item) for item in payload]


@app.get(
    "/api/v1/categories/{category}/stores",
    response_model=list[CategoryStoreAvailability],
)
async def get_stores_for_category(
    category: str,
    response: Response,
    user_lat: float = Query(DEFAULT_USER_LAT),
    user_lng: float = Query(DEFAULT_USER_LNG),
    db: AsyncSession = Depends(get_db),
) -> list[CategoryStoreAvailability]:
    """Return stores that stock products in the given category."""
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=404, detail="Category not found")

    async def load() -> list[dict[str, Any]]:
        rows = await fetch_stores_for_category(
            db,
            category,
            user_lat=user_lat,
            user_lng=user_lng,
        )
        return [CategoryStoreAvailability(**row).model_dump(mode="json") for row in rows]

    payload = await cache_or_load(
        response,
        category_stores_key(category, user_lat, user_lng),
        STORES_TTL_SECONDS,
        load,
    )
    return [CategoryStoreAvailability.model_validate(item) for item in payload]


@app.get("/api/v1/products/search", response_model=ProductSearchResponse)
async def search_all_products(
    response: Response,
    q: str = Query(..., min_length=1, max_length=100, description="Search term"),
    user_lat: float = Query(DEFAULT_USER_LAT),
    user_lng: float = Query(DEFAULT_USER_LNG),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ProductSearchResponse:
    """Search products across all active stores, sorted by store distance."""
    trimmed = q.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="Search query is required")

    async def load() -> dict[str, Any]:
        rows, total = await search_products(
            db,
            trimmed,
            user_lat=user_lat,
            user_lng=user_lng,
            limit=limit,
            offset=offset,
        )
        return ProductSearchResponse(
            items=[ProductSearchHit(**row) for row in rows],
            total=total,
            limit=limit,
            offset=offset,
            query=trimmed,
        ).model_dump(mode="json")

    payload = await cache_or_load(
        response,
        search_key(trimmed, user_lat, user_lng, limit, offset),
        SEARCH_TTL_SECONDS,
        load,
    )
    return ProductSearchResponse.model_validate(payload)
