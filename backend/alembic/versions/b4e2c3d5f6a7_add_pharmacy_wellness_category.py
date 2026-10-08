"""Add Pharmacy & Wellness product category.

Revision ID: b4e2c3d5f6a7
Revises: a3f1b2c4d5e6
Create Date: 2026-08-19 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "b4e2c3d5f6a7"
down_revision: Union[str, Sequence[str], None] = "a3f1b2c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'Pharmacy & Wellness'")


def downgrade() -> None:
    # PostgreSQL does not support removing individual enum values safely.
    pass
