from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from auth import AuthUser, get_current_user
from database import get_db
from models.enums import UserRole
from models.user import User
from models.user_address import UserAddress
from schemas.user import UserMeUpdate, UserMeUpsert, UserProfileResponse

router = APIRouter(prefix="/api/v1/users", tags=["users"])


async def _address_stats(db: AsyncSession, user_id: UUID) -> tuple[int, bool]:
    count = await db.scalar(
        select(func.count())
        .select_from(UserAddress)
        .where(UserAddress.user_id == user_id)
    )
    has_default = await db.scalar(
        select(func.count())
        .select_from(UserAddress)
        .where(UserAddress.user_id == user_id, UserAddress.is_default.is_(True))
    )
    return int(count or 0), bool(has_default)


def _serialize_user(user: User, address_count: int, has_default_address: bool) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        phone_number=user.phone_number,
        full_name=user.full_name,
        role=user.role.value,
        is_verified=user.is_verified,
        is_active=user.is_active,
        created_at=user.created_at,
        address_count=address_count,
        has_default_address=has_default_address,
    )


async def _fetch_user(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = await _fetch_user(db, auth_user.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /api/v1/users/me after sign-in.",
        )
    address_count, has_default = await _address_stats(db, auth_user.id)
    return _serialize_user(user, address_count, has_default)


@router.post("/me", response_model=UserProfileResponse)
async def upsert_me(
    payload: UserMeUpsert | None = None,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    email = (payload.email if payload and payload.email else None) or auth_user.email
    phone_number = (
        payload.phone_number if payload and payload.phone_number else None
    ) or auth_user.phone
    full_name = payload.full_name.strip() if payload and payload.full_name else None

    if not email and not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone number missing from token and request body",
        )

    values = {
        "id": auth_user.id,
        "role": UserRole.consumer,
        "is_verified": True,
        "is_active": True,
    }
    update_fields = {"is_verified": True}

    if email:
        values["email"] = email
        update_fields["email"] = email
    if phone_number:
        values["phone_number"] = phone_number
        update_fields["phone_number"] = phone_number
    if full_name:
        values["full_name"] = full_name
        update_fields["full_name"] = full_name

    stmt = (
        insert(User)
        .values(**values)
        .on_conflict_do_update(
            index_elements=[User.id],
            set_=update_fields,
        )
        .returning(User)
    )
    result = await db.execute(stmt)
    await db.commit()
    user = result.scalar_one()
    address_count, has_default = await _address_stats(db, auth_user.id)
    return _serialize_user(user, address_count, has_default)


@router.patch("/me", response_model=UserProfileResponse)
async def update_me(
    payload: UserMeUpdate,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = await _fetch_user(db, auth_user.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Call POST /api/v1/users/me after sign-in.",
        )

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()

    await db.commit()
    await db.refresh(user)
    address_count, has_default = await _address_stats(db, auth_user.id)
    return _serialize_user(user, address_count, has_default)
