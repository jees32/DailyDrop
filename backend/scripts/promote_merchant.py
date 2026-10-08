"""Promote a signed-in user to merchant and link them to a store.

Usage:
    python scripts/promote_merchant.py --list-stores
    python scripts/promote_merchant.py you@example.com
    python scripts/promote_merchant.py you@example.com --store-id 41000000-0000-4000-8000-000000000001
    python scripts/promote_merchant.py you@example.com --consumer
"""
from __future__ import annotations

import argparse
import asyncio
from uuid import UUID

import _bootstrap  # noqa: F401

from sqlalchemy import select, update

from database import AsyncSessionLocal
from models.enums import UserRole
from models.store import Store
from models.user import User

DEFAULT_STORE_ID = UUID("41000000-0000-4000-8000-000000000001")


async def list_stores() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Store.id, Store.store_name, Store.town).order_by(Store.store_name)
        )
        rows = result.all()
        if not rows:
            print("No stores found. Run python scripts/seed_kerala_region.py first.")
            return
        print("Available stores:\n")
        for store_id, store_name, town in rows:
            town_label = f" ({town})" if town else ""
            print(f"  {store_id}  {store_name}{town_label}")


async def demote_to_consumer(email: str) -> None:
    normalized = email.strip().lower()
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == normalized)
        )
        user = result.scalar_one_or_none()
        if user is None:
            print(f"No user found with email: {normalized}")
            return

        if user.role == UserRole.consumer:
            print(f"{normalized} is already a consumer.")
            return

        await session.execute(
            update(User).where(User.id == user.id).values(role=UserRole.consumer)
        )
        await session.commit()
        print(f"Set {normalized} back to consumer role.")
        print("Their linked store(s) still point to this user until you promote someone else.")


async def promote(email: str, store_id: UUID) -> None:
    normalized = email.strip().lower()
    async with AsyncSessionLocal() as session:
        user_result = await session.execute(
            select(User).where(User.email == normalized)
        )
        user = user_result.scalar_one_or_none()
        if user is None:
            print(f"No user found with email: {normalized}")
            print("Sign in to the app once so POST /api/v1/users/me creates the row.")
            return

        store_result = await session.execute(
            select(Store).where(Store.id == store_id)
        )
        store = store_result.scalar_one_or_none()
        if store is None:
            print(f"No store found with id: {store_id}")
            print("Run with --list-stores to see valid store IDs.")
            return

        if user.role == UserRole.admin:
            print(f"Warning: {normalized} is admin — role will change to merchant.")

        await session.execute(
            update(User).where(User.id == user.id).values(role=UserRole.merchant)
        )
        await session.execute(
            update(Store).where(Store.id == store_id).values(merchant_id=user.id)
        )
        await session.commit()

        print(f"Promoted {normalized} to merchant.")
        print(f"Linked store: {store.store_name} ({store_id})")
        print("Refresh the app (or sign out/in) then open /merchant")


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote a user to merchant for testing.")
    parser.add_argument("email", nargs="?", help="User email (must have signed in once)")
    parser.add_argument(
        "--store-id",
        default=str(DEFAULT_STORE_ID),
        help=f"Store UUID to assign (default: Store 1 — {DEFAULT_STORE_ID})",
    )
    parser.add_argument(
        "--list-stores",
        action="store_true",
        help="Print store IDs and exit",
    )
    parser.add_argument(
        "--consumer",
        action="store_true",
        help="Set user back to consumer role",
    )
    args = parser.parse_args()

    if args.list_stores:
        asyncio.run(list_stores())
        return

    if not args.email:
        parser.error("email is required unless you pass --list-stores")

    if args.consumer:
        asyncio.run(demote_to_consumer(args.email))
        return

    try:
        store_id = UUID(args.store_id)
    except ValueError:
        parser.error(f"Invalid store id: {args.store_id}")

    asyncio.run(promote(args.email, store_id))


if __name__ == "__main__":
    main()
