"""Redis catalog cache.

Cache is optional: if REDIS_URL is missing or Redis is unreachable, every
helper no-ops and FastAPI falls back to PostgreSQL.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from redis.asyncio import Redis

from config import get_redis_url

logger = logging.getLogger("dailydrop.cache")

PREFIX = "dd"
STORES_TTL_SECONDS = 60
PRODUCTS_TTL_SECONDS = 90
SEARCH_TTL_SECONDS = 30

_client: Redis | None = None


def round_coord(value: float) -> str:
    """Bucket GPS to ~111m so nearby pings share a cache key."""
    return f"{round(float(value), 3):.3f}"


def stores_key(user_lat: float, user_lng: float) -> str:
    return f"{PREFIX}:stores:{round_coord(user_lat)}:{round_coord(user_lng)}"


def store_key(store_id: UUID | str, user_lat: float, user_lng: float) -> str:
    return (
        f"{PREFIX}:store:{store_id}:"
        f"{round_coord(user_lat)}:{round_coord(user_lng)}"
    )


def store_products_key(store_id: UUID | str) -> str:
    return f"{PREFIX}:store:{store_id}:products"


def category_stores_key(category: str, user_lat: float, user_lng: float) -> str:
    return (
        f"{PREFIX}:category:{category}:"
        f"{round_coord(user_lat)}:{round_coord(user_lng)}"
    )


def search_key(
    query: str,
    user_lat: float,
    user_lng: float,
    limit: int,
    offset: int,
) -> str:
    normalized = " ".join(query.strip().lower().split())
    return (
        f"{PREFIX}:search:{normalized}:"
        f"{round_coord(user_lat)}:{round_coord(user_lng)}:{limit}:{offset}"
    )


def get_client() -> Redis | None:
    return _client


def set_client(client: Redis | None) -> None:
    """Test hook to inject a fake Redis client."""
    global _client
    _client = client


async def connect_redis() -> None:
    global _client
    url = get_redis_url()
    if not url:
        logger.info("REDIS_URL not set — catalog cache disabled")
        _client = None
        return

    client = Redis.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    try:
        await client.ping()
    except Exception as exc:
        logger.warning("Redis unreachable (%s) — catalog cache disabled", exc)
        await client.aclose()
        _client = None
        return

    _client = client
    logger.info("Redis catalog cache connected")


async def close_redis() -> None:
    global _client
    if _client is None:
        return
    await _client.aclose()
    _client = None


async def ping_redis() -> bool:
    if _client is None:
        return False
    try:
        return bool(await _client.ping())
    except Exception:
        return False


async def get_json(key: str) -> Any | None:
    if _client is None:
        return None
    try:
        raw = await _client.get(key)
    except Exception as exc:
        logger.warning("Redis GET failed for %s: %s", key, exc)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def set_json(key: str, value: Any, ttl_seconds: int) -> None:
    if _client is None:
        return
    try:
        await _client.setex(key, ttl_seconds, json.dumps(value))
    except Exception as exc:
        logger.warning("Redis SET failed for %s: %s", key, exc)


async def invalidate_catalog(*, store_id: UUID | str | None = None) -> None:
    """Drop store listings, search, and optionally one store's product cache."""
    patterns = [
        f"{PREFIX}:stores:*",
        f"{PREFIX}:category:*",
        f"{PREFIX}:search:*",
    ]
    if store_id is not None:
        patterns.append(f"{PREFIX}:store:{store_id}:*")
    else:
        patterns.append(f"{PREFIX}:store:*")
    await _delete_matching(patterns)


async def _delete_matching(patterns: list[str]) -> None:
    if _client is None:
        return
    keys: list[str] = []
    try:
        for pattern in patterns:
            async for key in _client.scan_iter(match=pattern):
                keys.append(str(key))
        if keys:
            await _client.delete(*keys)
    except Exception as exc:
        logger.warning("Redis invalidation failed: %s", exc)
