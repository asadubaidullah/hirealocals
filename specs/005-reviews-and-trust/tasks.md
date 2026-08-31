# Task List: SPEC-05 — Reviews & Trust System

**Specification**: [specs/005-reviews-and-trust/spec.md](spec.md)  
**Implementation Plan**: [specs/005-reviews-and-trust/plan.md](plan.md)  
**Checklist**: [specs/005-reviews-and-trust/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Ready for Execution (Awaiting User Directive)  

---

## Task Organization & Dependencies

```
PHASE 0: Safety & Baseline (T001-T002)
   │
   ▼
PHASE 1: Rating & Data Foundation (T003-T006)
   │
   ▼
PHASE 2: Moderation & Consistency (T007-T008)
   │
   ▼
PHASE 3: Verified Experience Trust API (T009)
   │
   ▼
PHASE 4: Public Profile Trust Presentation (T010)
   │
   ▼
PHASE 5: Local Partner Reviews Hub (T011-T013)
   │
   ▼
PHASE 6: Review Reporting & Abuse Prevention (T014-T015)
   │
   ▼
PHASE 7: Admin Moderation Enhancements (T016-T017)
   │
   ▼
PHASE 8: Notifications & Integration (T018)
   │
   ▼
PHASE 9: Responsive CSS Styling (T019)
   │
   ▼
PHASE 10: Testing & Freeze Gate (T020-T025)
```

---

## Phase 0 — Safety & Baseline Preparation

- [ ] **T001**: Create timestamped pre-implementation backup directory under `backups/POINT5-PREP-<timestamp>/` containing current copies of `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/main.py`, `frontend/app/locals/[slug]/page.tsx`, `frontend/components/LocalSidebar.tsx`, `frontend/app/admin/reviews/page.tsx`, and `frontend/app/globals.css`.  
  - **File**: `backups/POINT5-PREP-<timestamp>/`
  - **Depends on**: None
  - **Implementation Intent**: Safeguard active working state before modifying backend or frontend files.
  - **Acceptance Criterion**: Backup directory created outside `backend/` and `frontend/` containing intact copies of all targeted files.
  - **Test Requirement**: Verify file existence and non-zero byte size.

- [ ] **T002**: Verify baseline service health for backend daemon (`127.0.0.1:8000`), frontend dev server (`localhost:3000`), and SQLite database connectivity.  
  - **File**: Workspace environment
  - **Depends on**: T001
  - **Implementation Intent**: Ensure all daemons and test suites are functional before starting Point 5 changes.
  - **Acceptance Criterion**: HTTP 200 on `/api/locals` and `/explore`.
  - **Test Requirement**: `curl -I http://127.0.0.1:8000/api/locals` returns 200.

---

## Phase 1 — Rating & Data Foundation

- [ ] **T003**: Define the `ReviewReport` SQLModel entity in `backend/app/models.py`.  
  - **File**: `backend/app/models.py`
  - **Depends on**: T002
  - **Implementation Intent**: Establish structured database model for storing user and local reports on abusive, fraudulent, or inappropriate reviews.
  - **Fields**: `id`, `review_id` (FK to `review.id`, indexed), `reporter_user_id` (FK to `user.id`, indexed), `reason` (str, max 60), `details` (str, max 1000), `status` (str, default `"pending"`, indexed), `created_at` (datetime).
  - **Acceptance Criterion**: `ReviewReport` is registered on `SQLModel.metadata`.
  - **Test Requirement**: `py -3.14 -m py_compile backend/app/models.py` exits with 0.

- [ ] **T004**: Define the `ReviewReportInput` Pydantic schema in `backend/app/schemas.py`.  
  - **File**: `backend/app/schemas.py`
  - **Depends on**: T003
  - **Implementation Intent**: Validate report submission payloads with required `reason` and optional `details`.
  - **Acceptance Criterion**: Pydantic model validates string lengths and prevents empty reason strings.
  - **Test Requirement**: `py -3.14 -m py_compile backend/app/schemas.py` exits with 0.

- [ ] **T005**: Implement the centralized `recalculate_local_rating(session, local_profile_id)` engine in `backend/app/main.py`.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T004
  - **Implementation Intent**: Create single source of truth helper that queries all reviews for a local, filters out `ReviewModeration.status == 'hidden'`, computes average rating rounded to 2 decimals, total count, and exact 1–5 star distribution dictionary, then updates and commits `LocalProfile.rating` and `LocalProfile.review_count`.
  - **Acceptance Criterion**: Idempotent and returns `{"rating": float, "review_count": int, "distribution": dict}`.
  - **Test Requirement**: Unit test verifying rating calculation with hidden and visible reviews.

- [ ] **T006**: Update `POST /api/traveler/reviews` in `backend/app/main.py` to use `recalculate_local_rating()`.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T005
  - **Implementation Intent**: Replace manual incremental average math with the centralized recalculation engine upon traveler review submission.
  - **Acceptance Criterion**: Submitting a review recalculates profile rating and distribution automatically.
  - **Test Requirement**: `POST /api/traveler/reviews` updates `LocalProfile.rating` accurately.

---

## Phase 2 — Moderation & Rating Consistency

- [ ] **T007**: Update `PATCH /api/admin/reviews/{review_id}/moderation` in `backend/app/main.py` to trigger `recalculate_local_rating()`.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T006
  - **Implementation Intent**: When an admin marks a review `hidden`, `flagged`, or `visible`, automatically recalculate the associated `LocalProfile` rating and review count, and record an `AuditEvent`.
  - **Acceptance Criterion**: Changing status to `hidden` removes the review's star value from the local's public average rating without delay.
  - **Test Requirement**: Moderating a review status immediately changes `LocalProfile.rating` in SQLite.

- [ ] **T008**: Verify hidden review exclusion from public listings and APIs.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T007
  - **Implementation Intent**: Ensure `GET /api/locals/{slug}` strictly omits reviews with moderation status `hidden`.
  - **Acceptance Criterion**: Hidden reviews never appear in public review lists.
  - **Test Requirement**: API test verifying response payload excludes hidden review items.

---

## Phase 3 — Verified Experience Trust API

- [ ] **T009**: Extend `GET /api/locals/{slug}` in `backend/app/main.py` to return `rating_breakdown`, `completed_trips_count`, and `verified_booking: true`.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Supply the public profile endpoint with real trust metrics: 5-to-1 star distribution histogram, count of completed paid bookings, and verified experience indicators for each displayed review.
  - **Acceptance Criterion**: Response payload includes `rating_breakdown: {5: int, 4: int, 3: int, 2: int, 1: int}`, `completed_trips_count: int`, and review objects containing `verified_booking: true`.
  - **Test Requirement**: `GET /api/locals/{slug}` returns enriched trust fields with correct types.

---

## Phase 4 — Public Profile Trust Presentation

- [ ] **T010**: Enhance `frontend/app/locals/[slug]/page.tsx` with rating breakdown histogram, verified experience badges, and completed trips metric.  
  - **File**: `frontend/app/locals/[slug]/page.tsx`
  - **Depends on**: T009
  - **Implementation Intent**: Visually render the 5★-to-1★ distribution bars, `[ ✓ Verified Experience ]` trust pill on review cards, privacy-safe traveler name formatting (`"Sarah M."`), and completed experiences chip on profile header.
  - **Acceptance Criterion**: Profile displays visual histogram bars, verified badges, and real trip counts without breaking existing layout.
  - **Test Requirement**: Page renders cleanly with zero React hydration errors.

---

## Phase 5 — Local Partner Reviews Hub

- [ ] **T011**: Implement `GET /api/local/reviews` endpoint in `backend/app/main.py`.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T010
  - **Implementation Intent**: Provide authenticated Local Partners (`require_local_profile`) with their full received review list, aggregate rating, review count, rating distribution, and completed booking count.
  - **Acceptance Criterion**: Returns HTTP 200 with review items and summary metrics for the authenticated local only. Returns HTTP 403 for non-locals.
  - **Test Requirement**: Endpoint test verifying authorization and data isolation.

- [ ] **T012**: Create `frontend/app/local-dashboard/reviews/page.tsx` (Local Reviews & Feedback Hub).  
  - **File**: `frontend/app/local-dashboard/reviews/page.tsx`
  - **Depends on**: T011
  - **Implementation Intent**: Build a dedicated feedback management hub inside `LocalShell` featuring KPI cards (Overall Rating, Total Reviews, 5★ Percentage, Completed Trips), interactive rating distribution bars, traveler feedback feed with verified badges, and an empty state for new locals.
  - **Acceptance Criterion**: Page renders inside `LocalShell` with live review data and responsive card layouts.
  - **Test Requirement**: Verified Local can browse received reviews and view rating breakdown.

- [ ] **T013**: Add "Reviews" navigation link in `frontend/components/LocalSidebar.tsx`.  
  - **File**: `frontend/components/LocalSidebar.tsx`
  - **Depends on**: T012
  - **Implementation Intent**: Add `{ label: "Reviews", href: "/local-dashboard/reviews", icon: Star }` to the Local sidebar navigation menu.
  - **Acceptance Criterion**: Local Partner can access `/local-dashboard/reviews` directly from the sidebar.
  - **Test Requirement**: Navigation link is visible and highlights when active.

---

## Phase 6 — Review Reporting & Abuse Prevention

- [ ] **T014**: Implement `POST /api/reviews/{review_id}/report` endpoint in `backend/app/main.py`.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T013
  - **Implementation Intent**: Enable authenticated users and locals to report a review specifying reason (`spam`, `harassment`, `fraud`, `privacy`, `other`) and optional details. Enforce rate limiting (5/hr) and block duplicate reports (HTTP 409).
  - **Acceptance Criterion**: Creates `ReviewReport` record and emits an audit event.
  - **Test Requirement**: API test verifying report creation, validation, and duplicate rejection.

- [ ] **T015**: Add "Report Review" modal action on `frontend/app/locals/[slug]/page.tsx` and `frontend/app/local-dashboard/reviews/page.tsx`.  
  - **Files**: `frontend/app/locals/[slug]/page.tsx`, `frontend/app/local-dashboard/reviews/page.tsx`
  - **Depends on**: T014
  - **Implementation Intent**: Provide a discrete report dialog allowing users/locals to submit report reason and notes to admin without interrupting browsing.
  - **Acceptance Criterion**: Submitting the modal dispatches `POST /api/reviews/{id}/report` and displays confirmation notice.
  - **Test Requirement**: Modal opens, validates input, submits, and handles success/error states.

---

## Phase 7 — Admin Moderation Enhancements

- [ ] **T016**: Extend `GET /api/admin/reviews` in `backend/app/main.py` to include report counts and pending report details.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T015
  - **Implementation Intent**: Aggregate `ReviewReport` counts and latest report reason for each review in the admin reviews query.
  - **Acceptance Criterion**: Admin review list returns `report_count: int` and `reports: list` for each review.
  - **Test Requirement**: Admin endpoint returns report statistics.

- [ ] **T017**: Update `frontend/app/admin/reviews/page.tsx` to display report flags, report reasons, and status filters.  
  - **File**: `frontend/app/admin/reviews/page.tsx`
  - **Depends on**: T016
  - **Implementation Intent**: Render report count badges in the admin table, display reporter feedback on hover/inspect, and retain Show/Flag/Hide actions with instant rating recalculation.
  - **Acceptance Criterion**: Admin can identify reported reviews at a glance and execute moderation actions.
  - **Test Requirement**: Admin UI reflects report status and executes moderation transitions.

---

## Phase 8 — Notifications & Integration

- [ ] **T018**: Integrate notification alerts for reviews and admin moderation reports.  
  - **File**: `backend/app/main.py`
  - **Depends on**: T017
  - **Implementation Intent**: Reuse existing `add_notification()` and `notify_admins()` to alert Local Partners of new verified reviews and alert Admins when a review receives reports.
  - **Acceptance Criterion**: Notification records created with valid deep links.
  - **Test Requirement**: Review creation and report submission create appropriate notifications.

---

## Phase 9 — Responsive CSS Styling & Polish

- [ ] **T019**: Add scoped CSS styles for rating histograms, verified trust pills, local review cards, and report modals in `frontend/app/globals.css`.  
  - **File**: `frontend/app/globals.css`
  - **Depends on**: T018
  - **Implementation Intent**: Style `.rating-breakdown-box`, `.rating-bar-fill`, `.verified-experience-badge`, `.local-reviews-hub`, `.review-report-modal` with dark mode support and responsive mobile breakpoints.
  - **Acceptance Criterion**: Clean, high-trust UI aesthetic consistent with HireALocals design system in both light and dark themes.
  - **Test Requirement**: Inspect UI on desktop (1280px) and mobile (375px) viewports.

---

## Phase 10 — Comprehensive Automated Testing & Freeze Gate

- [ ] **T020**: Create and execute `backend/scripts/test_point5_e2e.py` covering all 14 test scenarios.  
  - **File**: `backend/scripts/test_point5_e2e.py`
  - **Depends on**: T019
  - **Implementation Intent**: Validate the entire Point 5 Reviews + Trust lifecycle end-to-end:
    1. Valid paid completed booking review submission
    2. Incomplete booking review rejection (HTTP 400)
    3. Unpaid booking review rejection
    4. Duplicate review rejection (HTTP 409)
    5. Verified Experience badge correctness
    6. Centralized rating calculation
    7. 5-star distribution histogram accuracy
    8. Hidden review exclusion from public profile
    9. Admin moderation rating recalculation (hide and unhide)
    10. Local Reviews Hub access and data isolation
    11. Unauthorized cross-local access blocked (HTTP 403)
    12. Review report submission
    13. Duplicate report blocked (HTTP 409)
    14. Public profile consistency and zero fake trust data
  - **Acceptance Criterion**: 14/14 scenarios pass with 0 errors.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point5_e2e.py` exits with 0.

- [ ] **T021**: Run SPEC-01 KYC regression test suite (`backend/scripts/test_spec01_kyc.py`).  
  - **Depends on**: T020
  - **Acceptance Criterion**: 12/12 test scenarios pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_spec01_kyc.py` exits with 0.

- [ ] **T022**: Run Point 3 Traveler Flow E2E regression test suite (`backend/scripts/test_point3_e2e.py`).  
  - **Depends on**: T021
  - **Acceptance Criterion**: 14/14 test scenarios pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point3_e2e.py` exits with 0.

- [ ] **T023**: Run Point 4 Request-a-Local E2E regression test suite (`backend/scripts/test_point4_e2e.py`).  
  - **Depends on**: T022
  - **Acceptance Criterion**: 14/14 test scenarios pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point4_e2e.py` exits with 0.

- [ ] **T024**: Execute frontend TypeScript typecheck and Python syntax compilation.  
  - **Depends on**: T023
  - **Acceptance Criterion**: `npm run typecheck` passes with 0 errors and all backend Python files compile cleanly.
  - **Test Requirement**: `npm run typecheck` exits with 0; `py -3.14 -m py_compile ...` exits with 0.

- [ ] **T025**: Perform final Git diff, status, and freeze review.  
  - **Depends on**: T024
  - **Acceptance Criterion**: `git diff --check` passes cleanly; zero unexpected changes; working tree verified.
  - **Test Requirement**: Generate and present the formal `POINT 5 — IMPLEMENTATION REPORT`.
