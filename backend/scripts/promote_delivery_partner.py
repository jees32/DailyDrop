"""Promote a signed-in user to delivery partner for testing.

Usage:
    python scripts/promote_delivery_partner.py you@example.com
    python scripts/promote_delivery_partner.py you@example.com --consumer
"""
from __future__ import annotations

import argparse
import asyncio

import _bootstrap  # noqa: F401

from sqlalchemy import select, update

from database import AsyncSessionLocal
from models.enums import UserRole
from models.user import User


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


async def promote(email: str) -> None:
    normalized = email.strip().lower()
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == normalized)
        )
        user = result.scalar_one_or_none()
        if user is None:
            print(f"No user found with email: {normalized}")
            print("Sign in to the app once so POST /api/v1/users/me creates the row.")
            return

        if user.role == UserRole.delivery_partner:
            print(f"{normalized} is already a delivery partner.")
            return

        if user.role == UserRole.admin:
            print(f"Warning: {normalized} is admin — role will change to delivery_partner.")

        await session.execute(
            update(User)
            .where(User.id == user.id)
            .values(role=UserRole.delivery_partner)
        )
        await session.commit()
        print(f"Promoted {normalized} to delivery partner.")
        print("Refresh the app (or sign out/in) then open /delivery")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Promote a user to delivery partner for testing.",
    )
    parser.add_argument("email", nargs="?", help="User email (must have signed in once)")
    parser.add_argument(
        "--consumer",
        action="store_true",
        help="Set user back to consumer role",
    )
    args = parser.parse_args()

    if not args.email:
        parser.error("email is required")

    if args.consumer:
        asyncio.run(demote_to_consumer(args.email))
        return

    asyncio.run(promote(args.email))


if __name__ == "__main__":
    main()
