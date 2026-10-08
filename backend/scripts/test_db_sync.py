"""
Sync connection test — matches Supabase SQLAlchemy docs.
Run this first if async connection fails:  python scripts/test_db_sync.py
"""

import _bootstrap  # noqa: F401

from sqlalchemy import create_engine, text

from config import build_sync_database_url, get_db_settings

DATABASE_URL = build_sync_database_url()
print(DATABASE_URL)
engine = create_engine(DATABASE_URL)

if __name__ == "__main__":
    user, _, host, port, dbname = get_db_settings()
    print(f"Testing sync connection to {host}:{port}/{dbname} as {user}...")

    try:
        with engine.connect() as connection:
            version = connection.execute(text("SELECT version()")).scalar_one()
        print("Connection successful!")
        print(f"  Driver:  psycopg2 (sync)")
        print(f"  Version: {version[:60]}...")
    except Exception as exc:
        error_text = str(exc)
        print(f"Failed to connect: {exc}")
        print("\nFix checklist:")
        print("  1. Copy EXACT host from Supabase → Settings → Database → Connection string")
        print("     (may be aws-1-REGION not aws-0 — do not guess ap-south-1)")
        print("  2. Try Session pooler first (port 5432), then Transaction (port 6543)")
        print("  3. user must be postgres.ejabqoicrsurrthwybty for pooler (not plain postgres)")
        print("  4. Reset database password if project was paused/restored")
        if "tenant" in error_text.lower() or "not found" in error_text.lower():
            print("\n  >> 'Tenant/user not found' = wrong pooler HOST or wrong PORT mode.")
            print("     Open dashboard and copy the hostname exactly — it is region-specific.")
        raise SystemExit(1) from exc
