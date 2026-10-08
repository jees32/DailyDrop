import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


def _read(name: str, fallback: str | None = None) -> str | None:
    return os.getenv(name) or os.getenv(name.upper()) or fallback


def get_db_settings() -> tuple[str, str, str, str, str]:
    """Read Supabase-style split credentials from .env."""
    user = _read("user")
    password = _read("password")
    host = _read("host")
    port = _read("port", "5432")
    dbname = _read("dbname", "postgres")

    if not all([user, password, host]):
        raise RuntimeError(
            "Missing DB credentials. Set user, password, host (and optionally port, dbname) in backend/.env"
        )

    return user, password, host, port, dbname


def build_async_database_url() -> str:
    """Async URL for FastAPI + SQLAlchemy (asyncpg driver)."""
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    user, password, host, port, dbname = get_db_settings()
    safe_user = quote_plus(user)
    safe_password = quote_plus(password)
    return f"postgresql+asyncpg://{safe_user}:{safe_password}@{host}:{port}/{dbname}"


def get_supabase_url() -> str:
    url = _read("SUPABASE_URL")
    if not url:
        raise RuntimeError("Missing SUPABASE_URL in backend/.env")
    return url.rstrip("/")


def get_supabase_jwt_secret() -> str | None:
    """Legacy HS256 secret. Optional when using asymmetric signing keys (JWKS)."""
    return _read("SUPABASE_JWT_SECRET")


def get_redis_url() -> str | None:
    """Redis URL for catalog cache. Unset = cache disabled (API still works)."""
    url = _read("REDIS_URL")
    if not url:
        return None
    return url.strip() or None


def get_hf_token() -> str | None:
    """Hugging Face token for Inference Providers (chatbot)."""
    token = _read("HF_TOKEN") or _read("HUGGINGFACEHUB_API_TOKEN")
    if not token:
        return None
    return token.strip() or None


def get_hf_model() -> str:
    """Small instruct model served by HF Inference Providers.

    Override with HF_MODEL in .env. List what your token can call with:
    GET https://router.huggingface.co/v1/models
    """
    return (_read("HF_MODEL") or "Qwen/Qwen3-4B-Instruct-2507").strip()


def build_sync_database_url() -> str:
    """Sync URL matching Supabase SQLAlchemy docs (psycopg2 driver)."""
    user, password, host, port, dbname = get_db_settings()
    safe_user = quote_plus(user)
    safe_password = quote_plus(password)
    return (
        f"postgresql+psycopg2://{safe_user}:{safe_password}@{host}:{port}/{dbname}"
        "?sslmode=require"
    )
