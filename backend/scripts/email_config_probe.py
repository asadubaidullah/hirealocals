import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app.config import settings

print("=== RAW CPANEL ENV ===")
print("ENV_SMTP_HOST_SET:", bool(os.environ.get("SMTP_HOST")))
print("ENV_SMTP_PORT:", os.environ.get("SMTP_PORT") or "<not set>")
print("ENV_SMTP_USERNAME_SET:", bool(os.environ.get("SMTP_USERNAME")))
print("ENV_SMTP_PASSWORD_SET:", bool(os.environ.get("SMTP_PASSWORD")))
print("ENV_APP_ENV:", os.environ.get("APP_ENV") or "<not set>")
print("ENV_DATABASE_URL_SET:", bool(os.environ.get("DATABASE_URL")))

print("")
print("=== PYDANTIC SETTINGS ===")
print("SMTP_HOST:", settings.smtp_host or "<not set>")
print("SMTP_PORT:", settings.smtp_port)
print("SMTP_USERNAME_SET:", bool(settings.smtp_username))
print("SMTP_PASSWORD_SET:", bool(settings.smtp_password))
print("SMTP_FROM_EMAIL:", settings.smtp_from_email)
print("SMTP_USE_TLS:", settings.smtp_use_tls)
print("APP_ENV:", settings.app_env)