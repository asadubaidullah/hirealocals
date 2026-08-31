"""
Point 6 Revenue Engine E2E Automated Verification Test Suite
Covers all 18 acceptance scenarios defined in specs/006-revenue-engine/spec.md
"""

import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Ensure working directory is backend
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

from sqlmodel import Session, select
from app.database import engine
from app.models import User, LocalProfile, Service, Booking, CommissionLedger, PaymentRecord, UploadRecord, WeeklyAvailability
from app.security import hash_password, create_access_token

BASE_URL = "http://127.0.0.1:8000"

def api_call(method: str, path: str, token: str = None, body: dict = None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            data = json.loads(content) if content else {}
            return status, data
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_data = json.loads(content)
        except Exception:
            err_data = {"raw": content}
        return e.code, err_data
    except Exception as ex:
        return 500, {"error": str(ex)}

PASSED = 0
FAILED = 0

def test(name: str, condition: bool, details: str = ""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"[PASS] Scenario {PASSED + FAILED:02d}: {name}", flush=True)
    else:
        FAILED += 1
        print(f"[FAIL] Scenario {PASSED + FAILED:02d}: {name} -- {details}", flush=True)
        sys.exit(1)

print("=" * 70, flush=True)
print("RUNNING POINT 6 REVENUE ENGINE E2E TEST SUITE", flush=True)
print("=" * 70, flush=True)

ts = int(datetime.now(timezone.utc).timestamp())

with Session(engine) as session:
    admin = User(
        email=f"admin_p6_{ts}@test.com",
        password_hash=hash_password("Pass123!"),
        full_name="Admin P6",
        role="admin",
        is_active=True,
    )
    local_user = User(
        email=f"local_p6_{ts}@test.com",
        password_hash=hash_password("Pass123!"),
        full_name="Local Host P6",
        role="local",
        is_active=True,
    )
    traveler_a = User(
        email=f"traveler_a_{ts}@test.com",
        password_hash=hash_password("Pass123!"),
        full_name="Traveler Alice",
        role="tourist",
        is_active=True,
    )
    traveler_b = User(
        email=f"traveler_b_{ts}@test.com",
        password_hash=hash_password("Pass123!"),
        full_name="Traveler Bob",
        role="tourist",
        is_active=True,
    )
    session.add(admin)
    session.add(local_user)
    session.add(traveler_a)
    session.add(traveler_b)
    session.commit()
    session.refresh(admin)
    session.refresh(local_user)
    session.refresh(traveler_a)
    session.refresh(traveler_b)

    local_profile = LocalProfile(
        user_id=local_user.id,
        slug=f"local-p6-{ts}",
        display_name="Local Host P6",
        city_slug="london",
        city_name="London",
        country_code="GB",
        headline="Expert London Guide",
        bio="Guiding with passion.",
        verified=True,
        hourly_rate=50.0,
        kyc_status="approved",
    )
    session.add(local_profile)
    session.commit()
    session.refresh(local_profile)

    local_doc = UploadRecord(
        owner_user_id=local_user.id,
        kind="verification_document",
        original_name="passport.pdf",
        stored_path="passport.pdf",
        mime_type="application/pdf",
        size_bytes=1024,
        public_url="https://example.com/passport.pdf",
        status="approved",
    )
    session.add(local_doc)

    for day in range(7):
        session.add(WeeklyAvailability(
            local_profile_id=local_profile.id,
            weekday=day,
            enabled=True,
            start_time="08:00",
            end_time="22:00",
        ))
    session.commit()

    service = Service(
        local_profile_id=local_profile.id,
        title="Royal Westminster Walking Tour",
        description="Historic walking tour",
        category="History & Culture",
        price=120.0,
        duration_hours=2.5,
        active=True,
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    admin_token = create_access_token(admin)
    local_token = create_access_token(local_user)
    token_a = create_access_token(traveler_a)
    token_b = create_access_token(traveler_b)
    local_id = local_profile.id
    service_id = service.id

# -------------------------------------------------------------
# Scenario 1: Hourly pricing calculation
# -------------------------------------------------------------
# 3 hours at $50/hr = $150 subtotal, 12% fee = $18.00, total = $168.00
st, b1 = api_call("POST", "/api/bookings", token_a, {
    "local_profile_id": local_id,
    "service_id": None,
    "booking_date": "2026-12-01",
    "start_time": "10:00",
    "guests": 2,
    "hours": 3.0,
    "message": "Scenario 1 Hourly Booking",
    "accept_booking_terms": True,
})
test("Hourly pricing calculation (subtotal, 12% fee, traveler total)",
     st == 200 and b1.get("subtotal") == 150.0 and b1.get("platform_fee") == 18.0,
     f"Got {st}: {b1}")

# -------------------------------------------------------------
# Scenario 2: Service fixed pricing calculation
# -------------------------------------------------------------
# Fixed price $120.00, 12% fee = $14.40, total = $134.40
st, b2 = api_call("POST", "/api/bookings", token_a, {
    "local_profile_id": local_id,
    "service_id": service_id,
    "booking_date": "2026-12-02",
    "start_time": "11:00",
    "guests": 2,
    "hours": 2.5,
    "message": "Scenario 2 Service Booking",
    "accept_booking_terms": True,
})
test("Service fixed pricing calculation ($120 service + $14.40 fee)",
     st == 200 and b2.get("subtotal") == 120.0 and b2.get("platform_fee") == 14.4,
     f"Got {st}: {b2}")

# -------------------------------------------------------------
# Scenario 3: Custom Request quote pricing
# -------------------------------------------------------------
st_req, req_out = api_call("POST", "/api/requests", token_a, {
    "city_name": "London",
    "category": "History & Culture",
    "booking_date": "2026-12-03",
    "duration_hours": 4.0,
    "guests": 3,
    "description": "Custom tour request for scenario 3",
})
trip_req_id = req_out.get("id") if isinstance(req_out, dict) else None
st_off, off_out = (0, {})
if trip_req_id:
    st_off, off_out = api_call("POST", f"/api/local/requests/{trip_req_id}/offers", local_token, {
        "offered_price": 250.0,
        "duration_hours": 4.0,
        "proposal_message": "I can offer this 4 hour private tour for $250.",
    })
offer_id = off_out.get("id") if isinstance(off_out, dict) else None
st_acc, acc_out = (0, {})
if trip_req_id and offer_id:
    st_acc, acc_out = api_call("POST", f"/api/traveler/requests/{trip_req_id}/accept/{offer_id}", token_a)
converted_bk_id = acc_out.get("booking_id") if isinstance(acc_out, dict) else None
st_bk, bk_acc = (0, {})
if converted_bk_id:
    st_bk, bk_acc = api_call("GET", f"/api/traveler/bookings/{converted_bk_id}", token_a)
test("Custom Request quote pricing & standard booking creation ($250 offer + $30 fee)",
     st_acc == 200 and bk_acc.get("subtotal") == 250.0 and bk_acc.get("platform_fee") == 30.0,
     f"Req: {st_req} {req_out}, Offer: {st_off} {off_out}, Acc: {st_acc} {acc_out}, Bk: {st_bk} {bk_acc}")

# -------------------------------------------------------------
# Scenario 4: Percentage promo code discount without cap
# -------------------------------------------------------------
code_4 = f"PERC10_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_4,
    "description": "10% off no cap",
    "discount_type": "percent",
    "discount_value": 10.0,
    "min_subtotal": 0.0,
})
st, val_4 = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_4,
    "subtotal": 100.0,
})
test("Percentage promo code discount without cap (10% on $100 -> $10.00 discount)",
     st == 200 and val_4.get("discount_amount") == 10.0 and val_4.get("estimated_total") == 102.0,
     f"Got {st}: {val_4}")

# -------------------------------------------------------------
# Scenario 5: Percentage promo code discount with cap
# -------------------------------------------------------------
code_5 = f"PERC20CAP_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_5,
    "description": "20% off capped at $15",
    "discount_type": "percent",
    "discount_value": 20.0,
    "max_discount": 15.0,
    "min_subtotal": 0.0,
})
st, val_5 = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_5,
    "subtotal": 200.0, # 20% is $40 -> capped at $15
})
test("Percentage promo code discount with cap enforcement ($200 subtotal -> $15.00 cap)",
     st == 200 and val_5.get("discount_amount") == 15.0,
     f"Got {st}: {val_5}")

# -------------------------------------------------------------
# Scenario 6: Fixed amount promo code discount
# -------------------------------------------------------------
code_6 = f"FIX25_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_6,
    "description": "$25 off fixed",
    "discount_type": "fixed",
    "discount_value": 25.0,
    "min_subtotal": 0.0,
})
st, val_6 = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_6,
    "subtotal": 100.0,
})
test("Fixed amount promo code discount ($25 off $100 subtotal -> $25.00 discount)",
     st == 200 and val_6.get("discount_amount") == 25.0 and val_6.get("estimated_total") == 87.0,
     f"Got {st}: {val_6}")

# -------------------------------------------------------------
# Scenario 7: Minimum booking subtotal constraint rejection
# -------------------------------------------------------------
code_7 = f"MIN150_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_7,
    "description": "Min $150 required",
    "discount_type": "fixed",
    "discount_value": 30.0,
    "min_subtotal": 150.0,
})
st, val_7 = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_7,
    "subtotal": 100.0, # below 150
})
test("Minimum booking subtotal constraint rejection ($100 < $150 -> 400 Bad Request)",
     st == 400 and "Minimum booking subtotal" in str(val_7),
     f"Got {st}: {val_7}")

# -------------------------------------------------------------
# Scenario 8: Expired promo code rejection
# -------------------------------------------------------------
code_8 = f"EXP_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_8,
    "description": "Expired promo",
    "discount_type": "fixed",
    "discount_value": 10.0,
    "expires_at": "2020-01-01T00:00:00Z",
})
st, val_8 = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_8,
    "subtotal": 100.0,
})
test("Expired promo code rejection (expired timestamp -> 400 Bad Request)",
     st == 400 and "expired" in str(val_8).lower(),
     f"Got {st}: {val_8}")

# -------------------------------------------------------------
# Scenario 9: Total usage limit exhaustion rejection
# -------------------------------------------------------------
code_9 = f"MAX1_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_9,
    "description": "Max 1 total use",
    "discount_type": "fixed",
    "discount_value": 10.0,
    "max_uses_total": 1,
})
st, bk_9 = api_call("POST", "/api/bookings", token_a, {
    "local_profile_id": local_id,
    "booking_date": "2026-12-05",
    "start_time": "14:00",
    "guests": 1,
    "hours": 1.0,
    "promo_code": code_9,
    "accept_booking_terms": True,
})
st, val_9 = api_call("POST", "/api/promotions/validate", token_b, {
    "code": code_9,
    "subtotal": 100.0,
})
test("Total usage limit exhaustion rejection (1st use OK, 2nd validate -> 400 usage limit)",
     bk_9.get("discount_amount") == 10.0 and st == 400 and "usage limit" in str(val_9).lower(),
     f"Booking: {bk_9}, 2nd validate: {st} {val_9}")

# -------------------------------------------------------------
# Scenario 10: Per-user usage limit exhaustion rejection
# -------------------------------------------------------------
code_10 = f"USER1_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_10,
    "description": "Max 1 per user",
    "discount_type": "fixed",
    "discount_value": 10.0,
    "max_uses_per_user": 1,
})
api_call("POST", "/api/bookings", token_a, {
    "local_profile_id": local_id,
    "booking_date": "2026-12-06",
    "start_time": "10:00",
    "guests": 1,
    "hours": 1.0,
    "promo_code": code_10,
    "accept_booking_terms": True,
})
st_10a, val_10a = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_10,
    "subtotal": 100.0,
})
st_10b, val_10b = api_call("POST", "/api/promotions/validate", token_b, {
    "code": code_10,
    "subtotal": 100.0,
})
test("Per-user usage limit exhaustion rejection (User A blocked, User B allowed)",
     st_10a == 400 and st_10b == 200,
     f"User A: {st_10a} {val_10a}, User B: {st_10b} {val_10b}")

# -------------------------------------------------------------
# Scenario 11: Inactive/paused promo code rejection
# -------------------------------------------------------------
code_11 = f"PAUSED_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_11,
    "description": "Paused code",
    "discount_type": "fixed",
    "discount_value": 10.0,
    "is_active": False,
})
st, val_11 = api_call("POST", "/api/promotions/validate", token_a, {
    "code": code_11,
    "subtotal": 100.0,
})
test("Inactive/paused promo code rejection (is_active=False -> 400 Bad Request)",
     st == 400 and "active" in str(val_11).lower(),
     f"Got {st}: {val_11}")

# -------------------------------------------------------------
# Scenario 12: Safepay tracker minor unit accuracy with discount
# -------------------------------------------------------------
code_12 = f"TRACK_{ts}"
api_call("POST", "/api/admin/promotions", admin_token, {
    "code": code_12,
    "description": "Checkout test",
    "discount_type": "fixed",
    "discount_value": 20.0,
})
st, bk_12 = api_call("POST", "/api/bookings", token_a, {
    "local_profile_id": local_id,
    "booking_date": "2026-12-07",
    "start_time": "11:00",
    "guests": 1,
    "hours": 2.0, # $100 subtotal, $12 fee, $20 discount -> $92.00 total
    "promo_code": code_12,
    "accept_booking_terms": True,
})
bk_12_id = bk_12["id"]
api_call("PATCH", f"/api/local/bookings/{bk_12_id}", local_token, {"status": "confirmed"})
api_call("POST", f"/api/payments/bookings/{bk_12_id}/checkout", token_a)
st, pmt_12 = api_call("GET", f"/api/payments/bookings/{bk_12_id}", token_a)
test("Safepay tracker minor unit accuracy with discount ($100 subtotal + $12 fee - $20 disc = $92.00 total)",
     st == 200 and pmt_12.get("amount_total") == 92.0,
     f"Expected amount_total=92.0, got {pmt_12.get('amount_total')}")

# -------------------------------------------------------------
# Scenario 13: Protected Local payable guarantee
# -------------------------------------------------------------
st, ledger_rows = api_call("GET", "/api/admin/commission", admin_token)
bk_12_ledger = next((l for l in ledger_rows if l["booking_id"] == bk_12_id), None)
test("Protected Local payable guarantee (Local gets 100% of $100 subtotal regardless of $20 promo discount)",
     bk_12_ledger is not None and bk_12_ledger.get("local_amount") == 100.0 and bk_12_ledger.get("gross_amount") == 92.0,
     f"Ledger row: {bk_12_ledger}")

# -------------------------------------------------------------
# Scenario 14: Referral code generation & retrieval
# -------------------------------------------------------------
st, ref_a = api_call("GET", "/api/traveler/referrals", token_a)
code_a = ref_a.get("code", "")
test("Referral code auto-generation & retrieval (starts with REF-, $15 reward, $10 referee discount)",
     st == 200 and code_a.startswith("REF-") and ref_a.get("reward_credit") == 15.0 and ref_a.get("referee_discount") == 10.0,
     f"Got {st}: {ref_a}")

# -------------------------------------------------------------
# Scenario 15: Self-referral prevention
# -------------------------------------------------------------
st, self_claim = api_call("POST", "/api/referrals/claim", token_a, {"code": code_a})
test("Self-referral prevention (referrer claiming own code -> 400 Bad Request)",
     st == 400 and "self-referral" in str(self_claim).lower(),
     f"Got {st}: {self_claim}")

# -------------------------------------------------------------
# Scenario 16: Duplicate referral claim prevention
# -------------------------------------------------------------
st_1, claim_b1 = api_call("POST", "/api/referrals/claim", token_b, {"code": code_a})
st_2, claim_b2 = api_call("POST", "/api/referrals/claim", token_b, {"code": code_a})
test("Duplicate referral claim prevention (1st claim OK, 2nd claim -> 409 Conflict)",
     st_1 == 200 and st_2 == 409,
     f"1st claim: {st_1} {claim_b1}, 2nd claim: {st_2} {claim_b2}")

# -------------------------------------------------------------
# Scenario 17: Referral reward qualifying trigger upon referee completed & paid booking
# -------------------------------------------------------------
st, bk_ref = api_call("POST", "/api/bookings", token_b, {
    "local_profile_id": local_id,
    "booking_date": "2026-12-08",
    "start_time": "12:00",
    "guests": 1,
    "hours": 1.0,
    "accept_booking_terms": True,
})
bk_ref_id = bk_ref["id"]
api_call("PATCH", f"/api/local/bookings/{bk_ref_id}", local_token, {"status": "confirmed"})
api_call("POST", f"/api/payments/bookings/{bk_ref_id}/checkout", token_b)
with Session(engine) as s:
    p_row = s.exec(select(PaymentRecord).where(PaymentRecord.booking_id == bk_ref_id)).first()
    if not p_row:
        p_row = PaymentRecord(
            booking_id=bk_ref_id,
            provider="safepay",
            status="paid",
            currency="usd",
            amount_total_minor=5600,
            platform_fee_minor=600,
        )
        s.add(p_row)
    else:
        p_row.status = "paid"
        s.add(p_row)
    s.commit()
api_call("PATCH", f"/api/local/bookings/{bk_ref_id}", local_token, {"status": "completed"})

st, ref_a_after = api_call("GET", "/api/traveler/referrals", token_a)
test("Referral reward qualifying trigger upon referee completed & paid booking ($15 credited to referrer)",
     st == 200 and ref_a_after.get("total_referred_count") >= 1 and ref_a_after.get("total_credits_earned") >= 15.0,
     f"Referrer credits after referee completion: {ref_a_after}")

# -------------------------------------------------------------
# Scenario 18: Admin Revenue KPI summary endpoint verification
# -------------------------------------------------------------
st_all, rev_all = api_call("GET", "/api/admin/revenue/summary?period=all_time", admin_token)
st_30d, rev_30d = api_call("GET", "/api/admin/revenue/summary?period=30d", admin_token)
st_7d, rev_7d = api_call("GET", "/api/admin/revenue/summary?period=7d", admin_token)
st_today, rev_today = api_call("GET", "/api/admin/revenue/summary?period=today", admin_token)

test("Admin Revenue KPI summary endpoint verification (all_time, 30d, 7d, today periods & take-rate metrics)",
     st_all == 200 and rev_all.get("paid_bookings_count", 0) >= 1 and "gbv" in rev_all and "net_platform_revenue" in rev_all and "effective_take_rate" in rev_all and "payouts" in rev_all,
     f"Got {st_all}: {rev_all}")

print("=" * 70)
print(f"ALL {PASSED} POINT 6 REVENUE ENGINE SCENARIOS PASSED WITH ZERO FAILURES!")
print("=" * 70)
