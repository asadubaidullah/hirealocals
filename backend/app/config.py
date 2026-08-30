from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./hirealocals.db"
    jwt_secret: str = "change-me-in-production"
    access_token_minutes: int = 720
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,https://hirealocals.com,https://www.hirealocals.com"
    frontend_url: str = "http://localhost:3000"

    # Didit hosted identity verification.
    # Secrets stay backend-only.
    didit_api_key: str = ""
    didit_workflow_id: str = ""
    didit_base_url: str = "https://verification.didit.me"

    # Environment / production safety.
    app_env: str = "development"
    strict_production_checks: bool = False
    seed_demo_data: bool = True
    api_docs_enabled: bool = True
    trusted_hosts: str = "localhost,127.0.0.1,192.168.1.2,api,hirealocals.com,www.hirealocals.com"
    rate_limit_enabled: bool = True
    max_upload_mb: int = 8

    # Payments: manual | safepay_sandbox | safepay_live
    payment_mode: str = "manual"

    # Safepay.
    safepay_env: str = "sandbox"
    safepay_public_key: str = ""
    safepay_secret_key: str = ""
    safepay_webhook_secret: str = ""
    safepay_webhook_url: str = ""
    safepay_currency: str = "USD"
    safepay_checkout_success_url: str = ""
    safepay_checkout_cancel_url: str = ""

    # Policy versioning / launch readiness.
    terms_version: str = "draft"
    privacy_version: str = "draft"
    booking_policy_version: str = "draft"
    release_version: str = "3.3.0"

    @property
    def safepay_enabled(self) -> bool:
        return self.payment_mode.strip().lower() in {
            "safepay_sandbox",
            "safepay_live",
        }

    @property
    def payment_provider(self) -> str:
        return "safepay" if self.safepay_enabled else "manual"

    @property
    def payment_currency(self) -> str:
        return (
            self.safepay_currency.lower()
            if self.safepay_enabled
            else "usd"
        )

    @property
    def payment_required(self) -> bool:
        return self.safepay_enabled

    # Email.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "support@hirealocals.com"
    smtp_from_name: str = "HireALocals"
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        extra="ignore",
    )

    @property
    def cors_list(self) -> list[str]:
        return [
            item.strip()
            for item in self.cors_origins.split(",")
            if item.strip()
        ]

    @property
    def trusted_hosts_list(self) -> list[str]:
        return [
            item.strip()
            for item in self.trusted_hosts.split(",")
            if item.strip()
        ]

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    def production_issues(self) -> list[str]:
        """Critical launch checks used by startup guard and preflight."""
        issues: list[str] = []

        if (
            self.jwt_secret == "change-me-in-production"
            or len(self.jwt_secret) < 32
        ):
            issues.append(
                "JWT_SECRET must be a unique random value of at least "
                "32 characters"
            )

        if not self.database_url.startswith(
            ("postgresql", "postgres")
        ):
            issues.append(
                "Production should use PostgreSQL, not the local "
                "SQLite fallback"
            )

        if not self.frontend_url.lower().startswith("https://"):
            issues.append(
                "FRONTEND_URL should use HTTPS in production"
            )

        if any(
            origin.startswith("http://")
            and "localhost" not in origin
            and "127.0.0.1" not in origin
            for origin in self.cors_list
        ):
            issues.append(
                "CORS_ORIGINS contains a non-local HTTP origin; "
                "use HTTPS in production"
            )

        if self.seed_demo_data:
            issues.append(
                "SEED_DEMO_DATA must be false in production"
            )

        mode = self.payment_mode.strip().lower()

        if mode not in {
            "manual",
            "safepay_sandbox",
            "safepay_live",
        }:
            issues.append(
                "PAYMENT_MODE must be manual, safepay_sandbox or "
                "safepay_live"
            )

        if mode == "safepay_sandbox":
            issues.append(
                "PAYMENT_MODE=safepay_sandbox must not be used "
                "for a public production launch"
            )

        if mode == "safepay_live":

            if self.safepay_env.strip().lower() != "production":
                issues.append(
                    "SAFEPAY_ENV must be production when "
                    "PAYMENT_MODE=safepay_live"
                )

            if not self.safepay_public_key.strip():
                issues.append(
                    "SAFEPAY_PUBLIC_KEY is required"
                )

            if not self.safepay_secret_key.strip():
                issues.append(
                    "SAFEPAY_SECRET_KEY is required"
                )

            if not self.safepay_webhook_secret.strip():
                issues.append(
                    "SAFEPAY_WEBHOOK_SECRET is required"
                )

            if not self.safepay_webhook_url.startswith("https://"):
                issues.append(
                    "SAFEPAY_WEBHOOK_URL must use HTTPS in live mode"
                )

        if (
            mode.startswith("safepay_")
            and self.safepay_currency.upper()
            not in {"USD", "PKR"}
        ):
            issues.append(
                "SAFEPAY_CURRENCY must be USD or PKR"
            )

        if (
            not self.terms_version.strip()
            or self.terms_version.strip()
            .lower()
            .startswith("draft")
        ):
            issues.append(
                "TERMS_VERSION is still draft; publish reviewed "
                "marketplace terms before production launch"
            )

        if (
            not self.privacy_version.strip()
            or self.privacy_version.strip()
            .lower()
            .startswith("draft")
        ):
            issues.append(
                "PRIVACY_VERSION is still draft; publish a reviewed "
                "privacy policy before production launch"
            )

        if (
            not self.booking_policy_version.strip()
            or self.booking_policy_version.strip()
            .lower()
            .startswith("draft")
        ):
            issues.append(
                "BOOKING_POLICY_VERSION is still draft; publish "
                "cancellation/refund rules before paid launch"
            )

        return issues


settings = Settings()
