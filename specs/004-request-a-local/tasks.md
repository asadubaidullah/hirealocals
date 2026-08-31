# Tasks: SPEC-04 — Request-a-Local (Demand-Capture & Custom Matching)

**Specification**: [specs/004-request-a-local/spec.md](spec.md)  
**Implementation Plan**: [specs/004-request-a-local/plan.md](plan.md)  
**Checklist**: [specs/004-request-a-local/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Ready for Execution (Awaiting User Directive)  

---

## Task Summary Table

| Task ID | Phase | Target File / Area | Dependency | Description |
|---|---|---|---|---|
| **T001** | Phase 0 | `backups/` | None | Create timestamped backup of current codebase before changes. |
| **T002** | Phase 0 | Backend & Frontend environments | None | Verify backend daemon, Next.js server, and database connectivity. |
| **T003** | Phase 1 | `backend/app/models.py` | T001 | Define `TripRequest` and `RequestOffer` SQLModel entities. |
| **T004** | Phase 1 | `backend/app/schemas.py` | T003 | Define Pydantic request/response schemas for requests and quotes. |
| **T005** | Phase 1 | `backend/app/database.py` | T003 | Ensure automatic non-destructive table creation on startup. |
| **T006** | Phase 2 | `backend/app/main.py` | T004, T005 | Implement `POST /api/requests` (traveler custom request intake). |
| **T007** | Phase 2 | `backend/app/main.py` | T006 | Implement `GET /api/traveler/requests` and `GET /api/traveler/requests/{id}`. |
| **T008** | Phase 2 | `backend/app/main.py` | T007 | Implement `PATCH /api/traveler/requests/{id}/cancel`. |
| **T009** | Phase 2 | `backend/app/main.py` | T006 | Implement `GET /api/local/requests` (verified local opportunities feed). |
| **T010** | Phase 2 | `backend/app/main.py` | T009 | Implement `POST /api/local/requests/{id}/offers` (local quote submission). |
| **T011** | Phase 2 | `backend/app/main.py` | T010 | Implement `PATCH /api/local/offers/{offer_id}/withdraw`. |
| **T012** | Phase 2 | `backend/app/main.py` | T010 | Implement atomic `POST /api/traveler/requests/{id}/accept/{offer_id}` conversion. |
| **T013** | Phase 2 | `backend/app/main.py` | T006 | Implement `GET /api/admin/requests` and `POST /api/admin/requests/{id}/notify-locals`. |
| **T014** | Phase 3 | `frontend/components/ExploreClient.tsx` | T006 | Add zero-result search bridge card linking to `/request-a-local` with query params. |
| **T015** | Phase 3 | `frontend/app/request-a-local/page.tsx` | T006, T014 | Build public Request-a-Local multi-field intake form. |
| **T016** | Phase 3 | `frontend/app/dashboard/requests/page.tsx` | T007, T012 | Build traveler request center, quote comparison cards, and accept action. |
| **T017** | Phase 4 | `frontend/app/local-dashboard/opportunities/page.tsx` | T009, T010 | Build verified Local Partner opportunity feed and quote modal. |
| **T018** | Phase 5 | `frontend/app/admin/requests/page.tsx` | T013 | Build admin request oversight dashboard and local dispatch action. |
| **T019** | Phase 6 | `frontend/app/globals.css` | T015, T016, T017 | Add scoped CSS styling for request forms, opportunity cards, and quote sheets. |
| **T020** | Phase 6 | Conversion to Safepay pipeline | T012, T016 | Verify converted booking seamlessly initiates Safepay checkout without modification. |
| **T021** | Phase 6 | Notification & Messaging | T006, T010, T012 | Verify notification dispatch on request, quote, and acceptance events. |
| **T022** | Phase 7 | `backend/scripts/test_point4_e2e.py` | T012, T020 | Create and run automated 14-scenario end-to-end integration test suite. |
| **T023** | Phase 7 | Full Regression Suite | T022 | Run `test_spec01_kyc.py` (12/12 pass) and TypeScript typecheck (`tsc --noEmit`). |
| **T024** | Phase 8 | Security & Authorization Audit | T023 | Audit traveler ownership, KYC authorization, and anti-duplicate locks. |
| **T025** | Phase 8 | Point 4 Freeze Declaration | T024 | Review git diff, verify 0 fake data, and declare Point 4 complete & frozen. |

---

## Detailed Task Breakdown

### PHASE 0 — Safety & Baseline Preparation

#### T001: Create Timestamped Backup
- **Exact File**: `backups/POINT4-PREP-<timestamp>/`
- **Depends On**: None
- **Implementation Intent**: Create isolated copies of `backend/app/models.py`, `backend/app/main.py`, `backend/app/schemas.py`, and `frontend/components/ExploreClient.tsx` before applying any changes.
- **Acceptance Criterion**: Backup directory contains exact copies of target files.
- **Test Requirement**: Verify file existence and non-zero byte size via terminal.

#### T002: Verify Runtime Environments
- **Exact File**: Backend daemon (`127.0.0.1:8000`), Frontend server (`localhost:3000`)
- **Depends On**: None
- **Implementation Intent**: Validate that uvicorn and Next.js are responsive and SQLite database is accessible.
- **Acceptance Criterion**: `GET /api/locals` returns HTTP 200; `GET http://localhost:3000/` returns HTTP 200.
- **Test Requirement**: Run health probe requests.

---

### PHASE 1 — Data Architecture

#### T003: Define `TripRequest` and `RequestOffer` SQLModel Entities
- **Exact File**: `backend/app/models.py`
- **Depends On**: T001
- **Implementation Intent**: Add `TripRequest` and `RequestOffer` SQLModel classes with indexes on `tourist_user_id`, `city_slug`, `booking_date`, `status`, `trip_request_id`, and `local_profile_id`.
- **Acceptance Criterion**: Models include all specified fields, default factories, foreign keys, and status constraints.
- **Test Requirement**: `py -3.14 -m py_compile backend/app/models.py` passes with zero syntax errors.

#### T004: Define Request and Offer Pydantic DTO Schemas
- **Exact File**: `backend/app/schemas.py`
- **Depends On**: T003
- **Implementation Intent**: Define `TripRequestInput`, `RequestOfferInput`, `TripRequestRead`, `RequestOfferRead`, and status update payloads.
- **Acceptance Criterion**: Schemas validate required fields (e.g. `offered_price > 0`, `duration_hours >= 1`, description length).
- **Test Requirement**: Python compilation and schema import validation.

#### T005: Ensure Non-Destructive Database Table Creation
- **Exact File**: `backend/app/database.py`
- **Depends On**: T003
- **Implementation Intent**: Ensure `SQLModel.metadata.create_all(engine)` registers the new tables without altering existing tables.
- **Acceptance Criterion**: SQLite database contains `triprequest` and `requestoffer` tables.
- **Test Requirement**: Query table existence via SQLite pragma in python script.

---

### PHASE 2 — Backend Core APIs

#### T006: Implement Public & Traveler Request Creation (`POST /api/requests`)
- **Exact File**: `backend/app/main.py`
- **Depends On**: T004, T005
- **Implementation Intent**: Authenticate traveler (`tourist` role), validate inputs, persist `TripRequest` (status: `submitted`), log audit event, and queue notifications for candidate locals in the destination city.
- **Acceptance Criterion**: Returns HTTP 201/200 with populated `TripRequest` dictionary including generated ID.
- **Test Requirement**: Automated POST test with valid traveler token creates row in database.

#### T007: Implement Traveler Requests List and Detail Endpoints
- **Exact File**: `backend/app/main.py`
- **Depends On**: T006
- **Implementation Intent**: Implement `GET /api/traveler/requests` and `GET /api/traveler/requests/{id}`, ensuring only the owning traveler can view their own requests and received quotes.
- **Acceptance Criterion**: Queries scoped strictly to `tourist_user_id == current_user.id`; returns attached `RequestOffer` items with quoting Local Partner details.
- **Test Requirement**: Query with matching user returns requests; query with non-matching user returns HTTP 404/403.

#### T008: Implement Traveler Request Cancellation
- **Exact File**: `backend/app/main.py`
- **Depends On**: T007
- **Implementation Intent**: Implement `PATCH /api/traveler/requests/{id}/cancel`. Rejects cancellation if already converted to a booking. Transitions request status to `cancelled` and open offers to `declined`.
- **Acceptance Criterion**: Request status updates to `cancelled`; notifications dispatched to quoting locals.
- **Test Requirement**: Test cancellation transitions on open vs. converted requests.

#### T009: Implement Local Partner Opportunities Feed (`GET /api/local/requests`)
- **Exact File**: `backend/app/main.py`
- **Depends On**: T006
- **Implementation Intent**: Enforce `local.verified == True` and KYC approval. Query open requests (`submitted`, `matching`, `offers_received`) matching the Local Partner's registered city/country.
- **Acceptance Criterion**: Unverified Locals receive HTTP 403. Verified Locals receive open requests in their city.
- **Test Requirement**: Test with verified vs unverified Local tokens.

#### T010: Implement Local Quote Submission (`POST /api/local/requests/{id}/offers`)
- **Exact File**: `backend/app/main.py`
- **Depends On**: T009
- **Implementation Intent**: Allow verified Local in the destination city to submit `RequestOffer` (`offered_price`, `proposed_start_time`, `proposal_message`). Prevents duplicate quotes by the same Local.
- **Acceptance Criterion**: `RequestOffer` created (status: `submitted`), parent request status updates to `offers_received`, notification sent to traveler. Duplicate submission returns HTTP 409.
- **Test Requirement**: Submit initial quote (success) and repeat submit (409 conflict).

#### T011: Implement Local Quote Withdrawal (`PATCH /api/local/offers/{offer_id}/withdraw`)
- **Exact File**: `backend/app/main.py`
- **Depends On**: T010
- **Implementation Intent**: Allow quoting Local to withdraw an unaccepted quote (`status == 'submitted'`).
- **Acceptance Criterion**: Offer status updates to `withdrawn`. Cannot withdraw an already accepted offer.
- **Test Requirement**: Test withdrawal on submitted vs accepted quote.

#### T012: Implement Atomic Offer Acceptance & Booking Conversion (`POST /api/traveler/requests/{id}/accept/{offer_id}`)
- **Exact File**: `backend/app/main.py`
- **Depends On**: T010
- **Implementation Intent**: Execute atomic transaction: verify traveler ownership, set accepted offer to `accepted`, set competing offers to `declined`, set request to `converted_to_booking`, create standard `Booking` (status: `confirmed`, subtotal, 12% platform fee), create `BookingDetail`, commit, and return new `booking_id`.
- **Acceptance Criterion**: Exactly one `Booking` is created; race-condition locks prevent duplicate conversion.
- **Test Requirement**: Test acceptance creates `Booking` and repeated acceptance call returns HTTP 409.

#### T013: Implement Admin Request Oversight & Dispatch Endpoints
- **Exact File**: `backend/app/main.py`
- **Depends On**: T006
- **Implementation Intent**: Implement `GET /api/admin/requests` (paginated, filterable by city/status) and `POST /api/admin/requests/{id}/notify-locals` to broadcast opportunity alerts to verified candidate locals.
- **Acceptance Criterion**: Admin-only access enforced via `admin_user` dependency.
- **Test Requirement**: Admin token retrieves all requests; non-admin receives HTTP 403.

---

### PHASE 3 — Traveler UI

#### T014: Add Zero-Result Search Bridge CTA to Explore
- **Exact File**: `frontend/components/ExploreClient.tsx`
- **Depends On**: T006
- **Implementation Intent**: When `items.length === 0`, render `.explore-request-bridge-card` with dynamic copy (*"Can't find the right local in {city}?"*) and link to `/request-a-local` preserving search params (`city`, `category`, `date`, `guests`).
- **Acceptance Criterion**: Zero-result searches display the CTA with pre-filled link.
- **Test Requirement**: Verify UI render and query string generation.

#### T015: Build Public Request-a-Local Intake Page
- **Exact File**: `frontend/app/request-a-local/page.tsx`
- **Depends On**: T006, T014
- **Implementation Intent**: Create responsive intake form (city, date, time preference, duration, guests, category, description, budget, special requirements). Handles auth redirection gracefully and submits to `POST /api/requests`.
- **Acceptance Criterion**: Valid submissions route to `/dashboard/requests`.
- **Test Requirement**: Form validation triggers on empty fields; submission calls API.

#### T016: Build Traveler Request Center & Quote Comparison View
- **Exact File**: `frontend/app/dashboard/requests/page.tsx`
- **Depends On**: T007, T012
- **Implementation Intent**: Render traveler's submitted requests, status badges, and expandable quote cards showing Local Partner avatar, rating, hourly rate, offered total price, proposed time, and `[ Accept Offer ]` CTA.
- **Acceptance Criterion**: Clicking Accept triggers conversion and routes traveler to `/dashboard/bookings/{new_booking_id}`.
- **Test Requirement**: Quote comparison cards display correct pricing and acceptance triggers redirect.

---

### PHASE 4 — Local Partner UI

#### T017: Build Local Partner Opportunities Hub & Quote Modal
- **Exact File**: `frontend/app/local-dashboard/opportunities/page.tsx`
- **Depends On**: T009, T010
- **Implementation Intent**: Create Opportunities feed under `/local-dashboard/opportunities`. Displays traveler requirements for the Local's city, budget, dates, and group size. Includes quote submission modal.
- **Acceptance Criterion**: Verified Local can review requirements, submit quote, and view submission confirmation.
- **Test Requirement**: Local quote modal submits valid payload and updates UI.

---

### PHASE 5 — Admin UI

#### T018: Build Admin Request Management Panel
- **Exact File**: `frontend/app/admin/requests/page.tsx`
- **Depends On**: T013
- **Implementation Intent**: Create `/admin/requests` with filterable table, request status overview, traveler requirements detail drawer, and candidate local dispatch action.
- **Acceptance Criterion**: Admin can inspect any request, view candidate locals, and trigger notification alerts.
- **Test Requirement**: Table renders all request rows and detail drawer opens.

---

### PHASE 6 — Integration & Safepay Continuation

#### T019: Scoped CSS Styling for Request-a-Local Components
- **Exact File**: `frontend/app/globals.css`
- **Depends On**: T015, T016, T017
- **Implementation Intent**: Add scoped styles for `.request-a-local-form`, `.explore-request-bridge-card`, `.quote-comparison-card`, and `.opportunity-card` supporting Light and Dark modes.
- **Acceptance Criterion**: Responsive layout across mobile and desktop; passes contrast guidelines.
- **Test Requirement**: Visual rendering check on desktop and mobile viewports.

#### T020: Safepay Continuation Verification for Converted Bookings
- **Exact File**: Booking checkout pipeline
- **Depends On**: T012, T016
- **Implementation Intent**: Verify that a converted `Booking` (#id) opens the standard Safepay checkout (`/api/payments/bookings/{id}/checkout`), returns hosted checkout URL, and reconciles upon return to `/dashboard/bookings/{id}?payment=success`.
- **Acceptance Criterion**: Zero modifications to Safepay codebase; payment reconciles to `paid`.
- **Test Requirement**: Automated payment checkout call on converted booking ID.

#### T021: Verify Reused Notification & Messaging Lifecycle
- **Exact File**: Notification & Conversation subsystem
- **Depends On**: T006, T010, T012
- **Implementation Intent**: Verify that `Notification` and `EmailOutbox` records are properly created on request, quote, and acceptance events, and that the converted booking conversation activates in `/dashboard/messages`.
- **Acceptance Criterion**: Notification badges update; outbox records queued.
- **Test Requirement**: Database inspection of `notification` and `emailoutbox` tables.

---

### PHASE 7 — Comprehensive Automated Testing

#### T022: Implement Automated 14-Scenario Integration Test Suite
- **Exact File**: `backend/scripts/test_point4_e2e.py`
- **Depends On**: T012, T020
- **Implementation Intent**: Build standalone Python automated test runner executing the complete 14-scenario lifecycle:
  1. Traveler request submission.
  2. Unverified Local receiving 403.
  3. Verified Local receiving matching opportunity.
  4. Local quote submission.
  5. Competing Local quote submission.
  6. Duplicate quote conflict check (409).
  7. Traveler quote comparison.
  8. Atomic quote acceptance -> Booking conversion.
  9. Competing quote declined state verification.
  10. TripRequest converted state verification.
  11. Duplicate acceptance conflict check (409).
  12. Safepay checkout generation on converted booking.
  13. Payment return & reconciliation verification.
  14. Experience completion -> Review submission -> Public review display.
- **Acceptance Criterion**: All 14 test scenarios pass with 0 errors.
- **Test Requirement**: Run `py -3.14 backend/scripts/test_point4_e2e.py`.

#### T023: Full Regression Suite & Typecheck
- **Exact File**: `backend/scripts/test_spec01_kyc.py` & Frontend Typecheck
- **Depends On**: T022
- **Implementation Intent**: Run SPEC-01 KYC regression suite and `npm run typecheck` to confirm zero regressions across Points 1–3.
- **Acceptance Criterion**: SPEC-01 suite: 12/12 PASS; TypeScript: 0 errors.
- **Test Requirement**: Execute both test commands.

---

### PHASE 8 — Final Review & Freeze

#### T024: Security, Anti-Fraud & Architecture Audit
- **Exact File**: Full repository
- **Depends On**: T023
- **Implementation Intent**: Audit server-side ownership enforcement, ensure no fake marketplace data exists, confirm strict Safepay exclusivity, and verify frozen modules remain intact.
- **Acceptance Criterion**: Zero security vulnerabilities, zero fake records, clean architecture.
- **Test Requirement**: Review `git diff` and database integrity.

#### T025: Point 4 Freeze Declaration
- **Exact File**: Roadmap governance
- **Depends On**: T024
- **Implementation Intent**: Verify clean working tree, confirm 0 critical blockers, and formally declare Point 4 complete and frozen.
- **Acceptance Criterion**: All acceptance criteria satisfied; working tree clean.
- **Test Requirement**: Final roadmap sign-off.

---

*Task specification complete and ordered for sequential execution.*
