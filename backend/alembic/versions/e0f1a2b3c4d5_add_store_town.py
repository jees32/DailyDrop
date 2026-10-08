"""add town to stores

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-08-20 18:40:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

from region_coords import STORE_PINS, TOWN_BY_ID

revision: str = "e0f1a2b3c4d5"
down_revision: Union[str, Sequence[str], None] = "d9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("stores", sa.Column("town", sa.String(length=100), nullable=True))

    conn = op.get_bind()
    for pin in STORE_PINS:
        town_name = TOWN_BY_ID[pin.town_id].name
        conn.execute(
            text("UPDATE stores SET town = :town WHERE id = :store_id"),
            {"town": town_name, "store_id": pin.store_id},
        )


def downgrade() -> None:
    op.drop_column("stores", "town")
