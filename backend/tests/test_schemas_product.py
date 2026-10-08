from decimal import Decimal

import pytest
from pydantic import ValidationError

from models.enums import ProductCategory
from schemas.product import ProductCreateRequest, ProductUpdateRequest


def test_product_create_request_strips_name() -> None:
    payload = ProductCreateRequest(
        name="  Milk  ",
        price=Decimal("45.00"),
        stock_count=3,
        category=ProductCategory.grocery,
    )
    assert payload.name == "Milk"


def test_product_create_request_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        ProductCreateRequest(
            name="   ",
            price=Decimal("45.00"),
            stock_count=3,
            category=ProductCategory.grocery,
        )


def test_product_create_request_rejects_non_positive_price() -> None:
    with pytest.raises(ValidationError):
        ProductCreateRequest(
            name="Milk",
            price=Decimal("0"),
            stock_count=3,
            category=ProductCategory.grocery,
        )


def test_product_update_request_allows_partial_fields() -> None:
    payload = ProductUpdateRequest(stock_count=10)
    assert payload.stock_count == 10
    assert payload.name is None
