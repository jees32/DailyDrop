from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth import AuthUser, get_optional_user
from chat.memory import load_recent_turns
from chat.service import (
    ChatConfigError,
    ChatProviderError,
    answer_user,
)
from config import get_hf_model
from database import get_db
from schemas.chat import ChatHistoryResponse, ChatRequest, ChatResponse, ChatTurn

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.get("/chat/history", response_model=ChatHistoryResponse)
async def chat_history(
    db: AsyncSession = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
) -> ChatHistoryResponse:
    """Signed-in shoppers get stored turns. Guests get an empty list."""
    if user is None:
        return ChatHistoryResponse(messages=[])
    turns = await load_recent_turns(db, user.id)
    return ChatHistoryResponse(
        messages=[ChatTurn(role=turn["role"], content=turn["content"]) for turn in turns]
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
) -> ChatResponse:
    """Assemble prompt + tools, call Hugging Face, persist if signed in."""
    message = payload.message.strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required",
        )
    
    history = [turn.model_dump() for turn in payload.history]     
     
    try:
        reply = await answer_user(
            db,
            message,
            history,
            user_id=user.id if user else None,
            user_lat=payload.user_lat,
            user_lng=payload.user_lng,
        )
        if user is not None:
            await db.commit()
    except ChatConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ChatProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ChatResponse(reply=reply, model=get_hf_model())
