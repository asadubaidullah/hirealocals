# HireALocals V3.2 production deployment

## Recommended topology

- `hirealocals.com` / `www.hirealocals.com` -> Next.js frontend
- `api.hirealocals.com` -> FastAPI API
- PostgreSQL -> production database
- HTTPS reverse proxy / CDN in front of the public services
- Persistent private/public upload storage and regular database backups
- Stripe platform account -> Stripe Checkout + Connect when payments are enabled

Payments are **off by default**. `PAYMENT_MODE=manual` preserves the existing non-payment workflow.

## 1. Environment

Copy `.env.example` to `.env` and change every production value. At minimum:

```env
APP_ENV=production
STRICT_PRODUCTION_CHECKS=true
SEED_DEMO_DATA=false
API_DOCS_ENABLED=false
RATE_LIMIT_ENABLED=true
JWT_SECRET=<unique random 32+ character secret>
DATABASE_URL=postgresql+psycopg://...
FRONTEND_URL=https://hirealocals.com
CORS_ORIGINS=https://hirealocals.com,https://www.hirealocals.com
TRUSTED_HOSTS=api,api.hirealocals.com,hirealocals.com,www.hirealocals.com
NEXT_PUBLIC_API_URL=https://api.hirealocals.com
NEXT_PUBLIC_SITE_URL=https://hirealocals.com
API_INTERNAL_URL=http://api:8000
```

Configure SMTP before expecting verification/reset messages to be delivered externally.

## 2. Stripe payment modes

### Manual / disabled

```env
PAYMENT_MODE=manual
```

No Stripe API call is made and existing bookings operate as before.

### Stripe test mode

```env
PAYMENT_MODE=stripe_test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
STRIPE_CONNECT_RETURN_URL=http://localhost:3000/local-dashboard/earnings?stripe=return
STRIPE_CONNECT_REFRESH_URL=http://localhost:3000/local-dashboard/earnings?stripe=refresh
STRIPE_ON_BEHALF_OF=false
```

Stripe-hosted Connect onboarding can use HTTP return/refresh URLs in test environments. For live mode, use HTTPS URLs.

### Stripe live mode

```env
PAYMENT_MODE=stripe_live
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
STRIPE_CONNECT_RETURN_URL=https://hirealocals.com/local-dashboard/earnings?stripe=return
STRIPE_CONNECT_REFRESH_URL=https://hirealocals.com/local-dashboard/earnings?stripe=refresh
STRIPE_ON_BEHALF_OF=false
```

Never put Stripe secret keys in `NEXT_PUBLIC_*` variables or frontend code.

## 3. Payment flow implemented in V3.1

1. Traveler requests a booking.
2. Local confirms the booking.
3. Traveler opens Stripe-hosted Checkout from the booking detail page.
4. Checkout creates a destination charge to the Local's connected Stripe account.
5. HireALocals `platform_fee` is sent as Stripe `application_fee_amount`.
6. Webhooks update the local payment record to paid/failed/refunded.
7. A Stripe-required booking cannot be marked completed until the payment is confirmed paid.
8. Paid traveler self-cancellation is blocked; Admin handles the Stripe refund and booking cancellation together.

Stripe processing fees are separate from the HireALocals platform fee. With this destination-charge configuration, Stripe charges the platform for payment processing.

## 4. Stripe Connect onboarding

Each Local can open **Local workspace -> Earnings -> Connect Stripe payouts**. The backend creates a controller-configured connected account and a short-lived Account Link for Stripe-hosted onboarding.

The application caches `details_submitted`, `payouts_enabled`, the Transfers capability and outstanding requirements. Checkout is blocked until the Local payout account is ready.

Before live launch, verify that the Stripe platform entity country, each target connected-account country, currency and cross-border Connect configuration are supported for the intended business model. Do not assume US/UK cross-border behavior without validating the final Stripe account setup. `STRIPE_ON_BEHALF_OF` therefore remains false by default.

## 5. Webhook

Production endpoint:

```text
https://api.hirealocals.com/api/stripe/webhook
```

Subscribe the platform webhook to at least:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `payment_intent.payment_failed`
- `charge.refunded`
- `account.updated` (for connected-account status updates)

Set the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`. The backend verifies the raw body + `Stripe-Signature` header and records processed Stripe event IDs so duplicate deliveries are safe.

For local Stripe testing, use Stripe's test tooling/CLI to forward signed webhook events to the local API and use the signing secret supplied for that local forwarding session.

## 6. Preflight before public launch

With the backend virtual environment active:

```bash
cd backend
python scripts/preflight.py
```

Resolve production-level warnings before opening the marketplace publicly. In strict production mode the API also refuses to start if critical production configuration is unsafe.

## 7. Back up the current local database

Before any migration:

```bash
cd backend
python scripts/backup_database.py
```

The script creates a safe SQLite backup when the project still uses SQLite. For PostgreSQL it uses `pg_dump`, which must be installed on the machine/container running the backup.

## 8. SQLite -> PostgreSQL migration

Create an **empty** PostgreSQL database first. Then run:

```bash
cd backend
python scripts/migrate_database.py \
  --source sqlite:///./hirealocals.db \
  --target postgresql+psycopg://USER:PASSWORD@HOST/DBNAME
```

The migration script refuses to merge into a target that already contains rows. Back up first and verify record counts after migration.

## 9. Production administrator and demo accounts

```bash
python scripts/create_admin.py --email admin@yourdomain.com --name "Site Administrator"
python scripts/disable_demo_accounts.py --confirm
```

The disable script deactivates known demo accounts rather than deleting historical records.

## 10. Docker deployment

```bash
docker compose up --build -d
```

Use a reverse proxy/CDN for public HTTPS. Do not expose PostgreSQL to the public internet.

## 11. Smoke test and launch QA

```bash
cd backend
python scripts/smoke_test.py --base http://127.0.0.1:8000
```

Also test manually as Traveler, Local and Admin: authentication, local Stripe onboarding (test mode), confirmed-booking Checkout, webhook payment confirmation, completion guard, refund, messages, notifications, uploads, moderation, city/blog pages and mobile layouts.

## 12. Backups and user uploads

Database backups and uploaded identity documents are separate responsibilities. Back up the database on a schedule and keep private verification documents in protected storage. Do not commit `.env`, databases, backups, user uploads or Stripe secrets to Git.

## Public SEO deployment

Keep canonical URLs stable after indexing. Only publish useful city/service pages with genuine content and supply. Draft CMS content should remain unpublished until ready.
