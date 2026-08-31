# Implementation Plan: SPEC-05 — Reviews & Trust System

**Feature ID**: `SPEC-05`  
**Specification**: [specs/005-reviews-and-trust/spec.md](spec.md)  
**Checklist**: [specs/005-reviews-and-trust/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Implementation Plan Draft  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Travelers, Verified Local Partners, Administrators  

---

## 1. Architecture Overview & Guarantees

This implementation plan defines the technical execution strategy for **Point 5: Reviews + Trust**.

It builds directly on top of the working review infrastructure established in Point 3 without rewriting existing code:
- Existing `Review` and `ReviewModeration` models are preserved.
- `POST /api/traveler/reviews` completed-booking enforcement and duplicate prevention are preserved.
- Existing traveler reviews UI at `/dashboard/reviews` and booking detail `#review` forms are preserved.
- Administrative moderation structure at `/admin/reviews` is extended non-destructively.

```
+-----------------------------------------------------------------------------------------+
|                               TECHNICAL ARCHITECTURE                                    |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
| 1. DATA LAYER (models.py & schemas.py)                                                  |
|    - Review (existing)                                                                  |
|    - ReviewModeration (existing)                                                        |
|    - ReviewReport [NEW]: Tracks user/local reports on inappropriate reviews             |
|    - ReviewReportInput [NEW]: Pydantic schema for reporting payload                     |
|                                                                                         |
| 2. CORE RATING ENGINE (main.py)                                                         |
|    - recalculate_local_rating(session, local_profile_id):                               |
|      Single source of truth for:                                                        |
|      * LocalProfile.rating (excluding hidden reviews)                                   |
|      * LocalProfile.review_count (excluding hidden reviews)                             |
|      * 1-5 star distribution histogram (counts and percentages)                         |
|                                                                                         |
| 3. API ENDPOINTS LAYER (main.py)                                                        |
|    - GET /api/locals/{slug} -> Enhanced with rating_breakdown, verified_badge, trips    |
|    - POST /api/traveler/reviews -> Uses recalculate_local_rating()                       |
|    - GET /api/local/reviews [NEW] -> Verified local feedback hub endpoint               |
|    - POST /api/reviews/{id}/report [NEW] -> Abuse reporting endpoint                    |
|    - GET /api/admin/reviews -> Enhanced with report counts and status tags              |
|    - PATCH /api/admin/reviews/{id}/moderation -> Triggers recalculate_local_rating()    |
|                                                                                         |
| 4. FRONTEND PRESENTATION LAYER                                                          |
|    - /locals/[slug]/page.tsx: Rating distribution histogram + Verified Experience badge|
|    - /local-dashboard/reviews/page.tsx [NEW]: Local Partner Feedback Hub in LocalShell  |
|    - /admin/reviews/page.tsx: Enhanced moderation queue with report insights            |
|    - globals.css: Scoped CSS for histograms, trust pills, and feedback cards           |
|                                                                                         |
| 5. AUTOMATED TESTING (backend/scripts/test_point5_e2e.py)                               |
|    - 14 automated E2E scenarios verifying calculation, moderation, hub, and trust       |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Proposed Changes & Component Breakdown

### 2.1 Backend Data & Rating Foundation

#### [MODIFY] `backend/app/models.py`
- Add `ReviewReport` model:
  ```python
  class ReviewReport(SQLModel, table=True):
      id: Optional[int] = Field(default=None, primary_key=True)
      review_id: int = Field(foreign_key="review.id", index=True)
      reporter_user_id: int = Field(foreign_key="user.id", index=True)
      reason: str = Field(max_length=60) # spam, harassment, fraud, privacy, other
      details: str = Field(default="", max_length=1000)
      status: str = Field(default="pending", index=True, max_length=30) # pending, resolved, dismissed
      created_at: datetime = Field(default_factory=utcnow)
  ```

#### [MODIFY] `backend/app/schemas.py`
- Add `ReviewReportInput` Pydantic model:
  ```python
  class ReviewReportInput(BaseModel):
      reason: str
      details: Optional[str] = ""
  ```

#### [MODIFY] `backend/app/main.py`
- Add `recalculate_local_rating(session: Session, local_profile_id: int) -> dict`:
  - Queries all reviews for `local_profile_id`.
  - Filters out records where `ReviewModeration.status == 'hidden'`.
  - Computes `avg_rating` (rounded to 2 decimals) and `total_count`.
  - Computes distribution mapping: `{5: count, 4: count, 3: count, 2: count, 1: count}`.
  - Updates `LocalProfile.rating = avg_rating` and `LocalProfile.review_count = total_count`.
  - Returns calculated dictionary.
- Update `POST /api/traveler/reviews`:
  - Replace manual incremental rating math with `recalculate_local_rating()`.
- Update `PATCH /api/admin/reviews/{review_id}/moderation`:
  - After saving moderation status change, call `recalculate_local_rating(session, review.local_profile_id)`.
  - Dispatches `audit_event` with before/after status.
- Update `GET /api/locals/{slug}`:
  - Call/compute rating breakdown distribution and total completed bookings count.
  - Add `"verified_booking": True` to each public review item.
  - Return `{profile, services, availability, reviews, rating_breakdown, completed_trips_count}`.
- Add `GET /api/local/reviews`:
  - Protected by `require_local_profile(user, session)`.
  - Returns all received reviews (including flagged, excluding hidden if local should only see active feedback), overall rating, review count, rating distribution, and completed experiences count.
- Add `POST /api/reviews/{review_id}/report`:
  - Enforce authentication and rate limit (max 5 reports per user per hour).
  - Verify review exists.
  - Check for existing report from same user on same review (409 Conflict if duplicate).
  - Create `ReviewReport` record.
  - Add notification to admin queue and emit audit event.
- Update `GET /api/admin/reviews`:
  - Join `ReviewReport` count and pending report flags for each review.

---

### 2.2 Frontend Public Profile & Trust Badges

#### [MODIFY] `frontend/app/locals/[slug]/page.tsx`
- **Rating Distribution Visualizer:**
  - Render 5-bar histogram (5★, 4★, 3★, 2★, 1★) with progress fill percentages and review counts.
- **Verified Experience Trust Badge:**
  - Render `[ ✓ Verified Experience ]` pill next to reviewer name.
- **Completed Trips Metric:**
  - Render `{completedTrips} completed experiences` chip in the profile header if > 0.
- **Report Review Action:**
  - Provide a subtle `[ Report ]` link triggering the safe report dialog.

---

### 2.3 Local Partner Reviews Hub

#### [NEW] `frontend/app/local-dashboard/reviews/page.tsx`
- Build a dedicated Local Partner Reviews Hub inside `LocalShell`:
  - **KPI Header:** Overall Rating (`★ 4.9`), Total Reviews, 5-Star Percentage, Completed Experiences.
  - **Rating Breakdown Visualizer:** Interactive 5-to-1 star distribution bars.
  - **Reviews Feed:** List of all traveler reviews with reviewer initial, date, rating, title, comment, and verified booking badge.
  - **Empty State:** Clear guidance for new locals on how hosting completed bookings unlocks reviews.

#### [MODIFY] `frontend/components/LocalSidebar.tsx`
- Add `{ label: "Reviews", href: "/local-dashboard/reviews", icon: Star }` to the Local Partner sidebar navigation.

---

### 2.4 Admin Moderation Enhancements

#### [MODIFY] `frontend/app/admin/reviews/page.tsx`
- Add Reports indicator badge in the reviews table.
- Display report reason when a review has pending reports.
- Retain existing Show, Flag, Hide actions which now trigger atomic server-side rating recalculation.

---

### 2.5 Styling & Mobile UX

#### [MODIFY] `frontend/app/globals.css`
- Add scoped styles for:
  - `.rating-breakdown-box`, `.rating-bar-row`, `.rating-bar-track`, `.rating-bar-fill`
  - `.verified-experience-badge`
  - `.local-reviews-hub`, `.local-review-card`, `.local-kpi-grid`
  - `.review-report-modal`
  - Responsive mobile breakpoints for histograms and review cards.

---

## 3. Database Schema Changes & Non-Destructive Strategy

### 3.1 New Table: `reviewreport`
- `id`: Integer Primary Key
- `review_id`: Integer Foreign Key (`review.id`, Indexed)
- `reporter_user_id`: Integer Foreign Key (`user.id`, Indexed)
- `reason`: String (max 60)
- `details`: String (max 1000)
- `status`: String (default `"pending"`, Indexed, max 30)
- `created_at`: DateTime (default UTC now)

### 3.2 Non-Destructive Execution
- Application startup calls `SQLModel.metadata.create_all(engine)`.
- Existing `review`, `booking`, `user`, `localprofile`, and `reviewmoderation` tables remain completely unchanged.
- Zero destructive migrations.

---

## 4. Implementation Dependency Order

```
Phase 0 — Preparation & Baseline Verification
  │
  ▼
Phase 1 — Data Model & Schema (ReviewReport & ReviewReportInput)
  │
  ▼
Phase 2 — Centralized Rating Engine (recalculate_local_rating)
  │
  ▼
Phase 3 — Backend API Endpoints (GET /api/local/reviews, POST /api/reviews/{id}/report, Admin Moderation hook)
  │
  ▼
Phase 4 — Public Profile Trust Presentation (/locals/[slug] histogram & verified badge)
  │
  ▼
Phase 5 — Local Partner Reviews Hub (/local-dashboard/reviews & LocalSidebar)
  │
  ▼
Phase 6 — Admin Moderation Enhancements (/admin/reviews report integration)
  │
  ▼
Phase 7 — CSS Styles & Mobile Polish (globals.css)
  │
  ▼
Phase 8 — Comprehensive Automated Testing (test_point5_e2e.py + regression suites)
  │
  ▼
Phase 9 — Final Review & Freeze
```

---

## 5. Testing & Verification Strategy

Create `backend/scripts/test_point5_e2e.py` covering 14 test scenarios:

1. **Traveler Submits 5★ Review:** Verifies `POST /api/traveler/reviews` creates review and triggers `recalculate_local_rating`.
2. **Uncompleted Booking Rejection:** Verifies `pending` or `confirmed` booking returns HTTP 400.
3. **Duplicate Review Rejection:** Verifies duplicate submission on same booking returns HTTP 409.
4. **Non-Owner Review Rejection:** Verifies user cannot review another traveler's booking.
5. **Verified Experience Badge:** Verifies public profile API returns `verified_booking: true` for completed booking reviews.
6. **Rating Distribution Accuracy:** Verifies 5-star distribution dictionary matches database counts.
7. **Admin Hides Review:** Verifies `PATCH /api/admin/reviews/{id}/moderation` with `status: hidden` recalculates rating and excludes the review from public profile.
8. **Admin Restores Review:** Verifies restoring to `status: visible` recalculates rating back up.
9. **Local Reviews Hub API:** Verifies `GET /api/local/reviews` returns local's reviews, rating breakdown, and completed trip count.
10. **Cross-Local Access Blocked:** Verifies Local A cannot view Local B's private review hub data (HTTP 403).
11. **Review Reporting Flow:** Verifies `POST /api/reviews/{id}/report` creates `ReviewReport` record.
12. **Duplicate Report Throttling:** Verifies user cannot submit duplicate report on same review (HTTP 409).
13. **Admin Report Oversight:** Verifies `/api/admin/reviews` displays report counts and details.
14. **Audit Trail Integrity & Full Regression:** Verifies `AuditEvent` logging and confirms 100% pass on KYC (12/12), Point 3 (14/14), Point 4 (14/14), and TypeScript typecheck.

---

## 6. Risk Assessment & Mitigations

| Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| **Rating Drift on Moderation** | Low | High | Use centralized `recalculate_local_rating()` single function triggered on every review submission and moderation status change. |
| **Spam / Malicious Review Reports** | Low | Medium | Rate limit report endpoint (5/hr) and enforce unique `(review_id, reporter_user_id)` constraint. |
| **Breaking Local Workspace Freeze** | Low | High | Keep `/local-dashboard/reviews` scoped to a single self-contained page wrapped in existing `LocalShell`. |
| **Slow Query on Large Review Sets** | Low | Low | Reviews are indexed by `local_profile_id` and cached in `LocalProfile.rating`/`review_count`. |
