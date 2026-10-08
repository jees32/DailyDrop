"""Apply corrected store GPS pins from region_coords.py to the live database.

Run once after correcting coordinates:
    python scripts/fix_store_coordinates.py
"""
from __future__ import annotations

import _bootstrap  # noqa: F401

from sqlalchemy import create_engine, text

from config import build_sync_database_url
from region_coords import DEFAULT_TOWN, STORE_PINS, TOWN_CENTERS


def fix_coordinates() -> None:
    engine = create_engine(build_sync_database_url(), connect_args={"sslmode": "require"})

    with engine.begin() as conn:
        for pin in STORE_PINS:
            result = conn.execute(
                text(
                    """
                    UPDATE stores
                    SET location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                    WHERE id = CAST(:store_id AS uuid)
                    """
                ),
                {"lat": pin.lat, "lng": pin.lng, "store_id": pin.store_id},
            )
            print(f"  {pin.store_name}: updated {result.rowcount} row(s)")

        print("\n=== Verification from Paingottoor (10.007, 76.710) ===")
        rows = conn.execute(
            text(
                """
                SELECT store_name,
                       ROUND((ST_Distance(
                           location::geography,
                           ST_SetSRID(ST_MakePoint(76.710, 10.007), 4326)::geography
                       ) / 1000.0)::numeric, 1) AS straight_km
                FROM stores
                ORDER BY straight_km
                """
            )
        ).fetchall()
        for row in rows:
            print(f"  {row.straight_km} km — {row.store_name}")

        print("\n=== Town-center straight-line km (PostGIS) ===")
        for origin in TOWN_CENTERS:
            for dest in TOWN_CENTERS:
                if origin.id == dest.id:
                    continue
                km = conn.execute(
                    text(
                        """
                        SELECT ROUND((ST_Distance(
                            ST_SetSRID(ST_MakePoint(:lng1, :lat1), 4326)::geography,
                            ST_SetSRID(ST_MakePoint(:lng2, :lat2), 4326)::geography
                        ) / 1000.0)::numeric, 1) AS km
                        """
                    ),
                    {
                        "lat1": origin.lat,
                        "lng1": origin.lng,
                        "lat2": dest.lat,
                        "lng2": dest.lng,
                    },
                ).scalar_one()
                print(f"  {origin.name} -> {dest.name}: {km} km (straight-line)")

    print(f"\nDefault fallback location: {DEFAULT_TOWN.name} ({DEFAULT_TOWN.lat}, {DEFAULT_TOWN.lng})")


if __name__ == "__main__":
    fix_coordinates()
