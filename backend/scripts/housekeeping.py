"""Safe housekeeping for transient security records.

Run manually or from cron after the production database is configured:
    python scripts/housekeeping.py

This script intentionally does NOT delete bookings, payments, consent records,
audit logs, support records or payment webhook idempotency records.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlmodel import Session, select  # noqa: E402
from app.database import engine  # noqa: E402
from app.models import AuthToken, RateLimitEvent  # noqa: E402

now = datetime.now(timezone.utc)
token_cutoff = now - timedelta(days=7)
rate_cutoff = now - timedelta(days=14)

with Session(engine) as session:
    tokens = session.exec(select(AuthToken).where(AuthToken.expires_at < token_cutoff)).all()
    rates = session.exec(select(RateLimitEvent).where(RateLimitEvent.created_at < rate_cutoff)).all()
    for row in tokens:
        session.delete(row)
    for row in rates:
        session.delete(row)
    session.commit()
    print(f"Deleted {len(tokens)} expired auth token record(s) and {len(rates)} old rate-limit event(s).")
