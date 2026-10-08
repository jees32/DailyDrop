"""add product category and image_url

Revision ID: a3f1b2c4d5e6
Revises: 5c7a664a2784
Create Date: 2026-08-19 13:45:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3f1b2c4d5e6"
down_revision: Union[str, Sequence[str], None] = "5c7a664a2784"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

product_category_enum = sa.Enum(
    "Grocery",
    "Vegetables",
    "Fruits",
    "Fish",
    "Meat",
    "Other Household Items",
    name="product_category",
)


def upgrade() -> None:
    product_category_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "products",
        sa.Column(
            "category",
            product_category_enum,
            nullable=False,
            server_default="Grocery",
        ),
    )
    op.add_column(
        "products",
        sa.Column("image_url", sa.String(length=512), nullable=True),
    )
    op.alter_column("products", "category", server_default=None)


def downgrade() -> None:
    op.drop_column("products", "image_url")
    op.drop_column("products", "category")
    op.execute("DROP TYPE IF EXISTS product_category")
