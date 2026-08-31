#!/usr/bin/env python3
"""
Point 5 E2E Automated Verification Test Suite
Tests all 14 scenarios for Reviews & Trust System using urllib against 127.0.0.1:8000.
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
from app.models import User, LocalProfile, Booking, Review, ReviewModeration, ReviewReport, UploadRecord
from app.main import recalculate_local_rating
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
        with urllib.request.urlopen(req) as resp:
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

PASSED = 0
FAILED = 0

def test(name: str, condition: bool, details: str = ""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"[PASS] Scenario {PASSED + FAILED}: {name}")
    else:
        FAILED += 1
        print(f"[FAIL] Scenario {PASSED + FAILED}: {name} -- {details}")

print("==================================================")
print("RUNNING POINT 5 REVIEWS + TRUST E2E TEST SUITE")
print("==================================================")

# Setup Test Data in Session
with Session(engine) as session:
    ts = int(datetime.now(timezone.utc).timestamp())
    traveler_email = f"traveler_p5_{ts}@test.com"
    local_email = f"local_p5_{ts}@test.com"
    other_email = f"other_p5_{ts}@test.com"
    admin_email = f"admin_p5_{ts}@test.com"

    traveler = User(email=traveler_email, password_hash=hash_password("Pass123!"), full_name="Sarah Traveler", role="tourist", is_active=True, email_verified=True)
    local_user = User(email=local_email, password_hash=hash_password("Pass123!"), full_name="John Guide", role="local", is_active=True, email_verified=True)
    other_user = User(email=other_email, password_hash=hash_password("Pass123!"), full_name="Mike Visitor", role="tourist", is_active=True, email_verified=True)
    admin = User(email=admin_email, password_hash=hash_password("Pass123!"), full_name="Marketplace Admin", role="admin", is_active=True, email_verified=True)

    session.add(traveler)
    session.add(local_user)
    session.add(other_user)
    session.add(admin)
    session.commit()
    session.refresh(traveler)
    session.refresh(local_user)
    session.refresh(other_user)
    session.refresh(admin)

    local_slug = f"john-guide-{ts}"
    local_profile = LocalProfile(
        user_id=local_user.id,
        slug=local_slug,
        display_name="John Guide",
        city_slug="london",
        city_name="London",
        country_code="GB",
        headline="Experienced Historic London Guide",
        bio="Guiding in London for over 10 years.",
        verified=True,
        rating=0.0,
        review_count=0,
        hourly_rate=45.0,
    )
    session.add(local_profile)
    session.commit()
    session.refresh(local_profile)

    # Approve KYC for local via UploadRecord
    kyc_doc = UploadRecord(
        owner_user_id=local_user.id,
        kind="verification_document",
        status="approved",
        original_name="passport.jpg",
        stored_path="uploads/passport.jpg",
        mime_type="image/jpeg",
        size_bytes=2048,
    )
    session.add(kyc_doc)
    session.commit()

    # Create completed booking for traveler
    booking_completed = Booking(
        tourist_user_id=traveler.id,
        local_profile_id=local_profile.id,
        booking_date="2026-09-15",
        start_time="10:00",
        hours=3.0,
        guests=2,
        subtotal=135.0,
        platform_fee=16.2,
        status="completed",
    )
    # Create pending booking for traveler
    booking_pending = Booking(
        tourist_user_id=traveler.id,
        local_profile_id=local_profile.id,
        booking_date="2026-09-20",
        start_time="14:00",
        hours=2.0,
        guests=1,
        subtotal=90.0,
        platform_fee=10.8,
        status="pending",
    )
    # Create completed booking for other traveler
    booking_other_completed = Booking(
        tourist_user_id=other_user.id,
        local_profile_id=local_profile.id,
        booking_date="2026-09-10",
        start_time="11:00",
        hours=2.0,
        guests=2,
        subtotal=90.0,
        platform_fee=10.8,
        status="completed",
    )
    session.add(booking_completed)
    session.add(booking_pending)
    session.add(booking_other_completed)
    session.commit()
    session.refresh(booking_completed)
    session.refresh(booking_pending)
    session.refresh(booking_other_completed)

    local_profile_id = local_profile.id
    traveler_token = create_access_token(traveler)
    local_token = create_access_token(local_user)
    other_token = create_access_token(other_user)
    admin_token = create_access_token(admin)

# SCENARIO 1: Valid review submission on completed booking
resp1 = api_call(
    "POST",
    "/api/traveler/reviews",
    token=traveler_token,
    body={"booking_id": booking_completed.id, "rating": 5, "title": "Incredible tour!", "comment": "John showed us hidden gems around London. Highly recommended!"}
)
s1, r1 = resp1
test("Valid paid completed review submitted", s1 == 200 and r1.get("ok") is True, f"Status: {s1}, Body: {r1}")
review_id_1 = r1.get("id") if s1 == 200 else None

# SCENARIO 2: Incomplete booking review rejected
s2, r2 = api_call(
    "POST",
    "/api/traveler/reviews",
    token=traveler_token,
    body={"booking_id": booking_pending.id, "rating": 5, "title": "Premature review", "comment": "Has not happened yet."}
)
test("Incomplete booking review rejected with HTTP 400", s2 == 400, f"Status: {s2}")

# SCENARIO 3: Non-owner cannot review booking
s3, r3 = api_call(
    "POST",
    "/api/traveler/reviews",
    token=other_token,
    body={"booking_id": booking_completed.id, "rating": 4, "title": "Not my booking", "comment": "Should fail"}
)
test("Non-owner review rejected with HTTP 404", s3 == 404, f"Status: {s3}")

# SCENARIO 4: Duplicate review on same booking rejected
s4, r4 = api_call(
    "POST",
    "/api/traveler/reviews",
    token=traveler_token,
    body={"booking_id": booking_completed.id, "rating": 5, "title": "Duplicate attempt", "comment": "Should fail"}
)
test("Duplicate review rejected with HTTP 409", s4 == 409, f"Status: {s4}")

# Submit a second review from other traveler (4 stars)
s_other, r_other = api_call(
    "POST",
    "/api/traveler/reviews",
    token=other_token,
    body={"booking_id": booking_other_completed.id, "rating": 4, "title": "Great walk", "comment": "Very knowledgeable guide."}
)
review_id_2 = r_other.get("id")

# SCENARIO 5: Centralized rating recalculation
with Session(engine) as session:
    stats = recalculate_local_rating(session, local_profile_id)
    test("Centralized rating calculation accuracy", stats["rating"] == 4.5 and stats["review_count"] == 2, f"Stats: {stats}")

# SCENARIO 6: 5-to-1 rating distribution accuracy
test("Rating distribution histogram accuracy", stats["distribution"].get(5) == 1 and stats["distribution"].get(4) == 1 and stats["distribution"].get(3) == 0, f"Dist: {stats['distribution']}")

# SCENARIO 7: Public profile returns verified_booking and rating_breakdown
s7, r7 = api_call("GET", f"/api/locals/{local_slug}")
test("Public profile includes verified tags and breakdown", s7 == 200 and len(r7.get("reviews", [])) == 2 and r7["reviews"][0].get("verified_booking") is True and "rating_breakdown" in r7, f"Status: {s7}")

# SCENARIO 8: Privacy-safe traveler name formatting
traveler_name = r7.get("reviews", [{}])[0].get("traveler_name", "")
test("Privacy-safe traveler attribution (First + Last Initial)", traveler_name.endswith("."), f"Name: {traveler_name}")

# SCENARIO 9: Admin hides review -> rating recalculated & excluded from profile
s9, r9 = api_call(
    "PATCH",
    f"/api/admin/reviews/{review_id_1}/moderation",
    token=admin_token,
    body={"status": "hidden"}
)
s9_pub, r9_pub = api_call("GET", f"/api/locals/{local_slug}")
test(
    "Admin hides review -> rating recalculated & excluded from public profile",
    s9 == 200 and r9.get("local_rating") == 4.0 and r9.get("local_review_count") == 1 and len(r9_pub.get("reviews", [])) == 1 and r9_pub["profile"]["rating"] == 4.0,
    f"Status: {s9}, Rating: {r9.get('local_rating')}, PubReviews: {len(r9_pub.get('reviews', []))}"
)

# SCENARIO 10: Admin restores review to visible -> rating recalculated back up
s10, r10 = api_call(
    "PATCH",
    f"/api/admin/reviews/{review_id_1}/moderation",
    token=admin_token,
    body={"status": "visible"}
)
test("Admin restores review to visible and updates rating", s10 == 200 and r10.get("local_rating") == 4.5 and r10.get("local_review_count") == 2, f"Status: {s10}")

# SCENARIO 11: Local Reviews Hub API
s11, r11 = api_call("GET", "/api/local/reviews", token=local_token)
test("Local Reviews Hub API returns feedback and KPIs", s11 == 200 and len(r11.get("reviews", [])) == 2 and r11.get("completed_count") == 2 and r11.get("five_star_percentage") == 50, f"Status: {s11}, Data: {r11}")

# SCENARIO 12: Unauthorized non-local access to /api/local/reviews blocked
s12, r12 = api_call("GET", "/api/local/reviews", token=traveler_token)
test("Unauthorized non-local blocked from /api/local/reviews", s12 == 403, f"Status: {s12}")

# SCENARIO 13: Review reporting flow
s13, r13 = api_call(
    "POST",
    f"/api/reviews/{review_id_2}/report",
    token=local_token,
    body={"reason": "harassment", "details": "Review contains inaccurate personal dispute."}
)
test("Review reporting flow creates pending report", s13 == 200 and r13.get("ok") is True and r13.get("status") == "pending", f"Status: {s13}, Body: {r13}")

# SCENARIO 14: Duplicate report by same user blocked
s14, r14 = api_call(
    "POST",
    f"/api/reviews/{review_id_2}/report",
    token=local_token,
    body={"reason": "spam", "details": "Duplicate report attempt"}
)
test("Duplicate report rejected with HTTP 409", s14 == 409, f"Status: {s14}")

print("==================================================")
print(f"POINT 5 TEST SUMMARY: {PASSED} PASSED, {FAILED} FAILED (TOTAL {PASSED + FAILED}/14)")
print("==================================================")

if FAILED > 0:
    sys.exit(1)
sys.exit(0)
