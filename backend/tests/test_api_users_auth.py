import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_users_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing or invalid authorization header"


@pytest.mark.asyncio
async def test_users_me_profile_not_found(
    client: AsyncClient,
    override_db_missing_profile,
) -> None:
    response = await client.get("/api/v1/users/me", headers=auth_headers())
    assert response.status_code == 404
    assert "Profile not found" in response.json()["detail"]
