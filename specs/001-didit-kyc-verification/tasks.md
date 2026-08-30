# Tasks: SPEC-01 — Didit KYC & Local Partner Identity Verification

**Specification**: [specs/001-didit-kyc-verification/spec.md](spec.md)  
**Implementation Plan**: [specs/001-didit-kyc-verification/plan.md](plan.md)  
**Branch**: `master` (Anchored at baseline `87277c1`)  
**Status**: Ready for Implementation (Awaiting Explicit Approval)  

---

## Task Summary Table

| Task ID | Task Group | Target File / Area | Dependency | Description |
|---|---|---|---|---|
| **T001** | Prep & Audit Baseline | `backend/app/didit_kyc.py` | None | Verify `audit_event` helper availability and import structure. |
| **T002** | Didit Approval Audit | `backend/app/didit_kyc.py` | T001 | Emit `AuditLog` row on automated Didit `approved` decision. |
| **T003** | Profile Country Change Audit | `backend/app/main.py` | T001 | Preserve `verified=True` and log audit event when country changes. |
| **T004** | Backend Verification Tests | `backend/scripts/test_spec01_kyc.py` | T002, T003 | Create automated test suite for all 11 backend KYC scenarios. |
| **T005** | Provider Sandbox Check | Didit Console / `backend/.env` | None | Verify Didit Sandbox workspace pairing, age rule ($\ge 18$), and non-mandatory passport. |
| **T006** | End-to-End Sandbox Verification | Frontend & Backend Integration | T002, T003, T005 | Execute full user journey: Profile -> Consent -> Didit Hosted -> Return Callback -> Verified Badge. |
| **T007** | Final SPEC-01 QA Review | Full Repository | T004, T006 | Run syntax/typecheck, verify clean working tree, and confirm zero secret leaks. |

---

## Detailed Task Breakdown

### Group 1 — Didit Approval Audit

#### T001: Inspect & Verify Audit Helper Integration Points
- **File**: `backend/app/didit_kyc.py` & `backend/app/main.py`
- **Area**: Imports and helper functions
- **Dependency**: None
- **Description**: Verify the `audit_event` helper function in `backend/app/main.py` and ensure `didit_kyc.py` can cleanly record audit events using existing `AuditLog` model infrastructure without introducing duplicate logging systems or circular imports.
- **Acceptance Criteria**:
  - Shared audit logging mechanism identified and verified.
  - Zero schema or database modifications introduced.
- **Verification Method**: Python import and syntax compilation check (`py -3.14 -m py_compile backend/app/didit_kyc.py`).

#### T002: Implement Automated Didit Approval AuditLog Recording
- **File**: `backend/app/didit_kyc.py`
- **Area**: Function `didit_verification_status` (`GET /api/local/kyc/didit/status`)
- **Dependency**: T001
- **Description**: When Didit decision status is `approved` and `profile.verified` transitions to `True`, record an audit entry:
  - **Action**: `"local.didit_verification_approved"`
  - **Entity Type**: `"local_profile"`
  - **Entity ID**: `profile.id`
  - **Summary**: `f"Didit automated identity verification approved (Session: {clean_session_id})"`
  - **Actor**: `user.id`
- **Expected Behavior**:
  - `profile.verified` is set to `True`.
  - Exactly one `AuditLog` entry is committed.
  - Subsequent repeated `GET /status` calls with the same approved session are idempotent and do not duplicate audit records.
  - Existing manual approvals remain intact and are never revoked by a subsequent failed Didit check.
- **Acceptance Criteria**:
  - `AuditLog` table contains row with action `"local.didit_verification_approved"`.
  - Re-polling `/status` returns `{ ok: True, verified: True, status: 'approved' }` without creating duplicate audit rows.
- **Verification Method**: Execute automated test scenario validating single audit row creation on initial approval and zero additions on repeated polling.

---

### Group 2 — Verified Local Country Change Audit

#### T003: Implement Verified Local Profile Edit Policy and Country Change Audit
- **File**: `backend/app/main.py`
- **Area**: Function `update_local_profile` (`PATCH /api/local/profile`)
- **Dependency**: T001
- **Description**: Update the Local profile PATCH endpoint to adhere to the approved profile edit policy:
  - Routine edits (`display_name`, `city_name`, `headline`, `bio`, `languages`, `hourly_rate`, `response_time`) preserve `profile.verified` without revoking verification or requiring re-verification.
  - If `profile.verified == True` and the submitted `country_code` differs from the current `profile.country_code`:
    - Update `profile.country_code = new_country`.
    - Preserve `profile.verified = True`.
    - Emit an audit entry via `audit_event()` with action `"local.profile_country_changed"`:
      - **Summary**: `f"Verified Local changed country from {old_country} to {new_country}"`
- **Expected Behavior**:
  - Verified status is preserved across all valid profile updates.
  - Changing country triggers an audit log entry for admin visibility.
  - Unverified locals updating their country update normally without an audit event.
- **Acceptance Criteria**:
  - Verified local changes bio/rate → `profile.verified == True`, no audit log.
  - Verified local changes country → `profile.verified == True`, `AuditLog` contains `"local.profile_country_changed"`.
- **Verification Method**: Execute automated test scenario submitting PATCH requests for routine edits vs. country changes on verified and unverified profiles.

---

### Group 3 — Automated Backend Regression Test Suite

#### T004: Implement Backend Regression Test Suite for SPEC-01 KYC
- **File**: `backend/scripts/test_spec01_kyc.py`
- **Area**: Test automation script
- **Dependency**: T002, T003
- **Description**: Create an automated test runner validating all 11 required backend KYC and verification scenarios against an isolated test session:
  1. **Scenario 1**: Missing user consent returns HTTP 400.
  2. **Scenario 2**: Already verified Local calling `/start` returns `{ ok: True, already_verified: True }` without creating new session.
  3. **Scenario 3**: Didit `Approved` result marks `LocalProfile.verified = True` and logs audit entry.
  4. **Scenario 4**: Repeated polling of approved Didit session is idempotent and does not create duplicate audit entries.
  5. **Scenario 5**: User A attempting to query User B's `session_id` is rejected with HTTP 403.
  6. **Scenario 6**: Mismatched `vendor_data` from provider is rejected with HTTP 403.
  7. **Scenario 7**: Manual admin verification (`UploadRecord` approved) marks `LocalProfile.verified = True`.
  8. **Scenario 8**: Manually verified Local who later receives a Didit `Declined` status preserves `profile.verified == True`.
  9. **Scenario 9**: Manually verified Local who later receives a Didit `Expired` status preserves `profile.verified == True`.
  10. **Scenario 10**: Verified Local updating `country_code` preserves `profile.verified = True` and creates `"local.profile_country_changed"` audit log.
  11. **Scenario 11**: Verified Local updating ordinary profile data (`headline`, `bio`, `rate`) preserves `profile.verified = True` without audit event.
- **Acceptance Criteria**:
  - 100% of 11 test scenarios pass with exit code 0.
- **Verification Method**: Run `py -3.14 backend/scripts/test_spec01_kyc.py`.

---

### Group 4 — Provider Sandbox Configuration & End-to-End Testing

#### T005: Didit Console Sandbox Configuration Checklist
- **Area**: Provider Configuration (Didit Console & `backend/.env`)
- **Dependency**: None (Manual verification item)
- **Description**: Confirm and document the provider setup in the Didit Developer Console to resolve the known 403 provider error:
  - [ ] API Key and Workflow ID belong to the **same application/workspace** in Didit Sandbox.
  - [ ] Target countries enabled: **United Kingdom (GB)** and **United States (US)**.
  - [ ] Passport requirement: **NOT mandatory** (accepts National ID, Driving License, Residence Permit, Passport).
  - [ ] Workflow steps active: **ID Verification + Passive Liveness + Face Match + Device/IP Analysis**.
  - [ ] Age check configured: **Minimum age 18** (under-18 action: **Decline**).
  - [ ] Matching keys configured in `backend/.env` (`DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`).
- **Acceptance Criteria**:
  - `POST /api/local/kyc/didit/start` returns a valid hosted verification URL without 403 permission errors.
- **Verification Method**: Live preflight probe calling `/start` with test local account.

#### T006: Execute End-to-End Sandbox Verification Flow
- **Area**: Integration (Frontend + Backend + Didit Sandbox)
- **Dependency**: T002, T003, T005
- **Description**: Perform full end-to-end verification walkthrough:
  1. Log into `/local-dashboard/profile` as unverified Local.
  2. Confirm `DiditKycCard` displays consent checkbox and instructions.
  3. Click "Verify identity" → Redirect to Didit hosted portal.
  4. Complete sandbox verification flow.
  5. Redirect back to `/kyc/return?verificationSessionId={id}`.
  6. Verify `/kyc/return` confirms status and links back to profile.
  7. Confirm `/local-dashboard/profile` now displays green "Identity verified" badge.
  8. Confirm `/admin/locals` shows the Local as "Verified" and allows public profile preview.
- **Acceptance Criteria**:
  - Complete round-trip journey succeeds seamlessly on desktop and mobile viewports.
- **Verification Method**: Browser verification pass.

#### T007: Final SPEC-01 QA & Sanity Verification
- **Area**: Repository & Quality Assurance
- **Dependency**: T004, T006
- **Description**: Run full project sanity checks:
  - Run frontend TypeScript verification (`npm run typecheck`).
  - Run backend syntax compilation across all modified files.
  - Confirm `git status --short` touches only the 2 planned files.
  - Confirm zero credentials or secrets are staged or exposed.
- **Acceptance Criteria**:
  - TypeScript passes with 0 errors.
  - Backend compiles with 0 errors.
  - Clean working tree maintained.
- **Verification Method**: Run verification commands and inspect diffs.

---

## Out-of-Scope Confirmations for SPEC-01

- ❌ **NO** database schema migrations or new tables.
- ❌ **NO** modifications to `LocalProfile` table structure.
- ❌ **NO** Didit webhook listener implementation.
- ❌ **NO** frontend component or page redesigns.
- ❌ **NO** AML, NFC, or Proof of Address checks.
- ❌ **NO** modifications to payment or booking modules.
