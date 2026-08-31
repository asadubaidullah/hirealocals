# Feature Specification: SPEC-05 — Reviews & Trust System

**Feature ID**: `SPEC-05`  
**Feature Branch**: `master`  
**Created**: 2026-08-31  
**Status**: Specification Complete / Ready for Planning  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Travelers (Tourists), Verified Local Partners, Marketplace Administrators  
**Dependencies**: Point 1 (KYC & Trust), Point 2 (Local Workspace), Point 3 (Traveler Flow & Safepay), Point 4 (Request-a-Local)  

---

## 1. Executive Summary & Business Objective

Trust is the single most critical decision driver in a peer-to-peer travel marketplace. Travelers hire locals for private, in-person experiences in unfamiliar cities; verified authenticity, accurate ratings, and transparent feedback are essential for high conversion and traveler safety.

While **Point 3** established baseline traveler review submission on completed bookings and public review rendering, **Point 5: Reviews + Trust** completes the marketplace trust engine without rebuilding existing stable foundations.

### Core Objectives:
1. **Verified Booking Trust Standard:** Formally define and visibly surface verified booking trust indicators backed 100% by authenticated, completed, and paid `Booking` transactions.
2. **Reliable Rating & Recalculation Engine:** Centralize rating math so `LocalProfile.rating`, `review_count`, and distribution histograms are automatically recomputed whenever reviews are created or moderated (hidden/restored).
3. **Transparent Rating Distribution:** Provide public rating breakdown histograms (5-star down to 1-star) on Local Partner profiles.
4. **Local Partner Review & Feedback Hub:** Provide a dedicated dashboard view (`/local-dashboard/reviews`) where verified Local Partners can inspect traveler feedback, monitor rating trends, and identify improvement opportunities.
5. **Review Dispute & Reporting Mechanism:** Provide a lightweight, safe reporting pathway for Local Partners or marketplace users to flag abusive, fraudulent, or off-topic reviews for administrative moderation.
6. **Abuse Prevention & Privacy Protections:** Ensure review immutability post-submission, protect traveler anonymity on public pages (first name + initial), and maintain an immutable admin audit log.

```
+-----------------------------------------------------------------------------------+
|                           POINT 5 TRUST LIFECYCLE                                 |
+-----------------------------------------------------------------------------------+
| 1. Verified Experience Completed & Paid                                           |
|    Booking status == "completed" (ensured paid via Safepay/reconciliation)        |
|                                                                                   |
| 2. Traveler Submits Review (/dashboard/bookings/[id]#review)                      |
|    - 1-5 Star Rating + Title + Text                                               |
|    - Unique booking constraint enforced (no duplicates)                           |
|                                                                                   |
| 3. Centralized Rating Recalculation Engine                                        |
|    - Updates LocalProfile.rating, review_count, and rating breakdown              |
|                                                                                   |
| 4. Public Profile Display (/locals/[slug])                                        |
|    - "Verified Experience" trust badge                                            |
|    - Rating breakdown distribution (5★ to 1★)                                     |
|    - Privacy-safe traveler attribution ("John D.")                                |
|                                                                                   |
| 5. Local Partner Feedback Hub (/local-dashboard/reviews)                          |
|    - View all received traveler reviews, performance stats, and ratings           |
|    - Safe "Report Review" flag for administrator review                           |
|                                                                                   |
| 6. Administrative Moderation (/admin/reviews)                                     |
|    - View moderation queue and report flags                                       |
|    - Show / Flag / Hide actions with automatic rating recomputation & audit log   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Scope & Boundaries

### Included in Point 5:
- **Verified Booking Trust Indicators:** Visual verification tags tied strictly to backend completed booking verification.
- **Centralized Rating Engine:** `recalculate_local_rating(session, local_profile_id)` ensuring consistency across submission, moderation hiding, and unhiding.
- **Rating Distribution Histograms:** Breakdown of 5★, 4★, 3★, 2★, 1★ ratings on public profiles and local partner dashboards.
- **Local Partner Review Hub:** `/local-dashboard/reviews` page embedded within the frozen Local Workspace.
- **Review Reporting Pathway:** `POST /api/reviews/{id}/report` enabling authenticated reporting of abusive/fraudulent reviews.
- **Admin Moderation Improvements:** Integration of reporting flags into `/admin/reviews` with automated rating recomputation upon status changes.
- **Mobile UX Enhancements:** Responsive review cards, verified badges, and histogram displays across mobile viewports.

### Explicitly Excluded (Non-Goals):
- **Local → Traveler Public Reviews:** Excluded from Point 5. In peer-to-peer guided travel, traveler reviews of locals drive 95%+ of platform liquidity. Public reviews of travelers introduce retaliation dynamics and friction; private host internal notes can be considered in future post-launch iterations.
- **AI Moderation / Automated Censorship:** Moderation remains deterministic and admin-driven.
- **Incentivized or Synthetic Reviews:** Zero fabricated reviews, ratings, or completed trip badges.
- **Third-Party Review Imports:** Reviews must originate from authentic HireALocals bookings only (TripAdvisor/Google import excluded).
- **Payment Provider Changes:** Zero modification to Safepay architecture.
- **Workspace Architectural Redesigns:** Local Workspace (Point 2) and Traveler Flow (Point 3) remain frozen.

---

## 3. User Stories & Acceptance Scenarios

### User Story 1 — Traveler Evaluates Trust & Feedback on Public Profile (Priority: P1)
**As a** prospective Traveler exploring Local Partners,  
**I want to** view genuine, verified reviews with an aggregate rating and 5-star distribution breakdown,  
**So that I can** make an informed and confident booking decision based on real experiences.

#### Acceptance Scenarios:
1. **Verified Badge Display:** Each review on `/locals/[slug]` displays an explicit "Verified Experience" trust badge indicating it originates from a completed booking.
2. **Rating Breakdown Histogram:** Public profile displays the percentage and count of reviews for 5, 4, 3, 2, and 1 star ratings.
3. **Privacy Protection:** Traveler names are rendered safely as First Name + Last Initial (e.g., "Sarah M.") rather than full names or emails.
4. **Moderation Filtering:** Any review with moderation status `hidden` is strictly omitted from public display and excluded from the aggregate rating.

---

### User Story 2 — Traveler Submits a Verified Review (Priority: P1)
**As a** Traveler who recently finished an experience,  
**I want to** rate and review my local guide directly from my completed booking or review center,  
**So that I can** recognize exceptional service and help fellow travelers.

#### Acceptance Scenarios:
1. **Completion Requirement:** Traveler can only submit a review if `booking.status == "completed"`.
2. **One Review per Booking:** The server enforces `booking_id` uniqueness. Attempting to submit a second review returns HTTP 409 Conflict.
3. **Real-time Recalculation:** Submitting a review immediately recalculates the Local's average rating and review count.
4. **Notification Dispatch:** The Local Partner receives an in-app notification indicating a new star rating and review.

---

### User Story 3 — Local Partner Views Feedback in Reviews Hub (Priority: P1)
**As a** verified Local Partner,  
**I want to** access a dedicated Reviews Hub in my dashboard (`/local-dashboard/reviews`),  
**So that I can** review all traveler feedback, track my overall rating breakdown, and monitor quality metrics.

#### Acceptance Scenarios:
1. **Dedicated View:** Navigation to `/local-dashboard/reviews` displays all reviews received for the Local Partner's profile.
2. **Key Performance Metrics:** Displays Average Rating, Total Reviews, Rating Distribution, and Verified Experiences count.
3. **Authorization Isolation:** Locals can only view feedback belonging to their own profile; cross-profile access returns HTTP 403.
4. **Unverified Local State:** If unverified, displays a clear prompt explaining that reviews unlock upon completing KYC verification and hosting bookings.

---

### User Story 4 — Reporting Inappropriate Reviews (Priority: P2)
**As a** Local Partner or Marketplace User,  
**I want to** report a review that contains harassment, hate speech, personally identifiable information, or fraudulent claims,  
**So that** marketplace administrators can investigate and take corrective moderation action.

#### Acceptance Scenarios:
1. **Report Submission:** Authenticated users can submit a report via `POST /api/reviews/{id}/report` specifying a reason (`spam`, `harassment`, `fraud`, `privacy`, `other`) and optional details.
2. **Duplicate Report Throttling:** Users cannot spam multiple reports on the same review.
3. **State Transition:** Reporting a review sets or flags the review for admin queue prioritization without automatically altering public display until admin review.

---

### User Story 5 — Administrator Moderates Reviews with Automated Recalculation (Priority: P1)
**As a** Marketplace Administrator,  
**I want to** inspect flagged and reported reviews, toggle visibility, and have ratings update automatically,  
**So that** marketplace integrity is maintained with zero manual rating inconsistencies.

#### Acceptance Scenarios:
1. **Moderation Queue:** `/admin/reviews` displays all reviews with traveler name, local name, rating, comment, report flags, and current status (`visible`, `flagged`, `hidden`).
2. **Action Execution:** Admin can set status to `visible`, `flagged`, or `hidden`.
3. **Atomic Rating Recomputation:** When an admin marks a review `hidden` or restores it to `visible`, `recalculate_local_rating()` is automatically triggered, ensuring public ratings and counts stay 100% accurate.
4. **Audit Trail:** Every moderation change records an entry in `AuditEvent` (`admin.review_moderation`).

---

## 4. Trust Standards & Metrics Definition

### 4.1 "Verified Booking" / "Verified Experience" Definition
A review receives the **Verified Experience** trust badge if and only if:
1. It is mapped to a non-null `Booking` record with `booking.status == "completed"`.
2. The booking payment was verified through Safepay or manual payment mode (`ensure_booking_paid_for_completion`).
3. The review author `tourist_user_id` matches `booking.tourist_user_id`.

No synthetic, unverified, or third-party imported reviews will ever receive a verified badge.

### 4.2 Rating Source of Truth & Formula
- **Formula:**
  $$\text{Rating} = \frac{\sum_{r \in \text{Visible Reviews}} \text{rating}(r)}{N_{\text{Visible Reviews}}}$$
  Rounded to 2 decimal places.
- **Hidden Reviews:** Any review where `ReviewModeration.status == "hidden"` is completely excluded from both the numerator (sum) and denominator (count).
- **Flagged Reviews:** Reviews flagged for moderation remain visible and included in rating calculations until an administrator explicitly marks them `hidden`.
- **Zero Reviews State:** If a local has 0 visible reviews, `rating = 0.0` and `review_count = 0` (rendered as `"New"` on frontend).

### 4.3 Trust Metrics surfacing
| Trust Signal | Source Entity / Field | Public Display Location | Semantic Meaning |
|---|---|---|---|
| **Verified Local** | `LocalProfile.verified == True` + KYC record | Search cards, profile header | Identity & documents verified by admin / Didit KYC |
| **Verified Experience** | `Booking.status == "completed"` | Review card on profile | Traveler actually booked, paid, and completed the trip |
| **Rating Breakdown** | Calculated distribution of active reviews | Profile reviews section | Proportions of 5★ to 1★ ratings |
| **Completed Trips** | Count of `Booking.status == 'completed'` | Profile facts chip | Actual number of completed tours conducted |
| **Years Local** | `LocalProfile.years_local` | Profile facts chip | Experience living in the destination city |

---

## 5. Technical & Data Architecture

### 5.1 Data Models

#### Existing Model: `Review`
```python
class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", unique=True, index=True)
    tourist_user_id: int = Field(foreign_key="user.id", index=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=180)
    comment: str = Field(max_length=3000)
    created_at: datetime = Field(default_factory=utcnow)
```

#### Existing Model: `ReviewModeration`
```python
class ReviewModeration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    review_id: int = Field(foreign_key="review.id", unique=True, index=True)
    status: str = Field(default="visible", index=True, max_length=30) # visible, hidden, flagged
    updated_at: datetime = Field(default_factory=utcnow)
```

#### New Model: `ReviewReport`
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

---

### 5.2 Server-Side Rating Engine Logic

```python
def recalculate_local_rating(session: Session, local_profile_id: int) -> dict:
    """
    Centralized rating and review count recalculation.
    Queries all reviews for the local profile, filters out 'hidden' moderation records,
    computes accurate average rating, count, and 1-5 star distribution,
    and commits the updated metrics to LocalProfile.
    """
    reviews = session.exec(
        select(Review).where(Review.local_profile_id == local_profile_id)
    ).all()
    
    visible_reviews = []
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    
    for r in reviews:
        mod = session.exec(select(ReviewModeration).where(ReviewModeration.review_id == r.id)).first()
        if mod and mod.status == "hidden":
            continue
        visible_reviews.append(r)
        clamped_rating = min(max(int(r.rating), 1), 5)
        distribution[clamped_rating] += 1
        
    total_count = len(visible_reviews)
    avg_rating = round(sum(r.rating for r in visible_reviews) / total_count, 2) if total_count > 0 else 0.0
    
    local = session.get(LocalProfile, local_profile_id)
    if local:
        local.rating = avg_rating
        local.review_count = total_count
        session.add(local)
        session.commit()
        session.refresh(local)
        
    return {
        "rating": avg_rating,
        "review_count": total_count,
        "distribution": distribution
    }
```

---

### 5.3 API Endpoints Specification

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/locals/{slug}` | Public | Returns profile with reviews, `rating_breakdown`, `completed_trips_count`, and verified tags |
| `POST` | `/api/traveler/reviews` | Traveler | Creates review for completed booking; recalculates local rating |
| `GET` | `/api/traveler/reviews` | Traveler | Lists reviews submitted by the authenticated traveler |
| `GET` | `/api/local/reviews` | Verified Local | Lists reviews received by the authenticated local partner + rating distribution |
| `POST` | `/api/reviews/{id}/report` | Authenticated | Reports a review with reason and details for admin moderation |
| `GET` | `/api/admin/reviews` | Admin | Lists all reviews with report counts and moderation status |
| `PATCH` | `/api/admin/reviews/{id}/moderation` | Admin | Updates moderation status (`visible`, `hidden`, `flagged`) and triggers `recalculate_local_rating` |

---

## 6. Frontend Architecture & UI Components

### 6.1 Public Local Profile (`/locals/[slug]`)
- **Rating Summary & Breakdown Block:**
  - Big rating number (e.g. `4.9 / 5.0`) with gold stars and total review count.
  - 5 horizontal progress bars showing percentage of 5★, 4★, 3★, 2★, and 1★ reviews.
- **Verified Review Cards:**
  - Traveler name: First name + Last initial (`"David K."`).
  - Trust pill: `[ ✓ Verified Experience ]`.
  - Date of review.
  - Star rating + Review Title + Review Body text.

### 6.2 Local Partner Reviews Hub (`/local-dashboard/reviews`)
- Embedded inside `LocalShell`.
- Top KPIs:
  - Overall Rating (`★ 4.9`)
  - Total Verified Reviews (`18`)
  - 5-Star Reviews Percentage (`94%`)
  - Completed Experiences (`22`)
- Rating Distribution Visualizer.
- Feed of received traveler reviews with date, booking ID reference, and `[ Report Issue ]` link.

### 6.3 Admin Reviews Moderation (`/admin/reviews`)
- Enhanced KPI blocks: Total Reviews, Average Rating, Visible Count, Flagged/Reported Count, Hidden Count.
- Table displaying Review ID, Rating, Traveler, Local, Comment, Reports Count, Status Badge.
- Actions: `[ Show / Restore ]`, `[ Flag for Review ]`, `[ Hide / Remove ]`.

---

## 7. Security, Privacy & Abuse Controls

1. **Strict Booking Verification:** No review can be created without an authentic `booking_id` with `status == "completed"` and payment settled.
2. **Immutability:** Reviews cannot be modified by users post-creation; corrections or removals must go through admin moderation.
3. **Public Privacy Protection:** Traveler email addresses and full surnames are never rendered on public endpoints.
4. **Anti-Harassment Report Throttling:** Rate-limited to max 3 reports per user per hour to prevent griefing.
5. **Full Audit Logging:** All moderation status changes record the admin user ID, timestamp, prior status, and new status in `AuditEvent`.

---

## 8. Comprehensive Acceptance Test Scenarios

1. **Scenario 1: Completed Booking Review Submission** — Traveler completes booking #1 -> Submits 5★ review -> Review created -> `LocalProfile.rating` is updated -> Local receives notification.
2. **Scenario 2: Uncompleted Booking Blocked** — Traveler attempts review on `pending` or `confirmed` booking -> Backend returns HTTP 400 Bad Request.
3. **Scenario 3: Duplicate Submission Blocked** — Traveler attempts second review on same booking -> Backend returns HTTP 409 Conflict.
4. **Scenario 4: Non-Owner Blocked** — User B attempts to review User A's booking -> Backend returns HTTP 404 Not Found.
5. **Scenario 5: Verified Experience Trust Badge** — Public profile renders `[ ✓ Verified Experience ]` for completed booking reviews.
6. **Scenario 6: 5-Star Distribution Breakdown** — Profile with 4 five-star and 1 four-star review computes `4.8` average rating, 5 total reviews, 80% 5-star, 20% 4-star.
7. **Scenario 7: Admin Moderation Hides Review** — Admin hides a 1★ malicious review -> `recalculate_local_rating()` is triggered -> Profile rating increases -> Review is omitted from `/api/locals/{slug}`.
8. **Scenario 8: Admin Restores Review** — Admin changes status back to `visible` -> `recalculate_local_rating()` recalculates and includes the review again.
9. **Scenario 9: Local Partner Reviews Hub** — Local visits `/local-dashboard/reviews` -> Views all received reviews, aggregate rating, and distribution breakdown.
10. **Scenario 10: Unauthorized Local Reviews Access** — Traveler or unrelated user attempts `GET /api/local/reviews` -> Returns HTTP 403 Forbidden.
11. **Scenario 11: Review Report Submission** — Local reports abusive review via `POST /api/reviews/{id}/report` -> `ReviewReport` record created -> Admin review queue reflects report count.
12. **Scenario 12: Audit Event Integrity** — Review moderation action creates an `AuditEvent` with actor ID and status change notes.
13. **Scenario 13: Mobile Responsiveness** — Review forms, rating breakdown bars, and review cards scale cleanly across mobile viewports.
14. **Scenario 14: Zero Fake Signals** — Local with 0 completed reviews displays `"New"` without synthetic placeholder ratings or fake badges.
