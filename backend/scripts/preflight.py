"""Read-only launch preflight. Returns non-zero when production-critical checks fail."""
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlmodel import Session, select
from app.config import settings
from app.database import engine
from app.models import User, LocalProfile, SeoCity, ServiceCategory

DEMO_EMAILS={"admin@hirealocals.com","traveler@example.com","james@example.com","maya@example.com","olivia@example.com","daniel@example.com"}

def ok(label, detail=""): print(f"[ OK ] {label}" + (f": {detail}" if detail else ""))
def warn(label, detail=""): print(f"[WARN] {label}" + (f": {detail}" if detail else ""))
def fail(label, detail=""): print(f"[FAIL] {label}" + (f": {detail}" if detail else ""))

def main()->int:
    failures=[]
    print(f"HireALocals preflight — environment={settings.app_env}")
    issues=settings.production_issues() if settings.is_production else []
    if settings.is_production:
        if issues:
            for issue in issues: fail("Production config",issue); failures.append(issue)
        else: ok("Production configuration")
    else: warn("Environment", "Development mode; production-only strict checks are informational")
    try:
        with Session(engine) as session:
            users=session.exec(select(User)).all(); admins=[u for u in users if u.role=="admin" and u.is_active]
            ok("Database connection", "PostgreSQL" if settings.database_url.startswith(("postgresql","postgres")) else "SQLite")
            if admins: ok("Active admin account", f"{len(admins)} active admin(s)")
            else: fail("Active admin account","Create one with scripts/create_admin.py"); failures.append("no active admin")
            demos=[u.email for u in users if u.email.lower() in DEMO_EMAILS and u.is_active]
            if demos:
                warn("Active demo accounts", ", ".join(demos))
                if settings.is_production: failures.append("active demo accounts")
            else: ok("Demo accounts", "No active known demo accounts")
            locals_count=len(session.exec(select(LocalProfile)).all())
            city_count=len(session.exec(select(SeoCity).where(SeoCity.published==True)).all())
            category_count=len(session.exec(select(ServiceCategory).where(ServiceCategory.active==True)).all())
            ok("Marketplace content", f"{locals_count} locals, {city_count} published cities, {category_count} active categories")
    except Exception as exc:
        fail("Database connection", str(exc)); failures.append("database unavailable")
    backend=Path(__file__).resolve().parents[1]
    for rel in ("uploads","private_uploads"):
        folder=backend/rel
        try:
            folder.mkdir(parents=True,exist_ok=True); probe=folder/".write-test"; probe.write_text("ok"); probe.unlink(); ok(f"Writable {rel}")
        except Exception as exc:
            fail(f"Writable {rel}",str(exc));failures.append(f"{rel} not writable")
    if settings.smtp_host: ok("SMTP", "Configured")
    else: warn("SMTP", "Not configured; emails stay in Admin > Email outbox")
    if settings.payment_mode == "manual":
        warn("Payments", "Manual mode; Safepay checkout is disabled")
    else:
        payment_problems=[]

        if settings.payment_mode not in {"safepay_sandbox", "safepay_live"}:
            payment_problems.append("unsupported payment mode")

        if not settings.safepay_public_key.strip():
            payment_problems.append("public key is missing")

        if not settings.safepay_secret_key.strip():
            payment_problems.append("secret key is missing")

        if not settings.safepay_webhook_secret.strip():
            payment_problems.append("webhook secret is missing")

        if settings.safepay_currency.upper() not in {"USD", "PKR"}:
            payment_problems.append("currency must be USD or PKR")

        if settings.payment_mode == "safepay_live":
            if settings.safepay_env.strip().lower() != "production":
                payment_problems.append("SAFEPAY_ENV must be production")

            if not settings.safepay_webhook_url.startswith("https://"):
                payment_problems.append("live webhook URL must use HTTPS")

        if payment_problems:
            warn(
                "Payments",
                f"{settings.payment_mode}: "
                + "; ".join(payment_problems),
            )

            if settings.is_production:
                failures.append(
                    "Safepay payment configuration incomplete"
                )
        else:
            ok(
                "Payments",
                f"{settings.payment_mode} / "
                f"{settings.safepay_currency.upper()}",
            )
    if settings.api_docs_enabled and settings.is_production: warn("API docs", "Enabled in production; consider API_DOCS_ENABLED=false")
    print("\nResult:", "PASS" if not failures else f"FAIL ({len(failures)} critical issue(s))")
    return 0 if not failures else 1

if __name__=="__main__": raise SystemExit(main())
