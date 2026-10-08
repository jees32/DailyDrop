"""add user email column

Revision ID: c8d9e0f1a2b3
Revises: b4e2c3d5f6a7
Create Date: 2026-08-19 19:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, Sequence[str], None] = "b4e2c3d5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.create_unique_constraint("users_email_key", "users", ["email"])
    op.alter_column("users", "phone_number", existing_type=sa.String(length=15), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "phone_number", existing_type=sa.String(length=15), nullable=False)
    op.drop_constraint("users_email_key", "users", type_="unique")
    op.drop_column("users", "email")
