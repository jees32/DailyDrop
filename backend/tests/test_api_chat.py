from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from chat.service import ChatConfigError
from database import get_db
from main import app


@pytest.mark.asyncio
async def test_chat_history_empty_for_guests(client: AsyncClient) -> None:
    response = await client.get("/api/v1/chat/history")
    assert response.status_code == 200
    assert response.json() == {"messages": []}


@pytest.mark.asyncio
async def test_chat_rejects_whitespace_message(client: AsyncClient) -> None:
    response = await client.post("/api/v1/chat", json={"message": "   "})
    assert response.status_code == 400
    assert response.json()["detail"] == "Message is required"


@pytest.mark.asyncio
async def test_chat_returns_503_without_hf_token(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _get_db():
        yield AsyncMock()

    app.dependency_overrides[get_db] = _get_db
    monkeypatch.setattr(
        "routers.chat.answer_user",
        AsyncMock(side_effect=ChatConfigError("HF_TOKEN is missing")),
    )
    try:
        response = await client.post(
            "/api/v1/chat",
            json={"message": "Where can I buy milk?"},
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    assert "HF_TOKEN" in response.json()["detail"]
