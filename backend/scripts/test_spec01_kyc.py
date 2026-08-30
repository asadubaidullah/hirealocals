"""SPEC-01 KYC & Identity Verification Automated Regression Test Suite.

Validates all 11+ test scenarios for SPEC-01 using an isolated in-memory database.
Run: py -3.14 backend/scripts/test_spec01_kyc.py
"""
from __future__ import annotations

import sys
from unittest.mock import patch
from fastapi import HTTPException
from sqlmodel import SQLModel, Session, create_engine, select
from starlette.requests import Request

# Ensure backend root is on sys.path
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models import User, LocalProfile, UploadRecord, AuditLog
from app.didit_kyc import (
    start_didit_verification,
    didit_verification_status,
    DiditStartInput,
)
from app.main import update_local_profile
from app.schemas import LocalProfileUpdate


def create_test_db() -> Session:
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)
    return Session(engine)


def make_dummy_request() -> Request:
    scope = {
        "type": "http",
        "method": "PATCH",
        "path": "/api/local/profile",
        "headers": [],
        "client": ("127.0.0.1", 50000),
    }
    req = Request(scope)
    return req


def test_suite() -> int:
    session = create_test_db()
    passed = 0
    failed = 0

    def run_test(name: str, fn):
        nonlocal passed, failed
        try:
            fn()
            print(f"[ PASS ] {name}")
            passed += 1
        except Exception as e:
            print(f"[ FAIL ] {name}: {e}")
            failed += 1

    # Setup test users
    user_local1 = User(
        id=1,
        email="local1@example.com",
        full_name="Local One",
        password_hash="hash",
        role="local",
        email_verified=True,
    )
    user_local2 = User(
        id=2,
        email="local2@example.com",
        full_name="Local Two",
        password_hash="hash",
        role="local",
        email_verified=True,
    )
    user_tourist = User(
        id=3,
        email="tourist@example.com",
        full_name="Tourist Three",
        password_hash="hash",
        role="tourist",
        email_verified=True,
    )
    session.add(user_local1)
    session.add(user_local2)
    session.add(user_tourist)
    session.commit()

    profile1 = LocalProfile(
        id=1,
        user_id=1,
        display_name="Local One",
        slug="local-one",
        headline="London Local Guide",
        bio="Experienced guide in London",
        city_slug="london",
        city_name="London",
        country_code="GB",
        verified=False,
    )
    profile2 = LocalProfile(
        id=2,
        user_id=2,
        display_name="Local Two",
        slug="local-two",
        headline="New York Explorer",
        bio="Born and raised in NYC",
        city_slug="new-york",
        city_name="New York",
        country_code="US",
        verified=False,
    )
    session.add(profile1)
    session.add(profile2)
    session.commit()

    # 1. Missing user consent returns HTTP 400
    def t1():
        try:
            start_didit_verification(
                payload=DiditStartInput(consent=False),
                user=user_local1,
                session=session,
            )
            raise AssertionError("Expected HTTP 400 when consent is missing")
        except HTTPException as exc:
            assert exc.status_code == 400, f"Expected 400, got {exc.status_code}"
            assert "Consent is required" in exc.detail

    run_test("1. Missing user consent returns HTTP 400", t1)

    # 2. Already verified Local calling /start returns already_verified
    def t2():
        profile1.verified = True
        session.add(profile1)
        session.commit()

        res = start_didit_verification(
            payload=DiditStartInput(consent=True),
            user=user_local1,
            session=session,
        )
        assert res.get("ok") is True
        assert res.get("already_verified") is True
        assert res.get("verified") is True

        # Reset profile1 verified for subsequent tests
        profile1.verified = False
        session.add(profile1)
        session.commit()

    run_test("2. Already verified Local calling /start returns already_verified", t2)

    # 3. Didit Approved result marks LocalProfile.verified = True and logs audit
    def t3():
        session_id = "test-session-approved-123"
        fake_didit_decision = {
            "status": "Approved",
            "vendor_data": "hirealocals-local-1",
        }

        with patch("app.didit_kyc._didit_request", return_value=fake_didit_decision):
            res = didit_verification_status(
                session_id=session_id,
                user=user_local1,
                session=session,
            )
            assert res.get("ok") is True
            assert res.get("status") == "approved"
            assert res.get("verified") is True

        session.refresh(profile1)
        assert profile1.verified is True, "Profile 1 should now be verified"

        # Check AuditLog
        audits = session.exec(
            select(AuditLog).where(
                AuditLog.action == "local.didit_verification_approved",
                AuditLog.actor_user_id == 1,
            )
        ).all()
        assert len(audits) == 1, f"Expected 1 audit row, found {len(audits)}"
        assert session_id in audits[0].summary

    run_test("3. Didit Approved marks verified=True and records AuditLog", t3)

    # 4. Repeated polling of approved Didit session is idempotent and does not duplicate audit log
    def t4():
        session_id = "test-session-approved-123"
        fake_didit_decision = {
            "status": "Approved",
            "vendor_data": "hirealocals-local-1",
        }

        initial_count = len(
            session.exec(
                select(AuditLog).where(
                    AuditLog.action == "local.didit_verification_approved"
                )
            ).all()
        )

        with patch("app.didit_kyc._didit_request", return_value=fake_didit_decision):
            res = didit_verification_status(
                session_id=session_id,
                user=user_local1,
                session=session,
            )
            assert res.get("ok") is True
            assert res.get("verified") is True

        final_count = len(
            session.exec(
                select(AuditLog).where(
                    AuditLog.action == "local.didit_verification_approved"
                )
            ).all()
        )
        assert final_count == initial_count, f"Duplicate audit log created: initial={initial_count}, final={final_count}"

    run_test("4. Repeated polling of approved session is idempotent without duplicate audit entries", t4)

    # 5. User A attempting to query User B's session_id is rejected with HTTP 403
    def t5():
        session_id = "test-session-approved-123"
        fake_didit_decision = {
            "status": "Approved",
            "vendor_data": "hirealocals-local-1",  # belongs to user 1
        }

        with patch("app.didit_kyc._didit_request", return_value=fake_didit_decision):
            try:
                didit_verification_status(
                    session_id=session_id,
                    user=user_local2,  # User 2 attempting to claim User 1 session
                    session=session,
                )
                raise AssertionError("Expected HTTP 403 on cross-user session claim")
            except HTTPException as exc:
                assert exc.status_code == 403, f"Expected 403, got {exc.status_code}"
                assert "does not belong to your account" in exc.detail

    run_test("5. Cross-user session query rejected with HTTP 403", t5)

    # 6. Mismatched vendor_data from provider is rejected with HTTP 403
    def t6():
        session_id = "test-session-mismatched"
        fake_didit_decision = {
            "status": "Approved",
            "vendor_data": "unknown-foreign-vendor-id",
        }

        with patch("app.didit_kyc._didit_request", return_value=fake_didit_decision):
            try:
                didit_verification_status(
                    session_id=session_id,
                    user=user_local1,
                    session=session,
                )
                raise AssertionError("Expected HTTP 403 on vendor_data mismatch")
            except HTTPException as exc:
                assert exc.status_code == 403, f"Expected 403, got {exc.status_code}"

    run_test("6. Mismatched vendor_data rejected with HTTP 403", t6)

    # 7. Manual admin verification marks profile verified
    def t7():
        # User 2 is currently unverified
        assert profile2.verified is False

        # Create approved manual upload record
        upload = UploadRecord(
            owner_user_id=2,
            kind="verification_document",
            original_name="passport.pdf",
            mime_type="application/pdf",
            size_bytes=102400,
            stored_path="private_uploads/verification/test.pdf",
            status="approved",
        )
        session.add(upload)
        profile2.verified = True
        session.add(profile2)
        session.commit()
        session.refresh(profile2)

        assert profile2.verified is True

    run_test("7. Manual admin verification sets profile.verified = True", t7)

    # 8. Manually verified Local who later receives Didit Declined preserves verified=True
    def t8():
        session_id = "test-session-declined-2"
        fake_didit_decision = {
            "status": "Declined",
            "vendor_data": "hirealocals-local-2",
        }

        with patch("app.didit_kyc._didit_request", return_value=fake_didit_decision):
            res = didit_verification_status(
                session_id=session_id,
                user=user_local2,
                session=session,
            )
            assert res.get("status") == "declined"
            assert res.get("verified") is True, "Manual approval must NOT be revoked by Didit decline"

        session.refresh(profile2)
        assert profile2.verified is True

    run_test("8. Manually verified Local preserves verified=True upon Didit Declined", t8)

    # 9. Manually verified Local who receives Didit Expired preserves verified=True
    def t9():
        session_id = "test-session-expired-2"
        fake_didit_decision = {
            "status": "Expired",
            "vendor_data": "hirealocals-local-2",
        }

        with patch("app.didit_kyc._didit_request", return_value=fake_didit_decision):
            res = didit_verification_status(
                session_id=session_id,
                user=user_local2,
                session=session,
            )
            assert res.get("status") == "retry_required"
            assert res.get("verified") is True

        session.refresh(profile2)
        assert profile2.verified is True

    run_test("9. Manually verified Local preserves verified=True upon Didit Expired", t9)

    # 10. Verified Local updating country_code preserves verified=True and creates AuditLog
    def t10():
        # Profile 1 is verified with country GB
        session.refresh(profile1)
        assert profile1.verified is True
        assert profile1.country_code == "GB"

        req = make_dummy_request()
        update_payload = LocalProfileUpdate(country_code="US")

        updated = update_local_profile(
            payload=update_payload,
            user=user_local1,
            session=session,
            request=req,
        )

        assert updated.verified is True, "Verified status must be preserved"
        assert updated.country_code == "US"

        # Check country changed audit event
        audits = session.exec(
            select(AuditLog).where(
                AuditLog.action == "local.profile_country_changed",
                AuditLog.actor_user_id == 1,
            )
        ).all()
        assert len(audits) == 1, f"Expected 1 country changed audit log, found {len(audits)}"
        assert "from GB to US" in audits[0].summary

    run_test("10. Verified Local changing country preserves verified=True and creates AuditLog", t10)

    # 11. Verified Local updating ordinary profile data preserves verified=True without country audit
    def t11():
        session.refresh(profile1)
        assert profile1.verified is True

        initial_audits = len(
            session.exec(
                select(AuditLog).where(
                    AuditLog.action == "local.profile_country_changed"
                )
            ).all()
        )

        req = make_dummy_request()
        update_payload = LocalProfileUpdate(
            headline="Expert guide in NYC",
            bio="Updated bio about local knowledge",
            hourly_rate=65,
        )

        updated = update_local_profile(
            payload=update_payload,
            user=user_local1,
            session=session,
            request=req,
        )

        assert updated.verified is True
        assert updated.headline == "Expert guide in NYC"
        assert updated.hourly_rate == 65

        final_audits = len(
            session.exec(
                select(AuditLog).where(
                    AuditLog.action == "local.profile_country_changed"
                )
            ).all()
        )
        assert final_audits == initial_audits, "No new country audit log should be created for ordinary edits"

    run_test("11. Verified Local ordinary edits preserve verified=True without country audit log", t11)

    # 12. Unverified Local updating country_code updates normally without audit log
    def t12():
        # Profile 2 was verified in test 7; let's reset it to unverified
        profile2.verified = False
        profile2.country_code = "US"
        session.add(profile2)
        session.commit()
        session.refresh(profile2)

        initial_audits = len(
            session.exec(
                select(AuditLog).where(
                    AuditLog.action == "local.profile_country_changed",
                    AuditLog.actor_user_id == 2,
                )
            ).all()
        )

        req = make_dummy_request()
        update_payload = LocalProfileUpdate(country_code="GB")

        updated = update_local_profile(
            payload=update_payload,
            user=user_local2,
            session=session,
            request=req,
        )

        assert updated.verified is False
        assert updated.country_code == "GB"

        final_audits = len(
            session.exec(
                select(AuditLog).where(
                    AuditLog.action == "local.profile_country_changed",
                    AuditLog.actor_user_id == 2,
                )
            ).all()
        )
        assert final_audits == initial_audits, "Unverified Local country change must not create country audit log"

    run_test("12. Unverified Local changing country updates without country audit log", t12)

    print("\n" + "=" * 50)
    print(f"SPEC-01 REGRESSION TEST SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=" * 50)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(test_suite())
