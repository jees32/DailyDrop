from __future__ import annotations

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=800)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=400)
    history: list[ChatTurn] = Field(default_factory=list, max_length=8)
    user_lat: float | None = None
    user_lng: float | None = None


class ChatResponse(BaseModel):
    reply: str
    model: str


class ChatHistoryResponse(BaseModel):
    messages: list[ChatTurn]
