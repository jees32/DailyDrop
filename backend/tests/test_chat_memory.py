from uuid import uuid4

import pytest

from chat.memory import resolve_history, sanitize_turns


def test_sanitize_turns_keeps_only_user_and_assistant() -> None:
    raw = [
        {"role": "system", "content": "ignore me"},
        {"role": "user", "content": "  hi  "},
        {"role": "assistant", "content": ""},
        {"role": "assistant", "content": "hello"},
    ]
    assert sanitize_turns(raw) == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]


def test_sanitize_turns_keeps_a_recent_window() -> None:
    raw = [{"role": "user", "content": f"m{i}"} for i in range(20)]
    kept = sanitize_turns(raw, limit=4)
    assert [turn["content"] for turn in kept] == ["m16", "m17", "m18", "m19"]


@pytest.mark.asyncio
async def test_resolve_history_uses_client_history_for_guests() -> None:
    client = [{"role": "user", "content": "guest question"}]
    history = await resolve_history(db=None, user_id=None, client_history=client)  # type: ignore[arg-type]
    assert history == [{"role": "user", "content": "guest question"}]


@pytest.mark.asyncio
async def test_resolve_history_prefers_database_for_signed_in_users(
    monkeypatch,
) -> None:
    stored = [{"role": "user", "content": "from db"}]
    client = [{"role": "user", "content": "from browser"}]

    async def _load(_db, _user_id, limit=12):
        return stored

    monkeypatch.setattr("chat.memory.load_recent_turns", _load)
    history = await resolve_history(object(), uuid4(), client)
    assert history == stored
