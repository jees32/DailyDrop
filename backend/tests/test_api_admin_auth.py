import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_admin_stats_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/admin/stats")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing or invalid authorization header"


@pytest.mark.asyncio
async def test_admin_stats_forbidden_for_consumer(
    client: AsyncClient,
    override_auth,
    override_db_user,
) -> None:
    response = await client.get("/api/v1/admin/stats", headers=auth_headers())
    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


@pytest.mark.asyncio
async def test_admin_stats_profile_not_found(
    client: AsyncClient,
    override_db_missing_profile,
) -> None:
    response = await client.get("/api/v1/admin/stats", headers=auth_headers())
    assert response.status_code == 404
    assert "Profile not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_stats_success_for_admin(
    client: AsyncClient,
    override_admin_db,
) -> None:
    response = await client.get("/api/v1/admin/stats", headers=auth_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["total_orders"] == 0
    assert body["total_users"] == 0
    assert body["total_stores"] == 0


@pytest.mark.asyncio
async def test_admin_orders_requires_admin(
    client: AsyncClient,
    override_auth,
    override_db_user,
) -> None:
    response = await client.get("/api/v1/admin/orders", headers=auth_headers())
    assert response.status_code == 403
