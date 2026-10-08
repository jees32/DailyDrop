from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from auth import AuthUser, get_current_user
from cache import set_client
from database import get_db
from main import app
from models.enums import UserRole
from models.user import User


@pytest.fixture(autouse=True)
def disable_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep unit tests off the Docker Redis instance."""
    monkeypatch.setenv("REDIS_URL", "")
    set_client(None)
    yield
    set_client(None)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_user_id() -> UUID:
    return uuid4()


@pytest.fixture
def auth_user(auth_user_id: UUID) -> AuthUser:
    return AuthUser(id=auth_user_id, email="test@example.com", phone=None)


@pytest.fixture
def db_user(auth_user_id: UUID) -> User:
    return User(
        id=auth_user_id,
        email="test@example.com",
        role=UserRole.consumer,
        is_verified=True,
        is_active=True,
    )


def _session_returning_user(user: User | None) -> AsyncMock:
    session = AsyncMock()
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = user
    session.execute = AsyncMock(return_value=execute_result)
    return session


@pytest.fixture
def override_auth(auth_user: AuthUser) -> AsyncIterator[None]:
    async def _get_current_user() -> AuthUser:
        return auth_user

    app.dependency_overrides[get_current_user] = _get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def override_db_user(db_user: User) -> AsyncIterator[None]:
    async def _get_db() -> AsyncIterator[AsyncMock]:
        yield _session_returning_user(db_user)

    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def override_db_missing_profile(auth_user: AuthUser) -> AsyncIterator[None]:
    async def _get_db() -> AsyncIterator[AsyncMock]:
        yield _session_returning_user(None)

    async def _get_current_user() -> AuthUser:
        return auth_user

    app.dependency_overrides[get_current_user] = _get_current_user
    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def override_admin_db(db_user: User) -> AsyncIterator[None]:
    admin = User(
        id=db_user.id,
        email=db_user.email,
        role=UserRole.admin,
        is_verified=True,
        is_active=True,
    )

    async def _get_current_user() -> AuthUser:
        return AuthUser(id=admin.id, email=admin.email, phone=None)

    async def _get_db() -> AsyncIterator[AsyncMock]:
        session = _session_returning_user(admin)
        session.scalar = AsyncMock(side_effect=[0, 0, 0, 0, 0, 0])
        yield session

    app.dependency_overrides[get_current_user] = _get_current_user
    app.dependency_overrides[get_db] = _get_db
    yield
    app.dependency_overrides.clear()


def auth_headers(token: str = "test-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
