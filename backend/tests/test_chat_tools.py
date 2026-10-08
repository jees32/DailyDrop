import json
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from chat.tools import ToolContext, execute_tool, parse_tool_arguments


def test_parse_tool_arguments_handles_bad_json() -> None:
    assert parse_tool_arguments("{") == {}
    assert parse_tool_arguments('{"query": "milk"}') == {"query": "milk"}


@pytest.mark.asyncio
async def test_get_my_orders_refuses_guests() -> None:
    ctx = ToolContext(db=AsyncMock(), user_id=None, user_lat=None, user_lng=None)
    raw = await execute_tool("get_my_orders", {}, ctx)
    payload = json.loads(raw)
    assert payload["error"] == "not_signed_in"


@pytest.mark.asyncio
async def test_search_products_requires_query() -> None:
    ctx = ToolContext(db=AsyncMock(), user_id=None, user_lat=None, user_lng=None)
    raw = await execute_tool("search_products", {}, ctx)
    assert json.loads(raw)["error"] == "query is required"


@pytest.mark.asyncio
async def test_search_products_returns_live_rows(monkeypatch) -> None:
    async def _search(_db, query, **_kwargs):
        return (
            [
                {
                    "name": "Milk",
                    "price": "52.00",
                    "store_name": "Store 1",
                    "store_town": "Kothamangalam",
                    "stock_count": 8,
                }
            ],
            1,
        )

    monkeypatch.setattr("chat.tools.search_products", _search)
    ctx = ToolContext(db=AsyncMock(), user_id=uuid4(), user_lat=10.0, user_lng=76.7)
    raw = await execute_tool("search_products", {"query": "milk"}, ctx)
    payload = json.loads(raw)
    assert payload["items"][0]["name"] == "Milk"
    assert payload["items"][0]["store_name"] == "Store 1"
