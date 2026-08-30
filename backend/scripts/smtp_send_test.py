import sys
import smtplib
from pathlib import Path
from email.message import EmailMessage

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app.config import settings

msg = EmailMessage()
msg["Subject"] = "HireALocals SMTP Test"
msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
msg["To"] = settings.smtp_from_email

msg.set_content(
    "HireALocals SMTP is working correctly.\n\n"
    "This is an automated configuration test."
)

try:
    with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=20
    ) as smtp:
        smtp.ehlo()

        if settings.smtp_use_tls:
            smtp.starttls()
            smtp.ehlo()

        smtp.login(
            settings.smtp_username,
            settings.smtp_password
        )

        smtp.send_message(msg)

    print("SMTP_TEST_SENT: True")
    print("RECIPIENT:", settings.smtp_from_email)

except Exception as exc:
    print("SMTP_TEST_SENT: False")
    print("ERROR_TYPE:", type(exc).__name__)
    print("ERROR:", str(exc))