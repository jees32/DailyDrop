from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base
from models.enums import UserRole, user_role_enum


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        comment="References auth.users(id) — FK added in migration",
    )
    phone_number: Mapped[str | None] = mapped_column(String(15), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        user_role_enum,
        nullable=False,
        server_default=UserRole.consumer.value,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    stores: Mapped[list[Store]] = relationship(back_populates="merchant")
    addresses: Mapped[list["UserAddress"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return (
            f"<User id={self.id} name={self.full_name} "
            f"email={self.email} phone={self.phone_number}>"
        )
