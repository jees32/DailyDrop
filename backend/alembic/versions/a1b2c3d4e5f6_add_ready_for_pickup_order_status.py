"""Add ready_for_pickup order status.

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-07 11:10:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup'"
        )

    # Unassigned handoffs from the old flow used picked_up before a partner accepted.
    op.execute(
        """
        UPDATE orders
        SET status = 'ready_for_pickup'
        WHERE status = 'picked_up'
          AND delivery_partner_id IS NULL
        """
    )


def downgrade() -> None:
    # PostgreSQL does not support removing individual enum values safely.
    pass
