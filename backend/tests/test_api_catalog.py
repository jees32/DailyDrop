import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_invalid_store_id_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/stores/not-a-valid-uuid")
    assert response.status_code == 404
    assert response.json()["detail"] == "Store not found"


@pytest.mark.asyncio
async def test_unknown_category_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/categories/UnknownCategory/stores")
    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"


@pytest.mark.asyncio
async def test_product_search_rejects_whitespace_only_query(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/v1/products/search", params={"q": "   "})
    assert response.status_code == 400
    assert response.json()["detail"] == "Search query is required"
