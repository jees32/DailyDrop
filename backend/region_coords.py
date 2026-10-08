"""Canonical GPS coordinates for the DailyDrop Kerala service area.

Town centers are approximate market-area pins (WGS 84 / SRID 4326).
Store pins sit near each town; offsets are for demo spread only.

Note: PostGIS ST_Distance returns geodesic (straight-line) km, not driving km.
Driving distance in this region is typically ~1.3–1.5× straight-line.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TownCenter:
    id: str
    name: str
    lat: float
    lng: float


@dataclass(frozen=True)
class StorePin:
    store_id: str
    store_name: str
    lat: float
    lng: float
    town_id: str


TOWN_CENTERS: tuple[TownCenter, ...] = (
    TownCenter("paingottoor", "Paingottoor", 10.0070, 76.7100),
    TownCenter("kothamangalam", "Kothamangalam", 10.0652, 76.6291),
    TownCenter("muvattupuzha", "Muvattupuzha", 9.9894, 76.5772),
    TownCenter("thodupuzha", "Thodupuzha", 9.8958, 76.7186),
)

TOWN_BY_ID = {town.id: town for town in TOWN_CENTERS}

DEFAULT_TOWN = TOWN_BY_ID["paingottoor"]

STORE_PINS: tuple[StorePin, ...] = (
    StorePin(
        "41000000-0000-4000-8000-000000000001",
        "Store 1",
        10.0580,
        76.6380,
        "kothamangalam",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000002",
        "Store 2",
        10.0620,
        76.6320,
        "kothamangalam",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000003",
        "Store 3",
        10.0660,
        76.6260,
        "kothamangalam",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000004",
        "Store 4",
        9.9894,
        76.5772,
        "muvattupuzha",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000005",
        "Store 5",
        9.9820,
        76.5850,
        "muvattupuzha",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000006",
        "Store 6",
        9.9910,
        76.5710,
        "muvattupuzha",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000007",
        "Store 7",
        9.8958,
        76.7186,
        "thodupuzha",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000008",
        "Store 8",
        9.8930,
        76.7150,
        "thodupuzha",
    ),
    StorePin(
        "41000000-0000-4000-8000-000000000009",
        "Store 9",
        9.9020,
        76.7350,
        "thodupuzha",
    ),
)
