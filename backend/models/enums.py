import enum

from sqlalchemy import Enum as SAEnum


class UserRole(str, enum.Enum):
    consumer = "consumer"
    merchant = "merchant"
    delivery_partner = "delivery_partner"
    admin = "admin"


class ProductCategory(str, enum.Enum):
    grocery = "Grocery"
    vegetables = "Vegetables"
    fruits = "Fruits"
    fish = "Fish"
    meat = "Meat"
    household = "Other Household Items"
    pharmacy = "Pharmacy & Wellness"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    preparing = "preparing"
    ready_for_pickup = "ready_for_pickup"
    picked_up = "picked_up"
    delivered = "delivered"
    cancelled = "cancelled"


user_role_enum = SAEnum(
    UserRole,
    name="user_role",
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)

product_category_enum = SAEnum(
    ProductCategory,
    name="product_category",
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)

order_status_enum = SAEnum(
    OrderStatus,
    name="order_status",
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
)
