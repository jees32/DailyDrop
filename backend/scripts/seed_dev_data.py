"""Initial dev seed — superseded by seed_kerala_region.py.

The original 3 dummy Paingottoor stores were removed; use
python scripts/seed_kerala_region.py for real Kerala supermarket data instead.
"""
from __future__ import annotations

import _bootstrap  # noqa: F401

from sqlalchemy import create_engine, text

from config import build_sync_database_url


def seed() -> None:
    engine = create_engine(build_sync_database_url(), connect_args={"sslmode": "require"})

    with engine.connect() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM stores")).scalar_one()

    if count:
        print(f"Seed skipped — {count} store(s) already in database.")
        print("To add Kerala region stores: python scripts/seed_kerala_region.py")
        return

    print("No stores found. Run: python scripts/seed_kerala_region.py")


if __name__ == "__main__":
    seed()
