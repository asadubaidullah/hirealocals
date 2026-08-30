# Feature Specification: SPEC-01 — Didit-based Local Partner Identity Verification

**Feature ID**: `SPEC-01`  
**Feature Branch**: `master` (baseline anchored at commit `87277c1`)  
**Created**: 2026-08-30  
**Status**: Draft  
**Target Marketplace**: United Kingdom (GB), United States (US)  
**Primary Actors**: Local Partners, Marketplace Travelers, Marketplace Administrators  
**Integration Partner**: Didit Identity Verification Platform  

---

## 1. Executive Summary & Business Objective

HireALocals is a peer-to-peer travel marketplace connecting travelers with trusted local guides and experts across the United Kingdom and the United States. To foster marketplace trust and traveler safety, Local Partners must verify their real-world identity before their profiles are publicly verified and presented as trusted local experts.

However, excessive onboarding friction directly discourages qualified local partners from joining. Therefore, the identity verification system must deliver a seamless, mobile-friendly, low-friction experience that:
1. Validates government-issued photo identification and live liveness through Didit's hosted verification flow.
2. Explicitly avoids mandatory passport requirements—allowing local partners to verify using regional national identity cards, driving licenses, or residence permits where supported by the provider.
3. Preserves a secure, human-in-the-loop manual verification fallback for edge cases, provider outages, or manual administrative escalation.
4. Strictly protects privacy by storing all verification session data, audit logs, and identity documents in isolated, non-public storage accessible only to authenticated backend services and platform administrators.

---

## 2. User Scenarios & Testing

### User Story 1 — Local Partner Completes Automated Didit Identity Verification (Priority: P1)

As a newly onboarded or unverified Local Partner in the UK or US,  
I want to verify my identity in a few minutes using my driving license or national ID card and a quick live selfie check,  
So that my profile earns the "Verified Local" badge and becomes eligible to host paid bookings on the marketplace.

**Why this priority**: Core marketplace value proposition. Verified identity is the foundation for traveler safety and local partner activation.

**Independent Test**:
A local partner navigates to `/local-dashboard/profile`, checks the consent agreement, clicks "Verify identity", completes the hosted Didit session, returns to `/kyc/return`, and observes their profile status update to "Verified Local" with immediate visibility on public listing routes.

**Acceptance Scenarios**:
1. **Given** an unverified Local Partner logged into their dashboard, **When** they view the verification section, **Then** they see a clear explanation stating that verification takes ~2 minutes, passport is not mandatory, and supported photo IDs are accepted.
2. **Given** the consent checkbox is checked, **When** the user clicks "Verify identity", **Then** the backend initializes a secure Didit session (`POST /api/local/kyc/didit/start`) with vendor identifier `hirealocals-local-{user_id}` and redirects the user's browser to Didit's secure hosted URL.
3. **Given** the user completes the ID capture and liveness check on Didit, **When** Didit redirects back to `/kyc/return?verificationSessionId={id}`, **Then** the HireALocals backend queries Didit server-to-server (`GET /api/local/kyc/didit/status`), confirms decision is `Approved` for that exact user ID, and marks `LocalProfile.verified = True`.
4. **Given** a verified Local Partner, **When** they revisit their profile, **Then** the UI displays the green "Identity verified" badge and disables unnecessary re-verification triggers.

---

### User Story 2 — Local Partner Uses Manual Document Verification Fallback (Priority: P2)

As a Local Partner whose automated verification is in review, failed due to temporary camera/provider issues, or requires special accommodation,  
I want to upload a secure photo or PDF of my government ID directly to HireALocals for administrator review,  
So that I can still complete my verification without being permanently blocked from the marketplace.

**Why this priority**: Essential safety net ensuring high partner onboarding conversion even during third-party API downtimes or edge-case document formats.

**Independent Test**:
A Local Partner uploads a valid identity document (PDF/JPG/PNG/WebP) via the manual verification fallback. The document is stored in private backend storage. An administrator reviews the file in `/admin/uploads` and approves it, automatically updating the Local's status to verified.

**Acceptance Scenarios**:
1. **Given** an unverified Local Partner on `/local-dashboard/profile`, **When** they select a document under "Manual verification fallback", **Then** the client uploads the file to `POST /api/local/verification-document`.
2. **Given** a successful manual upload, **When** the upload completes, **Then** the document is assigned `status = "pending"` in private storage and appears in the partner's upload history table.
3. **Given** an administrator logged into `/admin/uploads`, **When** the administrator clicks "View", **Then** the document is streamed via an authenticated endpoint (`GET /api/admin/uploads/{id}/file`) within a secure modal preview.
4. **Given** an administrator clicks "Approve + verify", **When** `PATCH /api/admin/uploads/{id}/status` executes with status `approved`, **Then** the Local Partner's `LocalProfile.verified` is set to `True`, an audit event is logged, and an in-app + email notification is sent to the partner.

---

### User Story 3 — Administrator Audits and Manages Partner Verification Status (Priority: P3)

As a Marketplace Administrator,  
I want a centralized dashboard showing all Local Partners, their current verification status, verification source (Didit automated vs manual upload), and decision history,  
So that I can ensure platform safety, investigate fraud, and manually unverify or re-verify partners when necessary.

**Why this priority**: Critical operational governance and risk mitigation for marketplace trust & safety teams.

**Independent Test**:
An administrator visits `/admin/locals`, filters by verified/unverified state, inspects a partner's uploaded documentation or Didit status, and can safely toggle verification status with mandatory audit logging.

**Acceptance Scenarios**:
1. **Given** an administrator on `/admin/locals`, **When** viewing the table, **Then** each row clearly shows the Local's name, email, location, rating, service count, and verification badge.
2. **Given** an unverified Local with no approved KYC document, **When** an admin attempts to toggle verification to `verified`, **Then** the backend enforces a conflict guard (`409 Conflict: Approved KYC document is required before this Local can be verified`) unless an approved document or Didit verification exists.
3. **Given** an administrator unverifies a partner, **When** `PATCH /api/admin/locals/{id}/verification` executes with `status = "unverified"`, **Then** `LocalProfile.verified` is set to `False` and an audit event is appended to `AuditLog`.

---

### Edge Cases & Failure Modes

1. **Provider Credentials Misconfiguration (HTTP 401/403/502 from Didit):**
   - *Current Known Issue*: "Identity provider error: You do not have permission to perform this action."
   - *Specified Handling*: If Didit credentials are missing or return authorization errors, the backend must return a sanitized error message and the frontend must gracefully inform the user to use the manual verification upload fallback without crashing or leaking API keys.
2. **Session Tampering / Hijacking Attempt:**
   - If a malicious user attempts to call `/api/local/kyc/didit/status` with a `session_id` belonging to another user, the backend verifies that `decision.vendor_data == "hirealocals-local-{current_user.id}"`. If mismatched, it terminates with `403 Forbidden`.
3. **Underage Applicant (Age < 18):**
   - If Didit extracts a date of birth showing the applicant is under 18 years old, Didit marks the decision as `Declined`. The backend maps this to `declined`, keeps `profile.verified = False`, and displays a policy notice explaining that local partners must be at least 18 years of age.
4. **Session Expiry or Abandonment:**
   - If the user closes the Didit tab before completion, Didit marks the session as `Expired` or `Abandoned`. Upon return to `/kyc/return`, the backend maps this to `retry_required`, providing a single-click button to start a fresh verification session.
5. **Declined Didit Verification for Manually Verified Local:**
   - If a Local Partner who was previously approved manually by an admin later runs an automated check that gets declined, the system must **not** automatically revoke their existing manual verification status unless an administrator explicitly takes action.
6. **Concurrent Requests:**
   - If a user triggers `/start` while an approved verification already exists on their profile, the backend immediately returns `{ ok: true, already_verified: true, verified: true }` without consuming a billable Didit session.

---

## 3. Requirements

### Functional Requirements

- **FR-001**: The system MUST allow Local Partners to initiate an automated identity verification session through Didit without requiring a passport (accepting supported National IDs, Driver's Licenses, and Passports).
- **FR-002**: The system MUST require explicit user consent acknowledging identity verification data processing prior to launching the verification flow.
- **FR-003**: The system MUST pass a unique, tamper-proof vendor reference (`hirealocals-local-{user_id}`) to Didit to ensure 1-to-1 account binding.
- **FR-004**: The system MUST perform server-to-server verification of Didit decisions and verify ownership of the returned `vendor_data` before granting verified status.
- **FR-005**: The system MUST support a manual document upload fallback (`PDF`, `JPG`, `PNG`, `WebP` up to 8MB) stored exclusively in private storage (`backend/private_uploads/verification`).
- **FR-006**: The system MUST restrict viewing and status updates of manual verification documents exclusively to authenticated administrators (`admin` role).
- **FR-007**: The system MUST record audit events in `AuditLog` for all verification decisions (both automated Didit decisions and manual administrator overrides).
- **FR-008**: The system MUST send in-app and email notifications to the Local Partner when their verification status changes (`approved`, `rejected`, or `needs_info`).
- **FR-009**: The system MUST provide administrators with a dedicated verification queue in `/admin/uploads` and `/admin/locals`.
- **FR-010**: The system MUST prevent public display of verification badges on local listings unless `LocalProfile.verified == True` in the database.
- **FR-011**: The system MUST support environment-based configuration separating Didit Sandbox (`https://verification.didit.me`) for development/testing and Production credentials for live deployments.
- **FR-012**: The system MUST never expose Didit API keys, webhook secrets, or private document paths to the frontend or public repositories.

---

## 4. Key Entities & Verification States

### Verification State Transition Diagram

```
                 ┌──────────────────────────────────────┐
                 │             Not Started              │
                 └──────────────────┬───────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
        [Start Didit Flow]                     [Upload Manual Document]
               │                                         │
               ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐
   │  Didit: In Progress   │                 │  Manual: Pending QA   │
   └───────────┬───────────┘                 └───────────┬───────────┘
               │                                         │
       ┌───────┴───────┬──────────────┐                  ├──────────────┬──────────────┐
       ▼               ▼              ▼                  ▼              ▼              ▼
 ┌───────────┐   ┌───────────┐  ┌───────────┐      ┌───────────┐  ┌───────────┐  ┌───────────┐
 │ Approved  │   │ In Review │  │ Declined  │      │ Approved  │  │ Rejected  │  │Needs Info │
 └─────┬─────┘   └─────┬─────┘  └─────┬─────┘      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
       │               │              │                  │              │              │
       ▼               │              ▼                  ▼              │              ▼
┌──────────────┐       │       ┌──────────────┐   ┌──────────────┐      │       ┌──────────────┐
│Local Verified│       │       │Retry / Manual│   │Local Verified│      │       │Request Re-up │
└──────────────┘       │       └──────────────┘   └──────────────┘      │       └──────────────┘
                       ▼                                                ▼
              ┌─────────────────┐                             ┌─────────────────┐
              │ Wait for Result │                             │ Unverified Hold │
              └─────────────────┘                             └─────────────────┘
```

### Entity Mapping (Current Codebase)

1. **`User`** (`models.py`):
   - `id`: Unique integer identifier.
   - `email`: Contact email used for notifications and verification reference.
   - `role`: Role identifier (`local`, `tourist`, `admin`).
2. **`LocalProfile`** (`models.py`):
   - `id`: Local profile identifier.
   - `user_id`: Foreign key referencing `User.id`.
   - `verified`: Boolean flag indicating verified identity status.
   - `slug`: Public URL slug for marketplace listing.
3. **`UploadRecord`** (`models.py`):
   - `id`: Upload record identifier.
   - `owner_user_id`: Foreign key referencing `User.id`.
   - `kind`: Upload category (`verification_document` vs `profile_image`).
   - `stored_path`: Absolute filesystem path in private storage.
   - `status`: Moderation status (`pending`, `approved`, `rejected`).
4. **`AuditLog`** (`models.py`):
   - `actor_user_id`: Administrator or System actor ID.
   - `action`: E.g., `admin.upload_status`, `admin.local_verification`.
   - `entity_type`: `upload`, `local_profile`.
   - `summary`: Contextual audit trail note.

---

## 5. System Architecture & Component Responsibilities

### Backend Responsibilities (`backend/app/didit_kyc.py`, `backend/app/main.py`)
- Maintain secure, isolated environment settings (`DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_BASE_URL`).
- Issue `POST /v3/session/` requests with strictly required metadata and callback parameters.
- Query `GET /v3/session/{id}/decision/` to confirm verification authenticity server-to-server.
- Ensure strict access control on private KYC document endpoints (`/api/admin/uploads/{id}/file`).
- Guarantee idempotency on status transitions and prevent regression of manually verified accounts.

### Frontend Responsibilities (`frontend/components/DiditKycCard.tsx`, `frontend/app/kyc/return/page.tsx`)
- Present a clear, trustworthy explanation of verification requirements to the partner.
- Collect explicit user consent prior to initiating session creation.
- Handle browser redirect handoff to Didit hosted verification.
- Receive return redirect at `/kyc/return`, extract `verificationSessionId`, request status validation from the backend, and present clear next steps.
- Provide accessible manual upload fallback UI with document status history.

---

## 6. Success Criteria

- **SC-001**: A Local Partner with a supported government photo ID can complete the automated verification process in **under 3 minutes**.
- **SC-002**: 100% of identity verification decisions are verified **server-side**; zero client-side assertions can grant a verification badge.
- **SC-003**: 100% of private identity verification documents remain inaccessible to unauthenticated or non-admin requests.
- **SC-004**: When automated verification is unavailable or declined, 100% of partners have immediate access to the manual upload fallback.
- **SC-005**: 100% of verification status modifications generate an audit log entry in `AuditLog`.

---

## 7. Assumptions & Unresolved Questions

### Validated Assumptions
1. The primary target jurisdictions are the United Kingdom (`GB`) and United States (`US`).
2. The Didit workflow utilizes a lean check sequence: ID verification + passive liveness + face matching + device/IP risk analysis.
3. Passport is explicitly not required; driver's licenses and state/national ID cards are accepted.
4. SQLite is used for local Laragon development; PostgreSQL is targeted for production.

### Clarifications / Operational Items for Planning Phase
1. **Didit Credential Provisioning**: Valid Sandbox and Production `DIDIT_API_KEY` and `DIDIT_WORKFLOW_ID` pairs must be configured in `.env` before live testing.
2. **Webhook Support**: While the primary verification uses synchronous return polling (`/kyc/return` -> `/api/local/kyc/didit/status`), an optional Didit webhook listener can be specified for asynchronous "In Review" decisions that resolve later.

---

## 8. Specification Artifact Location & Governance

- **Spec File**: `specs/001-didit-kyc-verification/spec.md`
- **Quality Checklist**: `specs/001-didit-kyc-verification/checklists/requirements.md`
- **Feature Registry**: `.specify/feature.json`
- **Spec Kit Constitution**: `.specify/memory/constitution.md`
