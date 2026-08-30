# HireALocals V3.2 — Stripe sandbox test runbook

Use this only with Stripe test/sandbox credentials. Real card details are never needed for this test.

## 1) Configure local `.env`

Keep your root `.env` out of Git. Set:

```env
PAYMENT_MODE=stripe_test
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_AFTER_STARTING_CLI
STRIPE_CURRENCY=usd
STRIPE_CONNECT_RETURN_URL=http://localhost:3000/local-dashboard/earnings?stripe=return
STRIPE_CONNECT_REFRESH_URL=http://localhost:3000/local-dashboard/earnings?stripe=refresh
STRIPE_CHECKOUT_SUCCESS_URL=
STRIPE_CHECKOUT_CANCEL_URL=
STRIPE_ON_BEHALF_OF=false
```

The backend checks that `stripe_test` uses an `sk_test_` key. Live keys should never be used for local testing.

## 2) Install/login to Stripe CLI

Follow Stripe's official Stripe CLI installation for your OS, then:

```powershell
stripe login
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

The CLI prints a webhook signing secret beginning with `whsec_`. Put that value in `STRIPE_WEBHOOK_SECRET` and restart the backend. The signing secret is specific to the webhook endpoint/test listener; it is not an API key.

## 3) Backend checks

With the backend venv active:

```powershell
python scripts/stripe_check.py
python scripts/preflight.py
```

Then login as Admin and open:

- Admin → Stripe health
- Admin → Stripe payments
- Admin → Disputes

`Stripe health` can verify the API connection without exposing keys.

## 4) Connect a Local

Login as a Local, open **Earnings & payouts**, and click **Connect Stripe payouts**. Complete Stripe-hosted test onboarding. The onboarding URL is generated only for the authenticated Local and should not be sent by email or messaging.

Return to HireALocals and confirm the payout account shows ready/transfers active before attempting Checkout.

## 5) Create and confirm a booking

Login as Traveler, create a booking for that Local. Login as the Local and confirm it. Traveler opens the booking detail and starts Stripe Checkout.

For an interactive successful sandbox payment, Stripe documents the common test Visa number `4242 4242 4242 4242`, any future expiry, and any valid CVC. Test card data works only with test keys/sandboxes and must never be used as a real card.

## 6) Verify result

After Checkout:

1. Traveler booking should show **Paid** after the webhook arrives.
2. Admin → Stripe payments should show the PaymentIntent/Checkout references.
3. Admin → Stripe health should show processed `checkout.session.completed` (or async payment) webhook events.
4. Local → Earnings should reflect the Stripe-paid booking value.
5. A completed booking must not be possible before payment when Stripe mode is enabled.

The browser return URL is not treated as proof of payment. The signed Stripe webhook remains authoritative.

## 7) Refund test

Admin → Stripe payments → choose a paid booking → **Full refund**. The integration requests transfer reversal and application-fee refund together, then updates the internal booking/payment state from Stripe.

## 8) Dispute test/operations

V3.2 records Stripe dispute webhook events (`charge.dispute.created`, updates and closure) under **Admin → Disputes**. For destination charges, dispute amounts/fees can affect the platform balance. Evidence/challenge submission remains in Stripe Dashboard rather than being duplicated inside HireALocals.

## Before live mode

Do not switch to `PAYMENT_MODE=stripe_live` until:

- the Stripe platform account is approved for the marketplace model and target countries;
- Local Connect onboarding/payout availability is confirmed for the intended countries;
- production uses HTTPS;
- live secret key uses `sk_live_...`;
- the production webhook endpoint has its own `whsec_...` secret;
- PostgreSQL, SMTP, backups, production admin and demo-account removal are complete;
- refund/dispute/support procedures are finalized.
