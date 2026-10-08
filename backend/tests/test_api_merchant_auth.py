import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_merchant_stores_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/merchant/stores")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_merchant_stores_forbidden_for_consumer(
    client: AsyncClient,
    override_auth,
    override_db_user,
) -> None:
    response = await client.get("/api/v1/merchant/stores", headers=auth_headers())
    assert response.status_code == 403
    assert response.json()["detail"] == "Merchant access required"


@pytest.mark.asyncio
async def test_merchant_products_requires_auth(client: AsyncClient) -> None:
    store_id = "00000000-0000-0000-0000-000000000001"
    response = await client.get(f"/api/v1/merchant/stores/{store_id}/products")
    assert response.status_code == 401
