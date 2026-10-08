from models.enums import ProductCategory
from catalog.product_catalog import CATEGORY_IMAGES
from catalog.product_service import resolve_image_url


def test_resolve_image_url_returns_custom_url_when_provided() -> None:
    custom = "https://example.com/custom.jpg"
    assert resolve_image_url(ProductCategory.grocery, custom) == custom


def test_resolve_image_url_falls_back_to_category_default() -> None:
    assert resolve_image_url(ProductCategory.fish, None) == CATEGORY_IMAGES["Fish"]


def test_resolve_image_url_prefers_custom_over_default() -> None:
    custom = "https://example.com/override.jpg"
    assert resolve_image_url(ProductCategory.vegetables, custom) == custom
