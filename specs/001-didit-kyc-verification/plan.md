# Implementation Plan: SPEC-01 — Didit KYC & Local Partner Identity Verification

**Feature ID**: `SPEC-01`  
**Specification**: [specs/001-didit-kyc-verification/spec.md](spec.md)  
**Branch**: `master` (Anchored at clean baseline `87277c1`)  
**Status**: Plan Draft  
**Target Marketplace**: United Kingdom (GB), United States (US)  

---

## 1. Executive Summary

This plan details the surgical, low-friction identity verification implementation for HireALocals Local Partners using Didit hosted verification and an existing administrative manual fallback.

Because HireALocals is an existing brownfield project with extensive operational code, this plan adheres strictly to the rule of **zero rewrites of working features**. Over 85% of the verification infrastructure is already built and functional in the codebase. The implementation scope is confined to:
1. Auditing automated Didit approvals into `AuditLog`.
2. Emitting an audit log entry when a verified Local updates their registered country in `PATCH /api/local/profile` (while preserving verified status).
3. Verifying Didit Sandbox credentials in `backend/.env` to resolve the current 403 provider error.
4. Ensuring clean frontend status transitions and error handling without duplicate session creation.

---

## 2. Technical Context

- **Backend Stack**: FastAPI (`0.128+`), Python 3.14, SQLModel / SQLAlchemy (`2.0+`), Pydantic Settings (`2.7+`), standard library `urllib`.
- **Frontend Stack**: Next.js (`16.3.0`), React (`19.2.0`), TypeScript (`5.7.0`), Vanilla CSS design system.
- **Database**: SQLite (`sqlite:///./hirealocals.db`) for local Laragon development; PostgreSQL for production.
- **Identity Provider**: Didit Hosted Verification (`https://verification.didit.me`).
- **Target Flow**: Synchronous return-page polling (`/kyc/return` -> `/api/local/kyc/didit/status`).

---

## 3. Inventory & Delta Analysis

### A. Already Implemented & Reusable (Zero Code Changes Needed)
1. **Didit Session Creation Endpoint** (`POST /api/local/kyc/didit/start`):
   - Authenticates local account via `current_user` dependency.
   - Enforces user consent validation.
   - Sets vendor identifier `hirealocals-local-{user.id}`.
   - Generates callback URL (`{frontend_url}/kyc/return`).
   - Configures `callback_method` (`initiator` for local dev; `both` for production).
   - Omits `expected_document_types` so passport is not mandatory.
2. **Didit Status Endpoint** (`GET /api/local/kyc/didit/status`):
   - Queries `GET /v3/session/{session_id}/decision/` server-to-server.
   - Validates `vendor_data` ownership to eliminate session hijacking.
   - Maps Didit states (`Approved`, `In Review`, `Declined`, `Expired`, `Abandoned`, `Not Started`).
   - Idempotently updates `LocalProfile.verified = True` on `Approved`.
   - Protects manually verified locals from accidental un-verification on failed retries.
3. **Manual Fallback & Storage**:
   - `POST /api/local/verification-document` saves private KYC uploads in `backend/private_uploads/verification/`.
   - `GET /api/admin/uploads/{id}/file` serves private documents exclusively to authenticated admins.
   - `PATCH /api/admin/uploads/{id}/status` approves/rejects documents and toggles `LocalProfile.verified`.
4. **Admin UI**:
   - `/admin/locals`: Real-time KPIs, verified badge display, direct link to KYC review, manual unverify toggle.
   - `/admin/uploads`: Dedicated KYC verification queue with document preview modal, file size, MIME type, approve and reject buttons.
5. **Frontend Partner UI**:
   - `DiditKycCard.tsx`: Consent checkbox, explanation copy, start verification CTA, status badges.
   - `/kyc/return/page.tsx`: Extracts `verificationSessionId`, validates with backend, displays status-specific cards and next actions.
   - `/local-dashboard/profile`: Integrates Didit card, manual upload fallback, and public profile preview link gating.

### B. Needs Minimal Modification (Surgical Edits Only)
1. **Automated Didit Audit Logging (`backend/app/didit_kyc.py`)**:
   - Call `audit_event()` when Didit status returns `approved` and toggles `profile.verified = True`.
   - Action: `local.didit_verification_approved`.
   - Entity: `local_profile` (ID: `profile.id`).
   - Summary: `"Didit automated identity verification approved (Session: {clean_session_id})"`
2. **Profile Country Change Audit (`backend/app/main.py`)**:
   - In `PATCH /api/local/profile`, if `profile.verified` is `True` and `country_code` changes, preserve `profile.verified = True` and emit an `audit_event()` with action `local.profile_country_changed`.

### C. Missing / None
- No new tables, routes, or frontend pages are required for SPEC-01 v1.

### D. Provider Configuration Only (Didit Console & `.env`)
1. Obtain matching **Sandbox API Key** and **Sandbox Workflow ID** from the Didit Console.
2. Update `DIDIT_API_KEY` and `DIDIT_WORKFLOW_ID` in `backend/.env`.
3. In Didit Console Workflow Builder, verify that:
   - Steps include: *ID Verification + Passive Liveness + Face Match + Device/IP Analysis*.
   - Age limit is $\ge 18$.
   - Supported documents for UK and US include: *National ID, Driver's License, Residence Permit, Passport*.

### E. Out-of-Scope / Future Enhancements
- Asynchronous webhook listener (`/api/local/kyc/didit/webhook`) (deferred to a future spec).
- Adding separate `verification_source` or `verified_at` columns to `LocalProfile` (deferred; current model is sufficient for v1).
- AML / PEP / Proof-of-Address checks (explicitly excluded for cost and friction reduction).

---

## 4. Architectural & Safety Verifications

```
+-----------------------------------------------------------------------------------+
|                              Local Partner Browser                                |
|  /local-dashboard/profile                                                         |
|    - DiditKycCard (Consent checked)                                               |
|    - Manual Upload fallback                                                       |
+-------------------------+-----------------------------------+---------------------+
                          | 1. POST /api/local/kyc/didit/start|
                          v                                   |
+-------------------------------------------------------------+---------------------+
|                             FastAPI Backend                                       |
|  1. Checks user.role == 'local' & consent == True                                 |
|  2. Calls Didit POST /v3/session/ with vendor_data="hirealocals-local-{user.id}"  |
|  3. Returns { session_id, url } to browser                                        |
+-------------------------+---------------------------------------------------------+
                          | 2. Redirect to Didit hosted URL
                          v
+-----------------------------------------------------------------------------------+
|                             Didit Hosted Portal                                   |
|  - Capture Government ID (Driver's License / ID Card / Passport)                  |
|  - Capture Passive Liveness Selfie                                                |
|  - Perform Face Matching + Device Risk Checks                                     |
|  - Determine Decision (Approved / In Review / Declined)                           |
+-------------------------+---------------------------------------------------------+
                          | 3. Browser returns to /kyc/return?verificationSessionId={id}
                          v
+-----------------------------------------------------------------------------------+
|                        Frontend Return Page (/kyc/return)                         |
|  - Calls backend GET /api/local/kyc/didit/status?session_id={id}                  |
+-------------------------+---------------------------------------------------------+
                          | 4. Server-to-server validation query
                          v
+-----------------------------------------------------------------------------------+
|                             FastAPI Backend                                       |
|  1. Queries Didit GET /v3/session/{id}/decision/                                  |
|  2. Enforces decision.vendor_data == "hirealocals-local-{current_user.id}"        |
|  3. If status == 'approved':                                                      |
|     - LocalProfile.verified = True                                                |
|     - AuditLog: action='local.didit_verification_approved'                        |
|  4. Returns { ok: True, status: 'approved', verified: True }                      |
+-----------------------------------------------------------------------------------+
```

---

## 5. Audit Logging Specifications

When an automated Didit decision is approved:
- **Actor User ID**: `user.id`
- **Action**: `"local.didit_verification_approved"`
- **Entity Type**: `"local_profile"`
- **Entity ID**: `profile.id`
- **Summary**: `f"Didit automated identity verification approved (Session: {clean_session_id})"`
- **Request Context**: Captures client IP hash and request ID.

When a verified Local updates their registered country:
- **Actor User ID**: `user.id`
- **Action**: `"local.profile_country_changed"`
- **Entity Type**: `"local_profile"`
- **Entity ID**: `profile.id`
- **Summary**: `f"Verified Local changed country from {old_country} to {new_country}"`

---

## 6. Profile Edit Policy Design

In `PATCH /api/local/profile`:
- **Routine Edits** (`bio`, `hourly_rate`, `languages`, `city_name`, `response_time`, `headline`):
  - Retain `profile.verified` without interruption.
- **Country Changes** (`country_code`):
  - If `profile.verified == True` and `new_country != old_country`:
    - Apply country update.
    - Preserve `profile.verified = True`.
    - Insert audit event in `AuditLog` so administrators have full visibility into post-verification geographic modifications.

---

## 7. Concrete Verification & Test Plan (18 Scenarios)

| # | Test Scenario | Expected Outcome |
|---|---|---|
| 1 | Unverified Local views profile | Didit KYC card displays "Required", points list, and consent checkbox. |
| 2 | Start without consent | Returns HTTP 400 with message requiring consent. |
| 3 | Start with valid consent | Returns HTTP 200 with Didit hosted URL and session ID. |
| 4 | User reaches Didit hosted portal | Browser loads Didit hosted UI with camera and ID upload options. |
| 5 | Return page receives session ID | `/kyc/return` extracts `verificationSessionId` and queries backend. |
| 6 | Approved decision | Mapped to `approved`, `LocalProfile.verified` set to `True`, AuditLog row created. |
| 7 | In Review decision | Mapped to `in_review`, `LocalProfile.verified` remains `False`, UI shows "under review". |
| 8 | Declined decision | Mapped to `declined`, `LocalProfile.verified` remains `False`, UI shows retry/manual options. |
| 9 | Expired / abandoned session | Mapped to `retry_required`, UI offers fresh session restart. |
| 10 | Retry after failure | User clicks "Verify identity" again; fresh session is generated without error. |
| 11 | Already verified user calls `/start` | Returns `{ ok: true, already_verified: true }` without creating redundant Didit session. |
| 12 | Manually verified user | Admin approved document in `/admin/uploads`; `LocalProfile.verified == True`. |
| 13 | Cross-user session query | User A attempts to validate User B's `session_id`; backend rejects with HTTP 403. |
| 14 | Vendor data mismatch | Didit session belongs to different account; backend terminates with HTTP 403. |
| 15 | Duplicate status polling | Re-polling an approved session is completely idempotent. |
| 16 | Country change on verified profile | Profile updates; `verified` remains `True`; `AuditLog` records country change event. |
| 17 | AuditLog record verification | `AuditLog` table contains row with action `local.didit_verification_approved`. |
| 18 | Admin visibility | `/admin/locals` displays "Verified" badge and enables public listing link. |

---

## 8. Deployment Boundaries & Provider Setup

- **Local / Sandbox**:
  - `backend/.env` configured with Didit Sandbox API Key and Workflow ID.
  - `FRONTEND_URL=http://localhost:3000` (or `http://127.0.0.1:3000`).
  - Callback method: `initiator`.
- **Production / Live**:
  - Production `DIDIT_API_KEY` and `DIDIT_WORKFLOW_ID`.
  - `FRONTEND_URL=https://hirealocals.com`.
  - `STRICT_PRODUCTION_CHECKS=true`.
  - Callback method: `both`.

---

## 9. Implementation Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Mismatched Didit Sandbox Key / Workflow ID | High | Verify in Didit Console that both credentials belong to the same Sandbox workspace before testing. |
| Accidental un-verification of manual approvals | High | Code guard already in place: `status == "declined"` does not modify `profile.verified` if already True. |
| Secret exposure in client bundle | Critical | Verified: `NEXT_PUBLIC_` prefixes are never used for Didit API keys. All calls are proxy-routed through FastAPI. |
| Breaking changes to working routes | High | Strictly surgical edits: modify only `didit_kyc.py` and `main.py` profile patch route. Zero schema alterations. |
