from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from auth import AuthUser, get_current_user
from database import get_db
from models.user_address import UserAddress
from schemas.address import AddressCreate, AddressResponse, AddressUpdate, LocationInput

router = APIRouter(prefix="/api/v1/addresses", tags=["addresses"])

ADDRESS_SELECT = """
    SELECT
        a.id,
        a.user_id,
        a.label,
        a.recipient_name,
        a.contact_phone,
        a.address_line1,
        a.address_line2,
        a.city,
        a.pincode,
        a.is_default,
        a.created_at,
        ST_Y(a.location::geometry) AS lat,
        ST_X(a.location::geometry) AS lng
    FROM user_addresses a
"""


def _row_to_address(row) -> AddressResponse:
    return AddressResponse(
        id=row.id,
        user_id=row.user_id,
        label=row.label,
        recipient_name=row.recipient_name,
        contact_phone=row.contact_phone,
        address_line1=row.address_line1,
        address_line2=row.address_line2,
        city=row.city,
        pincode=row.pincode,
        location=LocationInput(lat=float(row.lat), lng=float(row.lng)),
        is_default=row.is_default,
        created_at=row.created_at,
    )


def _location_element(location: LocationInput) -> WKTElement:
    return WKTElement(f"POINT({location.lng} {location.lat})", srid=4326)


async def _fetch_address(
    db: AsyncSession,
    address_id: UUID,
    user_id: UUID,
) -> AddressResponse | None:
    result = await db.execute(
        text(f"{ADDRESS_SELECT} WHERE a.id = :id AND a.user_id = :user_id"),
        {"id": address_id, "user_id": user_id},
    )
    row = result.first()
    return _row_to_address(row) if row else None


async def _clear_default_addresses(db: AsyncSession, user_id: UUID) -> None:
    await db.execute(
        update(UserAddress)
        .where(UserAddress.user_id == user_id, UserAddress.is_default.is_(True))
        .values(is_default=False)
    )


@router.get("", response_model=list[AddressResponse])
async def list_addresses(
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AddressResponse]:
    result = await db.execute(
        text(f"{ADDRESS_SELECT} WHERE a.user_id = :user_id ORDER BY a.is_default DESC, a.created_at DESC"),
        {"user_id": auth_user.id},
    )
    return [_row_to_address(row) for row in result.all()]


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressCreate,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    existing_count = await db.scalar(
        select(func.count())
        .select_from(UserAddress)
        .where(UserAddress.user_id == auth_user.id)
    )
    is_default = payload.is_default or existing_count == 0

    if is_default:
        await _clear_default_addresses(db, auth_user.id)

    stmt = (
        insert(UserAddress)
        .values(
            user_id=auth_user.id,
            label=payload.label.strip() or "Home",
            recipient_name=payload.recipient_name,
            contact_phone=payload.contact_phone,
            address_line1=payload.address_line1.strip(),
            address_line2=payload.address_line2.strip() if payload.address_line2 else None,
            city=payload.city.strip(),
            pincode=payload.pincode.strip() if payload.pincode else None,
            location=_location_element(payload.location),
            is_default=is_default,
        )
        .returning(UserAddress.id)
    )
    result = await db.execute(stmt)
    address_id = result.scalar_one()
    await db.commit()

    address = await _fetch_address(db, address_id, auth_user.id)
    if address is None:
        raise HTTPException(status_code=500, detail="Failed to create address")
    return address


@router.patch("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: UUID,
    payload: AddressUpdate,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    existing = await _fetch_address(db, address_id, auth_user.id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Address not found")

    values: dict = {}
    if payload.label is not None:
        values["label"] = payload.label.strip() or "Home"
    if payload.recipient_name is not None:
        values["recipient_name"] = payload.recipient_name
    if payload.contact_phone is not None:
        values["contact_phone"] = payload.contact_phone
    if payload.address_line1 is not None:
        values["address_line1"] = payload.address_line1.strip()
    if payload.address_line2 is not None:
        values["address_line2"] = payload.address_line2.strip() or None
    if payload.city is not None:
        values["city"] = payload.city.strip()
    if payload.pincode is not None:
        values["pincode"] = payload.pincode.strip() or None
    if payload.location is not None:
        values["location"] = _location_element(payload.location)
    if payload.is_default is True:
        await _clear_default_addresses(db, auth_user.id)
        values["is_default"] = True
    elif payload.is_default is False:
        values["is_default"] = False

    if values:
        await db.execute(
            update(UserAddress)
            .where(UserAddress.id == address_id, UserAddress.user_id == auth_user.id)
            .values(**values)
        )
        await db.commit()

    updated = await _fetch_address(db, address_id, auth_user.id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Address not found")
    return updated


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: UUID,
    auth_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(UserAddress).where(
            UserAddress.id == address_id,
            UserAddress.user_id == auth_user.id,
        )
    )
    address = result.scalar_one_or_none()
    if address is None:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = address.is_default
    await db.execute(
        delete(UserAddress).where(
            UserAddress.id == address_id,
            UserAddress.user_id == auth_user.id,
        )
    )
    await db.commit()

    if was_default:
        result = await db.execute(
            select(UserAddress)
            .where(UserAddress.user_id == auth_user.id)
            .order_by(UserAddress.created_at.desc())
            .limit(1)
        )
        next_default = result.scalar_one_or_none()
        if next_default is not None:
            next_default.is_default = True
            await db.commit()
