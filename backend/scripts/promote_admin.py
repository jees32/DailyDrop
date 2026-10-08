"""Promote a user to admin by email.

Usage:
    python scripts/promote_admin.py you@example.com
"""
from __future__ import annotations

import asyncio
import sys

import _bootstrap  # noqa: F401

from sqlalchemy import select, update

from database import AsyncSessionLocal
from models.enums import UserRole
from models.user import User


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

        if user.role == UserRole.admin:
            print(f"{normalized} is already an admin.")
            return

        await session.execute(
            update(User).where(User.id == user.id).values(role=UserRole.admin)
        )
        await session.commit()
        print(f"Promoted {normalized} to admin.")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/promote_admin.py <email>")
        sys.exit(1)
    asyncio.run(promote(sys.argv[1]))


if __name__ == "__main__":
    main()
