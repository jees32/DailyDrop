"""DailyDrop chatbot — prompt, optional tools, Hugging Face Inference API.

Chat history in Postgres is memory, not RAG: we do not embed documents or
search by vector similarity. We store months of turns and send only a window.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from huggingface_hub import AsyncInferenceClient

from catalog.db_helpers import DEFAULT_USER_LAT, DEFAULT_USER_LNG, fetch_stores
from chat.memory import (
    PROMPT_TURN_LIMIT,
    append_turn,
    resolve_history,
    sanitize_turns,
)
from chat.tools import CHAT_TOOLS, ToolContext, execute_tool, parse_tool_arguments
from config import get_hf_model, get_hf_token

MAX_HISTORY_TURNS = PROMPT_TURN_LIMIT  # same 12-turn cap as chat.memory
NEARBY_STORE_LIMIT = 5  # always injected; not a tool
MAX_TOOL_ROUNDS = 2  # model may call tools, we answer, model writes English

SYSTEM_PROMPT = """You are Drop, a helper for DailyDrop — a hyperlocal grocery app for Kerala towns (Kothamangalam, Muvattupuzha, Thodupuzha, Paingottoor).

How the app works:
- Shoppers browse nearby stores (distance uses GPS / PostGIS), add items from ONE store, then checkout.
- Payment is a demo only: mock card, UPI, or cash on delivery. No charge is taken.
- Merchants accept → prepare → mark ready for pickup. Delivery partners pick up and deliver.

Tools:
- search_products — live catalogue. Use for "do you have milk?" style questions.
- get_my_orders — this signed-in shopper's orders only.

Rules:
- Be short (2–6 sentences). Use the nearby-store list when the user asks what is close.
- Do not invent prices, stock, or order IDs. Prefer tools, then say you do not know.
- You cannot place or cancel orders. Tell them to use the cart, checkout, or the order page.
"""


class ChatConfigError(RuntimeError):
    """Missing HF_TOKEN — create a Hugging Face token and set it in the environment."""


class ChatProviderError(RuntimeError):
    """Hugging Face rejected or failed the request (rate limit, gated model, etc.)."""


@dataclass
class ToolCall:
    """One 'please run this function' request from the model."""

    id: str
    name: str
    arguments: str  # JSON text, e.g. '{"query": "milk"}'


def build_messages(
    user_message: str,
    history: list[dict[str, str]],
    store_lines: list[str],
) -> list[dict[str, Any]]:
    """Build the OpenAI-style message list the LLM will see.

    Order matters:
    1. system  — who the bot is + app rules
    2. system  — live nearby stores (facts we fetched from our DB)
    3. history — last few user/assistant turns (memory of this chat)
    4. user    — the new question
    """
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if store_lines:
        nearby = "Nearby stores (from DailyDrop, nearest first):\n" + "\n".join(
            store_lines
        )
        messages.append({"role": "system", "content": nearby})

    # history is already "the list we chose" (DB or guest). Sanitize again
    # so a huge/dirty list never reaches Hugging Face.
    for turn in sanitize_turns(history, MAX_HISTORY_TURNS):
        messages.append({"role": turn["role"], "content": turn["content"]})

    # Current question is always payload.message — not part of history.
    messages.append({"role": "user", "content": user_message.strip()})
    return messages


def format_store_lines(stores: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for store in stores:
        if not store.get("is_active"):
            continue
        town = store.get("town") or "nearby"
        distance = store.get("distance_km")
        lines.append(f"- {store['store_name']} ({town}, {distance} km)")
        if len(lines) >= NEARBY_STORE_LIMIT:
            break
    return lines


async def load_nearby_store_lines(
    db: Any,
    user_lat: float | None,
    user_lng: float | None,
) -> list[str]:
    lat = DEFAULT_USER_LAT if user_lat is None else user_lat
    lng = DEFAULT_USER_LNG if user_lng is None else user_lng
    stores = await fetch_stores(db, user_lat=lat, user_lng=lng)
    return format_store_lines(stores)


def _parse_tool_calls(message: Any) -> list[ToolCall]:
    raw_calls = getattr(message, "tool_calls", None) or []    
    parsed: list[ToolCall] = []
    for index, call in enumerate(raw_calls):
        function = getattr(call, "function", None)
        name = getattr(function, "name", None) if function else None
        arguments = getattr(function, "arguments", None) if function else None
        call_id = getattr(call, "id", None) or f"tool_{index}"
        if name:
            parsed.append(
                ToolCall(id=str(call_id), name=str(name), arguments=str(arguments or "{}"))
            )
    return parsed


async def _complete(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None,
) -> Any:
    token = get_hf_token()
    if not token:
        raise ChatConfigError(
            "HF_TOKEN is missing. Create a free Hugging Face token "
            "(huggingface.co → Settings → Access Tokens) with Inference Providers "
            "permission, then add HF_TOKEN=hf_... to backend/.env and restart the API."
        )

    model = get_hf_model()
    client = AsyncInferenceClient(api_key=token)
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": 280,
        "temperature": 0.3,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = "auto"
    try:
        response = await client.chat.completions.create(**kwargs)
    except Exception as exc:
        raise ChatProviderError(
            "Hugging Face inference failed. Check HF_TOKEN permissions, "
            f"that model {model} is available, and your monthly free credits. "
            f"Details: {exc}"
        ) from exc

    if not response.choices:
        raise ChatProviderError("The model returned an empty reply. Try again.")
    return response.choices[0].message


async def generate_reply(messages: list[dict[str, Any]]) -> str:
    """Plain text reply, no tools (fallback if HF rejects the tools API)."""
    message = await _complete(messages, tools=None)
    reply = (getattr(message, "content", None) or "").strip()
    if not reply:
        raise ChatProviderError("The model returned an empty reply. Try again.")
    return reply


async def generate_reply_with_tools(
    messages: list[dict[str, Any]],
    ctx: ToolContext,
) -> str:
    """1) Ask HF with tools. 2) If it wants SQL, run it. 3) Ask HF again for English."""
    working = list(messages)
    try:
        message = await _complete(working, tools=CHAT_TOOLS)
    except ChatProviderError:
        # Some models do not accept `tools=` — talk without them.
        return await generate_reply(working)

    for _round in range(MAX_TOOL_ROUNDS):
        tool_calls = _parse_tool_calls(message)
        if not tool_calls:
            reply = (getattr(message, "content", None) or "").strip()
            if reply:
                return reply
            break

        assistant_tools = []
        for call in tool_calls:
            assistant_tools.append(
                {
                    "id": call.id,
                    "type": "function",
                    "function": {"name": call.name, "arguments": call.arguments},
                }
            )
        working.append(
            {
                "role": "assistant",
                "content": getattr(message, "content", None) or "",
                "tool_calls": assistant_tools,
            }
        )
        for call in tool_calls:
            result = await execute_tool(
                call.name,
                parse_tool_arguments(call.arguments),
                ctx,
            )
            working.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": result,
                }
            )
        try:
            message = await _complete(working, tools=CHAT_TOOLS)
        except ChatProviderError:
            return await generate_reply(messages)

    fallback = (getattr(message, "content", None) or "").strip()
    if fallback:
        return fallback
    raise ChatProviderError("The model returned an empty reply. Try again.")


async def answer_user(
    db: Any,
    user_message: str,
    client_history: list[dict[str, Any]],
    *,
    user_id: UUID | None,
    user_lat: float | None,
    user_lng: float | None,
) -> str:
    # One request: nearby stores + pick history + prompt HF + save if signed in.
    store_lines = await load_nearby_store_lines(db, user_lat, user_lng)
    history = await resolve_history(db, user_id, client_history)
    messages = build_messages(user_message, history, store_lines)
    ctx = ToolContext(
        db=db,
        user_id=user_id,
        user_lat=user_lat,
        user_lng=user_lng,
    )
    reply = await generate_reply_with_tools(messages, ctx)
    if user_id is not None:
        await append_turn(db, user_id, user_message, reply)
    return reply
