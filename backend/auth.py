from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

from config import get_supabase_jwt_secret, get_supabase_url

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class AuthUser:
    id: UUID
    email: str | None
    phone: str | None


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    jwks_url = f"{get_supabase_url()}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url)


def _decode_supabase_token(token: str) -> dict:
    issuer = f"{get_supabase_url()}/auth/v1"
    decode_kwargs = {
        "algorithms": ["ES256", "HS256"],
        "audience": "authenticated",
        "issuer": issuer,
    }

    jwt_secret = get_supabase_jwt_secret()
    if jwt_secret:
        return jwt.decode(token, jwt_secret, **decode_kwargs)

    signing_key = _jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(token, signing_key.key, **decode_kwargs)


def _email_from_claims(claims: dict) -> str | None:
    email = claims.get("email")
    if isinstance(email, str) and email.strip():
        return email.strip().lower()

    user_metadata = claims.get("user_metadata")
    if isinstance(user_metadata, dict):
        meta_email = user_metadata.get("email")
        if isinstance(meta_email, str) and meta_email.strip():
            return meta_email.strip().lower()

    return None


def _phone_from_claims(claims: dict) -> str | None:
    phone = claims.get("phone")
    if isinstance(phone, str) and phone.strip():
        return phone.strip()

    user_metadata = claims.get("user_metadata")
    if isinstance(user_metadata, dict):
        meta_phone = user_metadata.get("phone")
        if isinstance(meta_phone, str) and meta_phone.strip():
            return meta_phone.strip()

    return None


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser | None:
    """Chat stays usable for guests. A present Bearer token is still validated."""
    if credentials is None:
        return None
    return await get_current_user(credentials)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = _decode_supabase_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user id in token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return AuthUser(
        id=user_id,
        email=_email_from_claims(claims),
        phone=_phone_from_claims(claims),
    )
