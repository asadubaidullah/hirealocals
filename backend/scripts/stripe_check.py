"""Read-only Stripe configuration/API diagnostic.

Run from backend with the venv active:
    python scripts/stripe_check.py
It never prints secret-key or webhook-secret values.
"""
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings


def key_kind() -> str:
    key=(settings.stripe_secret_key or '').strip()
    if key.startswith('sk_test_'): return 'test'
    if key.startswith('sk_live_'): return 'live'
    return 'missing' if not key else 'unknown'


def main() -> int:
    print(f"HireALocals Stripe check — mode={settings.payment_mode} currency={settings.stripe_currency.upper()}")
    print(f"Secret key: {'configured' if settings.stripe_secret_key else 'missing'} ({key_kind()})")
    print(f"Webhook secret: {'configured' if settings.stripe_webhook_secret.startswith('whsec_') else 'missing/invalid'}")
    print(f"Connect return URL: {'configured' if settings.stripe_connect_return_url else 'missing'}")
    print(f"Connect refresh URL: {'configured' if settings.stripe_connect_refresh_url else 'missing'}")
    if settings.payment_mode == 'manual':
        print('[INFO] Stripe API call skipped because PAYMENT_MODE=manual')
        return 0
    expected='test' if settings.payment_mode == 'stripe_test' else 'live'
    if key_kind()!=expected:
        print(f"[FAIL] {settings.payment_mode} requires a {expected} secret key")
        return 2
    try:
        import stripe
        stripe.api_key=settings.stripe_secret_key
        account=stripe.Account.retrieve()
        print(f"[ OK ] Stripe API: account={account.get('id','')} country={account.get('country','')} charges_enabled={bool(account.get('charges_enabled'))} payouts_enabled={bool(account.get('payouts_enabled'))}")
        return 0
    except Exception as exc:
        print(f"[FAIL] Stripe API: {exc}")
        return 3

if __name__=='__main__':
    raise SystemExit(main())
