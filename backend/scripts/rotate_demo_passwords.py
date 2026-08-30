import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlmodel import Session, select
from app.database import engine
from app.models import User
from app.security import hash_password

accounts = [
    "admin@hirealocals.com",
    "james@example.com",
    "traveler@example.com",
]

with Session(engine) as session:
    for email in accounts:
        user = session.exec(
            select(User).where(User.email == email)
        ).first()

        if not user:
            print(f"{email}: NOT FOUND")
            continue

        new_password = "HAL-" + secrets.token_urlsafe(18)

        user.password_hash = hash_password(new_password)
        session.add(user)

        print(f"{email}")
        print(f"NEW PASSWORD: {new_password}")
        print("-" * 50)

    session.commit()

print("PASSWORD ROTATION COMPLETE")