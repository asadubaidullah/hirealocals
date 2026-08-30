"""Create the first production admin without exposing a default password.

Run from backend/:  python scripts/create_admin.py --email you@example.com --name "Admin Name"
"""
from __future__ import annotations
import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import User
from app.security import hash_password


def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--promote", action="store_true", help="Promote an existing user to admin")
    args=parser.parse_args()
    email=args.email.lower().strip()
    password=getpass.getpass("New admin password (12+ characters recommended): ")
    confirm=getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.", file=sys.stderr); return 2
    if len(password) < 12:
        print("Use a password of at least 12 characters.", file=sys.stderr); return 2
    create_db_and_tables()
    with Session(engine) as session:
        user=session.exec(select(User).where(User.email==email)).first()
        if user:
            if not args.promote:
                print("That email already exists. Re-run with --promote if this is intentional.", file=sys.stderr); return 3
            user.role="admin"; user.is_active=True; user.full_name=args.name.strip(); user.password_hash=hash_password(password)
        else:
            user=User(email=email,full_name=args.name.strip(),role="admin",is_active=True,password_hash=hash_password(password))
        session.add(user);session.commit();session.refresh(user)
        print(f"Admin ready: id={user.id}, email={user.email}")
    return 0

if __name__=="__main__": raise SystemExit(main())
