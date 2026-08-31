# Implementation Plan: SPEC-04 — Request-a-Local (Demand-Capture & Custom Matching)

**Feature ID**: `SPEC-04`  
**Specification**: [specs/004-request-a-local/spec.md](spec.md)  
**Checklist**: [specs/004-request-a-local/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Implementation Plan Draft  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Travelers, Verified Local Partners, Administrators  

---

## 1. Executive Summary & Architecture Approach

This implementation plan outlines the engineering blueprint for **Point 4: Request-a-Local**. 

Request-a-Local eliminates zero-result bounce rates on the public marketplace by capturing custom traveler demand and matching it with KYC-verified Local Partners. Verified locals submit custom price/itinerary quotes (`RequestOffer`), which the traveler compares and accepts. Upon acceptance, the backend **atomically creates a standard `Booking`** (status: `confirmed`), allowing the traveler to immediately pay via the frozen Point 3 Safepay checkout flow.

```
+---------------------------------------------------------------------------------------+
|                                    TRAVELER JOURNEY                                   |
|  1. Explore Search (0 Results) OR Direct Entry -> /request-a-local                    |
|  2. POST /api/requests -> TripRequest Created (Status: submitted)                    |
|  3. Notifications Dispatched -> Eligible Verified Locals in Destination City          |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                                 LOCAL PARTNER JOURNEY                                 |
|  4. GET /api/local/requests (Only KYC-Approved Verified Locals in City)               |
|  5. POST /api/local/requests/{id}/offers -> RequestOffer Created (Status: submitted)  |
|  6. TripRequest Status Transitions -> offers_received                                 |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                               CONVERSION & PAYMENT JOURNEY                            |
|  7. Traveler Compares Quotes on /dashboard/requests                                  |
|  8. POST /api/traveler/requests/{id}/accept/{offer_id}                                 |
|     * Atomic DB Transaction:                                                          |
|       - RequestOffer.status = accepted; other offers = declined                       |
|       - TripRequest.status = converted_to_booking                                     |
|       - Standard Booking Created (status: confirmed, subtotal, fee)                   |
|       - BookingDetail Created (meeting preferences)                                   |
|  9. Redirect -> /dashboard/bookings/{new_booking_id}                                  |
| 10. Traveler Pays via Frozen Safepay Checkout Flow (?payment=success)                 |
| 11. Booking Life Cycle Conducted -> Completion -> Review Submission                   |
+---------------------------------------------------------------------------------------+
```

---

## 2. Technical Context & Constraints

- **Backend Stack**: FastAPI (`0.128+`), Python 3.14, SQLModel / SQLAlchemy (`2.0+`), Pydantic (`2.10+`).
- **Frontend Stack**: Next.js (`16.3.0`), React (`19.2.0`), TypeScript (`5.7.0`), Vanilla CSS design tokens.
- **Database**: SQLite (`sqlite:///./hirealocals.db`) in development; PostgreSQL in production.
- **Payment Provider**: Safepay Sandbox (`safepay_sandbox` / `manual`) strictly. **No Stripe.**
- **Trust Single Source of Truth**: `LocalProfile.verified == True` and approved KYC records via `local_kyc_approved()`.
- **Zero Redesign Principle**: Point 1 (KYC & Trust), Point 2 (Local Workspace), and Point 3 (Traveler Flow & Safepay) remain frozen and untouched.

---

## 3. Inventory & Delta Analysis

### A. Existing & Reusable Infrastructure (Zero Changes Needed)
1. **`Booking` & `BookingDetail` Models:** Converted custom requests directly populate standard `Booking` records.
2. **Safepay Checkout Pipeline (`backend/app/payments.py`):** Reused without modification for all converted bookings.
3. **Notification Engine (`Notification` & `EmailOutbox`):** Reused for sending opportunity alerts and quote updates.
4. **Messaging Architecture (`Message`):** Automatically available once a request converts to a `Booking`.
5. **Auth & Role Guards (`current_user`, `admin_user`, `require_traveler`, `require_local_profile`):** Standardized RBAC.

### B. New Tables & Schemas Needed
1. **`TripRequest` (SQLModel Table):** Structured traveler trip request.
2. **`RequestOffer` (SQLModel Table):** Local partner quote/proposal.
3. **Pydantic Schemas (`backend/app/schemas.py`):** `TripRequestInput`, `RequestOfferInput`, `TripRequestRead`, `RequestOfferRead`.

### C. New Backend Endpoints Needed (`backend/app/main.py`)
1. `POST /api/requests`: Traveler submits custom request.
2. `GET /api/traveler/requests`: Traveler retrieves their custom requests and received offers.
3. `GET /api/traveler/requests/{id}`: Traveler retrieves single request detail with offers.
4. `PATCH /api/traveler/requests/{id}/cancel`: Traveler cancels an open request.
5. `GET /api/local/requests`: Verified local partner retrieves open opportunities in their city.
6. `GET /api/local/requests/{id}`: Verified local partner views request requirements.
7. `POST /api/local/requests/{id}/offers`: Verified local partner submits a quote.
8. `PATCH /api/local/offers/{offer_id}/withdraw`: Local partner withdraws their quote before acceptance.
9. `POST /api/traveler/requests/{id}/accept/{offer_id}`: Traveler accepts quote -> Atomic booking conversion.
10. `GET /api/admin/requests`: Admin lists all marketplace requests with filters.
11. `POST /api/admin/requests/{id}/notify-locals`: Admin dispatches broadcast notification to candidate locals.

### D. New & Modified Frontend Views Needed
1. `frontend/app/request-a-local/page.tsx` [NEW]: Public custom request intake form.
2. `frontend/components/ExploreClient.tsx` [MODIFY]: Upgrade zero-result state to display Request-a-Local bridge CTA.
3. `frontend/app/dashboard/requests/page.tsx` [NEW]: Traveler request center & quote comparison view.
4. `frontend/app/local-dashboard/opportunities/page.tsx` [NEW]: Local partner opportunities feed & quote submission modal.
5. `frontend/app/admin/requests/page.tsx` [NEW]: Admin request oversight and local partner matching dashboard.
6. `frontend/components/Navbar.tsx` or Header navigation: Add direct link to Request a Local.

---

## 4. Data Architecture & Schema Design

### 4.1 `TripRequest` Schema ([`backend/app/models.py`](file:///c:/laragon/www/hirealocals/backend/app/models.py))

```python
class TripRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tourist_user_id: int = Field(foreign_key="user.id", index=True)
    
    # Destination & Location
    country_code: str = Field(index=True, max_length=2)
    city_name: str = Field(index=True, max_length=120)
    city_slug: str = Field(index=True, max_length=120)
    
    # Timing & Duration
    booking_date: str = Field(index=True, max_length=20)  # YYYY-MM-DD
    flexible_dates: bool = Field(default=False)
    date_end: Optional[str] = Field(default=None, max_length=20)
    preferred_time: str = Field(default="morning", max_length=30)
    duration_hours: float = Field(default=3.0)
    
    # Party & Requirements
    guests: int = Field(default=1)
    category: str = Field(default="Custom Experience", index=True, max_length=80)
    title: str = Field(default="", max_length=180)
    description: str = Field(max_length=4000)
    interests: str = Field(default="", max_length=500)
    language_preference: str = Field(default="English", max_length=120)
    
    # Budget
    budget_amount: Optional[float] = Field(default=None)
    budget_currency: str = Field(default="USD", max_length=8)
    
    # Logistics
    special_requirements: str = Field(default="", max_length=2000)
    meeting_preference: str = Field(default="", max_length=300)
    
    # State & Conversion
    status: str = Field(default="submitted", index=True, max_length=30)
    # Statuses: submitted | matching | offers_received | converted_to_booking | cancelled | expired
    selected_offer_id: Optional[int] = Field(default=None, index=True)
    converted_booking_id: Optional[int] = Field(default=None, foreign_key="booking.id", index=True)
    
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
```

### 4.2 `RequestOffer` Schema ([`backend/app/models.py`](file:///c:/laragon/www/hirealocals/backend/app/models.py))

```python
class RequestOffer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_request_id: int = Field(foreign_key="triprequest.id", index=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    
    offered_price: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=8)
    duration_hours: float = Field(default=3.0)
    proposed_start_time: str = Field(default="10:00", max_length=10)
    proposal_message: str = Field(max_length=4000)
    inclusions: str = Field(default="", max_length=1000)
    
    status: str = Field(default="submitted", index=True, max_length=30)
    # Statuses: submitted | accepted | declined | withdrawn | expired
    
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
```

---

## 5. Backend API Endpoints & Authorization Details

| Endpoint | Method | Role Required | Guard / Authorization | Key Side Effects |
|---|---|---|---|---|
| `/api/requests` | `POST` | `tourist`, `admin` | User must have tourist role; accepts policy | Creates `TripRequest` (status: `submitted`), logs audit, notifies matching locals |
| `/api/traveler/requests` | `GET` | `tourist` | `tourist_user_id == current_user.id` | Returns traveler's requests with offer count and status |
| `/api/traveler/requests/{id}` | `GET` | `tourist` | `tourist_user_id == current_user.id` | Returns single request with all received `RequestOffer` items and local profiles |
| `/api/traveler/requests/{id}/cancel` | `PATCH` | `tourist` | `tourist_user_id == current_user.id`; status != `converted_to_booking` | Sets request to `cancelled`, declines open offers |
| `/api/local/requests` | `GET` | `local` | `local.verified == True` & KYC approved | Returns open requests in Local's registered city |
| `/api/local/requests/{id}` | `GET` | `local` | `local.verified == True` & in same city | Returns request requirements and Local's submitted offer (if any) |
| `/api/local/requests/{id}/offers` | `POST` | `local` | `local.verified == True` & in same city; 1 offer per local | Creates `RequestOffer` (status: `submitted`), sets request status to `offers_received`, notifies traveler |
| `/api/local/offers/{offer_id}/withdraw` | `PATCH` | `local` | `offer.local_profile_id == local.id`; status == `submitted` | Sets offer to `withdrawn` |
| `/api/traveler/requests/{id}/accept/{offer_id}` | `POST` | `tourist` | `tourist_user_id == current_user.id`; offer.status == `submitted` | **Atomic Conversion:** Creates `Booking` (status: `confirmed`), creates `BookingDetail`, marks offer `accepted`, declines competing offers, marks request `converted_to_booking` |
| `/api/admin/requests` | `GET` | `admin` | `user.role == "admin"` | Returns all marketplace requests with city facets and status filter |
| `/api/admin/requests/{id}/notify-locals` | `POST` | `admin` | `user.role == "admin"` | Dispatches broadcast notification to all verified locals in destination city |

---

## 6. Atomic Request → Booking Conversion Logic

```python
def convert_offer_to_booking(
    session: Session,
    request: TripRequest,
    offer: RequestOffer,
    traveler: User,
    request_obj: Request
) -> Booking:
    # 1. State integrity check
    if request.status == "converted_to_booking" or request.converted_booking_id:
        raise HTTPException(409, "This request has already been converted to a booking")
    if offer.status != "submitted":
        raise HTTPException(409, f"Offer cannot be accepted in status '{offer.status}'")
    
    # 2. Update offer statuses
    offer.status = "accepted"
    offer.updated_at = utcnow()
    session.add(offer)
    
    competing = session.exec(
        select(RequestOffer).where(
            RequestOffer.trip_request_id == request.id,
            RequestOffer.id != offer.id,
            RequestOffer.status == "submitted"
        )
    ).all()
    for other in competing:
        other.status = "declined"
        other.updated_at = utcnow()
        session.add(other)
    
    # 3. Create standard Booking
    subtotal = round(offer.offered_price, 2)
    fee_percent = float(get_setting(session, "platform_fee_percent") or "12")
    platform_fee = round(subtotal * (fee_percent / 100), 2)
    
    booking = Booking(
        tourist_user_id=traveler.id,
        local_profile_id=offer.local_profile_id,
        service_id=None,
        booking_date=request.booking_date,
        start_time=offer.proposed_start_time,
        guests=request.guests,
        hours=offer.duration_hours,
        message=f"Custom Request: {request.title or request.category}\n\n{request.description}\n\nLocal Offer Proposal:\n{offer.proposal_message}",
        subtotal=subtotal,
        platform_fee=platform_fee,
        status="confirmed",
    )
    session.add(booking)
    session.flush()  # Populates booking.id
    
    # 4. Attach location metadata & audit timeline
    detail = BookingDetail(
        booking_id=booking.id,
        meeting_point_name=request.meeting_preference or "Agreed with Local",
        meeting_address=request.city_name,
        meeting_instructions=request.special_requirements,
        updated_by_user_id=traveler.id,
    )
    session.add(detail)
    log_booking_event(session, booking, traveler.id, "requested", "", "confirmed", f"Converted from Custom Request #{request.id} (Offer #{offer.id})")
    
    # 5. Link TripRequest
    request.status = "converted_to_booking"
    request.selected_offer_id = offer.id
    request.converted_booking_id = booking.id
    request.updated_at = utcnow()
    session.add(request)
    
    # 6. Commit & Notify
    session.commit()
    session.refresh(booking)
    
    local = session.get(LocalProfile, offer.local_profile_id)
    if local and local.user_id:
        add_notification(session, local.user_id, "offer_accepted", f"Your quote was accepted! (Booking #{booking.id})", f"{traveler.full_name} accepted your quote for {booking.booking_date}.", f"/local-dashboard/bookings", email=True)
    
    audit_event(session, traveler.id, "request.converted", "trip_request", request.id, f"Accepted offer #{offer.id} -> Booking #{booking.id}", request_obj)
    return booking
```

---

## 7. Frontend User Experience & Routing

### 7.1 Zero-Result Search Integration ([`frontend/components/ExploreClient.tsx`](file:///c:/laragon/www/hirealocals/frontend/components/ExploreClient.tsx))
When `!loading && !error && !items.length`:
- Render `.explore-request-bridge-card`:
  - Title: *"Can't find the right local in {city || 'your destination'}?"*
  - Subtitle: *"Tell us what you need and verified local partners will send you tailored quotes."*
  - CTA Button: `<Link href={buildRequestUrl()}>Request a Local in {city} &rarr;</Link>`

### 7.2 Public Request Intake ([`frontend/app/request-a-local/page.tsx`](file:///c:/laragon/www/hirealocals/frontend/app/request-a-local/page.tsx))
- Header & value proposition (*"Describe your perfect trip, receive custom proposals from verified locals, pay securely."*).
- Interactive multi-field form:
  - Destination City & Country
  - Date & Preferred Time of Day (Morning / Afternoon / Evening / Flexible)
  - Duration (hours) & Group Size (Guests)
  - Experience Category & Custom Trip Title
  - Detailed Description / Itinerary Wishlist
  - Target Budget & Currency
  - Special Requirements / Accessibility
- Submit Action: calls `POST /api/requests` -> redirects to `/dashboard/requests`.

### 7.3 Traveler Request Center ([`frontend/app/dashboard/requests/page.tsx`](file:///c:/laragon/www/hirealocals/frontend/app/dashboard/requests/page.tsx))
- Tabbed/Grid view of traveler requests (`Active Requests`, `Past / Converted`).
- For each request:
  - Summary card with destination, date, budget, and status badge (`Submitted`, `Matching`, `Offers Received`, `Converted`).
  - Expanding offer comparison drawer/list:
    - Quoting Local Partner card: Avatar, verified badge, rating, response time, offered total price, proposed start time, and proposal note.
    - Action button: `[ Accept Offer ($X) ]` -> Triggers conversion -> Routes to `/dashboard/bookings/{id}`.

### 7.4 Local Partner Opportunities ([`frontend/app/local-dashboard/opportunities/page.tsx`](file:///c:/laragon/www/hirealocals/frontend/app/local-dashboard/opportunities/page.tsx))
- Mounted seamlessly in Local Workspace under `/local-dashboard/opportunities`.
- Filtered by Local's verified city.
- Opportunity Card: Traveler's destination, date, group size, duration, budget target, description, and special requirements.
- Submit Quote Button -> Opens Quote Sheet / Modal (`offered_price`, `proposed_start_time`, `proposal_message`, `inclusions`).
- Submitted quotes badge shows `Quote Sent ($X)` with status.

### 7.5 Admin Request Manager ([`frontend/app/admin/requests/page.tsx`](file:///c:/laragon/www/hirealocals/frontend/app/admin/requests/page.tsx))
- Admin table: Request ID, Traveler, City, Date, Guests, Budget, Status, Offers Count, Created Date, Actions.
- Request Detail Drawer: View traveler notes, candidate verified locals in that city, and trigger notification dispatch.

---

## 8. Safe Database Migration Strategy

1. **Non-Destructive Additions:** `TripRequest` and `RequestOffer` are completely new tables. No existing table schemas or column definitions are altered.
2. **Engine Initialization:** New models will be registered in `backend/app/models.py` and created automatically on startup via `SQLModel.metadata.create_all(engine)`.
3. **Foreign Key Integrity:** Foreign keys link to existing `user.id`, `localprofile.id`, and `booking.id` tables without altering primary keys or indices.

---

## 9. Test & Verification Strategy

An automated, standalone end-to-end regression script (`backend/scripts/test_point4_e2e.py`) will validate the complete lifecycle:

```
[ TEST 1 ] Traveler submits request with city, date, guests, budget, and description.
[ TEST 2 ] Unverified Local querying opportunities receives HTTP 403 Forbidden.
[ TEST 3 ] Verified Local in matching city queries opportunities and receives open request.
[ TEST 4 ] Verified Local submits custom quote (RequestOffer created with status 'submitted').
[ TEST 5 ] Competing Local in same city submits a second quote on the same request.
[ TEST 6 ] Duplicate quote attempt by same Local returns HTTP 409 Conflict.
[ TEST 7 ] Traveler retrieves request and compares received quotes.
[ TEST 8 ] Traveler accepts first quote -> Atomic conversion creates standard Booking (#id).
[ TEST 9 ] Competing quote transitions to 'declined'.
[ TEST 10] TripRequest transitions to 'converted_to_booking' with booking ID populated.
[ TEST 11] Duplicate acceptance attempt returns HTTP 409 Conflict.
[ TEST 12] Traveler initiates Safepay checkout on converted Booking (#id) -> checkout URL returns.
[ TEST 13] Payment status reconciles to 'paid' on return route.
[ TEST 14] Local marks completed -> Traveler submits review -> Review appears on Local profile.
```

---

## 10. Implementation Sequence (Dependency Order)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ P0: DATA ARCHITECTURE & CORE BACKEND APIS                                   │
│ 1. Add TripRequest and RequestOffer models to backend/app/models.py         │
│ 2. Add Pydantic schemas to backend/app/schemas.py                           │
│ 3. Implement traveler intake & list endpoints in backend/app/main.py        │
│ 4. Implement local partner opportunities & quote endpoints in main.py       │
│ 5. Implement atomic convert_offer_to_booking endpoint in main.py            │
│ 6. Implement admin oversight endpoints in main.py                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ P1: TRAVELER INTAKE & ZERO-RESULT BRIDGE                                    │
│ 1. Create public /request-a-local page with pre-fill support                │
│ 2. Upgrade ExploreClient.tsx zero-results view with Request CTA             │
│ 3. Create /dashboard/requests view with quote comparison & acceptance UI     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ P2: LOCAL PARTNER OPPORTUNITIES & ADMIN PANEL                               │
│ 1. Create /local-dashboard/opportunities view for verified locals           │
│ 2. Create quote submission modal / drawer                                   │
│ 3. Create /admin/requests management dashboard                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ P3: AUTOMATED REGRESSION & POINT 4 FREEZE                                   │
│ 1. Run backend/scripts/test_point4_e2e.py (All 14 steps pass)                │
│ 2. Run SPEC-01 KYC regression suite (12/12 pass)                            │
│ 3. Run frontend TypeScript typecheck (0 errors)                             │
│ 4. Declare POINT 4: COMPLETE & FROZEN                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Protected Files & Risk Mitigation

- **Protected (DO NOT MODIFY):**
  - `backend/app/didit_kyc.py` (Frozen KYC implementation)
  - `backend/app/payments.py` (Frozen Safepay checkout & webhooks)
  - `frontend/components/LocalShell.tsx` (Frozen Local Workspace)
  - `frontend/components/TravelerShell.tsx` (Frozen Traveler Workspace)
- **Files Modified/Created in Point 4:**
  - `backend/app/models.py` (Add `TripRequest`, `RequestOffer`)
  - `backend/app/schemas.py` (Add request & offer DTOs)
  - `backend/app/main.py` (Add `/api/requests/*`, `/api/traveler/requests/*`, `/api/local/requests/*`, `/api/admin/requests/*`)
  - `frontend/components/ExploreClient.tsx` (Add zero-result bridge CTA)
  - `frontend/app/request-a-local/page.tsx` [NEW]
  - `frontend/app/dashboard/requests/page.tsx` [NEW]
  - `frontend/app/local-dashboard/opportunities/page.tsx` [NEW]
  - `frontend/app/admin/requests/page.tsx` [NEW]
  - `frontend/app/globals.css` (Add scoped styles for request intake & quote comparison cards)

---

*This implementation plan is grounded, risk-mitigated, and ready for task generation.*
