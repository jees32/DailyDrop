import asyncio
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import build_async_database_url

DATABASE_URL = build_async_database_url()

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": "require"},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields one DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session


async def test_connection() -> dict[str, str]:
    """Verify we can reach Supabase Postgres (async)."""
    async with engine.connect() as connection:
        result = await connection.execute(text("SELECT version()"))
        version = result.scalar_one()

    return {
        "status": "connected",
        "driver": "asyncpg",
        "database": "postgres",
        "version": version,
    }


if __name__ == "__main__":
    try:
        info = asyncio.run(test_connection())
        print("Async database connection successful!")
        print(f"  Driver:   {info['driver']}")
        print(f"  Status:   {info['status']}")
        print(f"  Database: {info['database']}")
        print(f"  Version:  {info['version'][:60]}...")
    except Exception as exc:
        print("Async database connection failed.")
        print(f"  Error: {exc}")
        print("\nTry the sync test first (matches Supabase docs):")
        print("  python scripts/test_db_sync.py")
        print("\nIf DNS fails on Direct connection, switch to Transaction pooler in .env:")
        print("  Supabase → Settings → Database → Connection string → Transaction pooler")
        raise SystemExit(1) from exc
