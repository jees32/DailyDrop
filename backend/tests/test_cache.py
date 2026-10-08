from __future__ import annotations

import fnmatch
from typing import Any
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import AsyncClient

from cache import (
    category_stores_key,
    get_json,
    invalidate_catalog,
    ping_redis,
    round_coord,
    search_key,
    set_client,
    set_json,
    store_products_key,
    stores_key,
)
from database import get_db
from main import app


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.store[key] = value

    async def delete(self, *keys: str) -> None:
        for key in keys:
            self.store.pop(key, None)

    async def scan_iter(self, match: str = "*") -> Any:
        for key in list(self.store):
            if fnmatch.fnmatch(key, match):
                yield key

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        return None


def test_round_coord_buckets_nearby_gps() -> None:
    assert round_coord(10.00701) == round_coord(10.00704)
    assert round_coord(10.007) == "10.007"


def test_catalog_keys_are_stable() -> None:
    store_id = uuid4()
    assert stores_key(10.007, 76.71) == "dd:stores:10.007:76.710"
    assert store_products_key(store_id) == f"dd:store:{store_id}:products"
    assert category_stores_key("Vegetables", 10.007, 76.71).startswith(
        "dd:category:Vegetables:"
    )
    assert "milk" in search_key("  Milk  ", 10.007, 76.71, 20, 0)


@pytest.mark.asyncio
async def test_get_set_and_invalidate_catalog() -> None:
    fake = FakeRedis()
    set_client(fake)
    store_id = uuid4()

    await set_json(stores_key(10.007, 76.71), [{"id": "s1"}], 60)
    await set_json(store_products_key(store_id), [{"name": "Milk"}], 90)
    await set_json("dd:search:milk:10.007:76.710:20:0", {"total": 1}, 30)

    assert await get_json(stores_key(10.007, 76.71)) == [{"id": "s1"}]
    await invalidate_catalog(store_id=store_id)
    assert await get_json(stores_key(10.007, 76.71)) is None
    assert await get_json(store_products_key(store_id)) is None
    assert await get_json("dd:search:milk:10.007:76.710:20:0") is None


@pytest.mark.asyncio
async def test_cache_helpers_noop_without_client() -> None:
    assert await get_json("dd:stores:x") is None
    await set_json("dd:stores:x", {"a": 1}, 10)
    await invalidate_catalog()
    assert await ping_redis() is False


@pytest.mark.asyncio
async def test_health_reports_redis_down_without_client(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["redis"] == "down"


@pytest.mark.asyncio
async def test_health_reports_redis_up_with_fake_client(client: AsyncClient) -> None:
    set_client(FakeRedis())
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["redis"] == "up"


@pytest.mark.asyncio
async def test_stores_endpoint_sets_cache_hit_header(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    set_client(FakeRedis())

    async def _get_db() -> Any:
        yield AsyncMock()

    app.dependency_overrides[get_db] = _get_db
    calls = {"n": 0}

    async def fake_fetch_stores(*_args: Any, **_kwargs: Any) -> list[dict[str, Any]]:
        calls["n"] += 1
        return [
            {
                "id": "41000000-0000-4000-8000-000000000001",
                "merchant_id": "11000000-0000-4000-8000-000000000001",
                "store_name": "Store 1",
                "town": "Kothamangalam",
                "location": {"lat": 10.064, "lng": 76.628},
                "is_active": True,
                "created_at": "2026-01-15T08:30:00",
                "distance_km": 1.2,
            }
        ]

    monkeypatch.setattr("main.fetch_stores", fake_fetch_stores)
    try:
        first = await client.get("/api/v1/stores")
        second = await client.get("/api/v1/stores")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.headers["x-cache"] == "MISS"
    assert second.headers["x-cache"] == "HIT"
    assert first.json() == second.json()
    assert calls["n"] == 1
