"""Tools Drop may ask us to run. We run SQL and hand the JSON back to the model.

Not RAG: no embeddings. The model says "search_products" / "get_my_orders";
Python queries our tables and returns facts.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from catalog.db_helpers import DEFAULT_USER_LAT, DEFAULT_USER_LNG, search_products

TOOL_PRODUCT_LIMIT = 5
TOOL_ORDER_LIMIT = 5

# Sent to Hugging Face so the model knows which functions exist.
CHAT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": (
                "Search DailyDrop products by name or description. "
                "Use when the user asks if an item is sold or where to buy it."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Product search text, e.g. milk or tomato",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_orders",
            "description": (
                "List this signed-in shopper's recent orders only. "
                "Never use this for another person. If they are not signed in, say so."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


@dataclass
class ToolContext:
    """Extra info tools need that the model should not invent."""

    db: AsyncSession
    user_id: UUID | None  # None = guest; get_my_orders must refuse
    user_lat: float | None
    user_lng: float | None


def parse_tool_arguments(raw: str | None) -> dict[str, Any]:
    """HF sends arguments as a JSON *string*. Bad JSON → empty dict."""
    if not raw or not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


async def execute_tool(name: str, arguments: dict[str, Any], ctx: ToolContext) -> str:
    """Run one tool and return a JSON string for the next model call."""
    if name == "search_products":
        return await _search_products(arguments, ctx)
    if name == "get_my_orders":
        return await _get_my_orders(ctx)
    return json.dumps({"error": f"Unknown tool: {name}"})


async def _search_products(arguments: dict[str, Any], ctx: ToolContext) -> str:
    query = str(arguments.get("query") or "").strip()
    if not query:
        return json.dumps({"error": "query is required"})
    lat = DEFAULT_USER_LAT if ctx.user_lat is None else ctx.user_lat
    lng = DEFAULT_USER_LNG if ctx.user_lng is None else ctx.user_lng
    rows, _total = await search_products(
        ctx.db,
        query,
        user_lat=lat,
        user_lng=lng,
        limit=TOOL_PRODUCT_LIMIT,
        offset=0,
    )
    items = [
        {
            "name": row["name"],
            "price": str(row["price"]),
            "store_name": row.get("store_name"),
            "town": row.get("store_town") or row.get("town"),
            "stock_count": row.get("stock_count"),
        }
        for row in rows
    ]
    return json.dumps({"query": query, "items": items})


async def _get_my_orders(ctx: ToolContext) -> str:
    if ctx.user_id is None:
        return json.dumps(
            {
                "error": "not_signed_in",
                "hint": "Ask the shopper to sign in. You cannot see anyone else's orders.",
            }
        )

    result = await ctx.db.execute(
        text(
            """
            SELECT
                o.id,
                o.status::text AS status,
                o.total_amount,
                o.created_at,
                s.store_name
            FROM orders o
            JOIN stores s ON s.id = o.store_id
            WHERE o.consumer_id = :user_id
            ORDER BY o.created_at DESC
            LIMIT :limit
            """
        ),
        {"user_id": ctx.user_id, "limit": TOOL_ORDER_LIMIT},
    )
    orders = [
        {
            "id": str(row.id),
            "status": row.status,
            "total_amount": str(row.total_amount),
            "store_name": row.store_name,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in result
    ]
    return json.dumps({"orders": orders})
