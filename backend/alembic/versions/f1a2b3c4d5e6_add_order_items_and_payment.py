"""add order_items and payment fields

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-08-20 21:35:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e0f1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("subtotal", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("tax_amount", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("delivery_fee", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("payment_method", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column(
            "payment_status",
            sa.String(length=20),
            server_default="paid",
            nullable=False,
        ),
    )

    op.create_table(
        "order_items",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("line_total", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])


def downgrade() -> None:
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_column("orders", "payment_status")
    op.drop_column("orders", "payment_method")
    op.drop_column("orders", "delivery_fee")
    op.drop_column("orders", "tax_amount")
    op.drop_column("orders", "subtotal")
