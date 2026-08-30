"""Safely deactivate known starter/demo accounts without deleting relational history."""
from __future__ import annotations
import argparse,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from sqlmodel import Session,select
from app.database import engine
from app.models import User,LocalProfile
DEMO_EMAILS={"admin@hirealocals.com","traveler@example.com","james@example.com","maya@example.com","olivia@example.com","daniel@example.com"}

def main()->int:
    ap=argparse.ArgumentParser();ap.add_argument("--confirm",action="store_true");args=ap.parse_args()
    if not args.confirm: print("No changes made. Re-run with --confirm after creating your real admin account.");return 1
    with Session(engine) as session:
        users=session.exec(select(User)).all();changed=[]
        for user in users:
            if user.email.lower() in DEMO_EMAILS:
                user.is_active=False;session.add(user);changed.append(user.email)
                if user.role=="local":
                    profile=session.exec(select(LocalProfile).where(LocalProfile.user_id==user.id)).first()
                    if profile: profile.verified=False;session.add(profile)
        session.commit();print("Disabled:",", ".join(changed) if changed else "none")
    return 0
if __name__=="__main__": raise SystemExit(main())
