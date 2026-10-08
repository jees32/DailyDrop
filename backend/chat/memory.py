"""Chat memory = Postgres rows of past bubbles.

Not RAG: we do not search documents. We save chats and later load a short
window so Hugging Face does not get months of text in one prompt.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from models.chat_message import ChatMessage
from models.user import User

# How many past bubbles we allow into the model (not "only if logged in").
PROMPT_TURN_LIMIT = 12


def sanitize_turns(raw: list[dict[str, str]], limit: int = PROMPT_TURN_LIMIT) -> list[dict[str, str]]:
    """Clean ANY history list (guest JSON or leftover client list).

    Does NOT check login. Login vs guest is resolve_history's job.

    For each of the last `limit` items it:
    1. keeps only role user / assistant (drops system / junk POST data)
    2. skips empty text
    3. trims spaces
    """
    turns: list[dict[str, str]] = []
    for turn in raw[-limit:]:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            turns.append({"role": role, "content": content})
    return turns


async def user_has_profile(db: AsyncSession, user_id: UUID) -> bool:
    """True if this auth id already has a row in users (needed for the FK)."""
    result = await db.execute(select(User.id).where(User.id == user_id))
    return result.scalar_one_or_none() is not None


async def _reset_if_table_missing(db: AsyncSession, exc: ProgrammingError) -> bool:
    """True when chat_messages is not migrated yet — rollback so the request can continue."""
    cause = str(exc.orig) if getattr(exc, "orig", None) else str(exc)
    if "chat_messages" not in cause or "does not exist" not in cause:
        return False
    await db.rollback()
    return True


async def load_recent_turns(
    db: AsyncSession,
    user_id: UUID,
    limit: int = PROMPT_TURN_LIMIT,
) -> list[dict[str, str]]:
    """SQL version of the 12-turn window — used when the shopper IS signed in.

    Newest first from Postgres, then reverse so the model reads oldest → newest.
    """
    try:
        result = await db.execute(
            select(ChatMessage.role, ChatMessage.content)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
    except ProgrammingError as exc:
        if await _reset_if_table_missing(db, exc):
            return []
        raise
    rows = list(result.all())
    rows.reverse()

    return [{"role": row.role, "content": row.content} for row in rows]


async def append_turn(
    db: AsyncSession,
    user_id: UUID,
    user_content: str,
    assistant_content: str,
) -> None:
    # Skip save if they have a JWT but no users row yet (onboarding).
    if not await user_has_profile(db, user_id):
        return
    db.add(ChatMessage(user_id=user_id, role="user", content=user_content.strip()))
    db.add(
        ChatMessage(
            user_id=user_id,
            role="assistant",
            content=assistant_content.strip(),
        )
    )
    try:
        await db.flush()
    except ProgrammingError as exc:
        if await _reset_if_table_missing(db, exc):
            return
        raise


async def resolve_history(
    db: AsyncSession,
    user_id: UUID | None,
    client_history: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Pick which history the model should see.

    - Guest (user_id is None): use payload.history (the browser list), after sanitize.
    - Signed in + DB has rows: use those rows (widget sent history: []).
    - Signed in + empty table: fall back to the browser list (first chat).
    """
    client_turns = sanitize_turns(
        [{"role": str(t.get("role", "")), "content": str(t.get("content", ""))} for t in client_history]
    )
    
    if user_id is None:
        return client_turns
    stored = await load_recent_turns(db, user_id)
    return stored if stored else client_turns
