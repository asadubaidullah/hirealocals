# Feature Specification: SPEC-04 — Request-a-Local (Demand-Capture & Custom Matching)

**Feature ID**: `SPEC-04`  
**Feature Branch**: `master`  
**Created**: 2026-08-31  
**Status**: Specification Complete / Ready for Planning  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Travelers (Tourists), Verified Local Partners, Marketplace Administrators  
**Dependencies**: Point 1 (KYC & Trust), Point 2 (Local Workspace), Point 3 (Traveler Flow & Safepay)  

---

## 1. Executive Summary & Business Objective

In a peer-to-peer travel marketplace, search queries that yield zero direct results or where travelers have unique custom itineraries frequently cause bounce and abandonment. 

**Request-a-Local** converts unmet marketplace demand into a high-intent structured traveler request instead of a dead-end zero-results page.

### Core Marketplace Flow:
```
Traveler searches / explores
  │
  ▼ [No exact Local match or custom requirements]
Request-a-Local Intake (/request-a-local)
  │ (Preserves search context: City, Category, Date, Guests)
  ▼
Request Submitted & Dispatched to Eligible Verified Locals
  │ (Only KYC-approved Verified Locals in destination city)
  ▼
Local Partners Review Requirements & Submit Custom Quotes (RequestOffer)
  │ (All-inclusive price, custom itinerary note, proposed start time)
  ▼
Traveler Compares Incoming Offers in Dashboard (/dashboard/requests)
  │
  ▼
Traveler Accepts Best Offer
  │
  ▼ [Server-Side Conversion Engine]
Standard Booking Created (Status: Confirmed)
  │
  ▼
Standard Safepay Checkout (/dashboard/bookings/[id]?payment=success)
  │
  ▼
Normal Booking Lifecycle Conducted & Completed → Review Submission
```

### Architectural Guarantees:
1. **Zero Parallel Payment System:** Once a quote is accepted, it converts directly into a standard `Booking` entity and seamlessly leverages the frozen Point 3 Safepay checkout flow and payment reconciliation.
2. **Single Source of Truth for Partner Trust:** Only Local Partners with `LocalProfile.verified == True` and approved KYC are authorized to view custom opportunities and submit offers.
3. **No Marketplace Activity Fabrication:** Real verified locals, real traveler requirements, and real server-side state transitions only.

---

## 2. User Stories & Acceptance Scenarios

### User Story 1 — Traveler Submits a Custom Local Request (Priority: P1)

As a Traveler visiting a destination where I cannot find an exact listing match or have custom trip needs,  
I want to submit a structured "Request a Local" form with my travel dates, destination, duration, group size, interests, and budget,  
So that verified local guides in that city can send me tailored offers.

**Why this priority**: Solves marketplace liquidity leakage by capturing unmet demand at the point of search friction.

**Independent Test**:
A traveler searches for a city on `/explore` with zero matches, clicks "Request a Local", sees their city and filters pre-filled, enters trip description, duration, and budget, and submits the request. The request appears in their `/dashboard/requests` view with status `submitted`.

**Acceptance Scenarios**:
1. **Given** a visitor or authenticated traveler on `/request-a-local` (or navigating from Explore zero-results), **When** the page loads, **Then** query parameters (`city`, `category`, `date`, `guests`) are pre-populated into the form.
2. **Given** the request intake form, **When** submitting, **Then** the client validates required fields: destination city, travel date (or date range), estimated duration (hours), guest count (≥1), trip category, description (min 20 characters), and budget target.
3. **Given** an unauthenticated visitor submitting a request, **When** clicking "Submit request", **Then** the system prompts authentication (`/login?next=/request-a-local` or quick registration) and safely preserves the draft request.
4. **Given** an authenticated traveler, **When** `POST /api/requests` succeeds, **Then** a `TripRequest` is created with status `submitted`, an audit log event is recorded, and the traveler is redirected to `/dashboard/requests` with a confirmation toast.

---

### User Story 2 — Verified Local Partner Reviews Opportunities & Submits Quotes (Priority: P1)

As a KYC-verified Local Partner,  
I want to view open traveler requests in my city, understand their specific interests and schedule, and submit a tailored quote with my proposed price and notes,  
So that I can win custom booking opportunities and grow my earnings.

**Why this priority**: Supplies marketplace liquidity by activating verified local partners to fulfill custom demand.

**Independent Test**:
A verified Local in London logs into `/local-dashboard/opportunities` (or `/local-dashboard/requests`), sees an open traveler request for London, inputs an offer of $150 with customized highlights, and submits. The offer is linked to the request and marked `submitted`.

**Acceptance Scenarios**:
1. **Given** a Local Partner logged in, **When** accessing `/api/local/requests`, **Then** the backend verifies `LocalProfile.verified == True` and KYC approval. Unverified or unapproved partners receive `403 Forbidden`.
2. **Given** an eligible Local, **When** viewing opportunities, **Then** only open requests matching the Local's city/country (status `submitted`, `matching`, or `offers_received`) are returned.
3. **Given** an open opportunity, **When** the Local submits a quote (`POST /api/local/requests/{id}/offers`), **Then** the payload requires `offered_price > 0`, `proposed_start_time`, and a personalized proposal message.
4. **Given** a successful offer submission, **When** committed, **Then** the offer status is set to `submitted`, the parent `TripRequest` status updates to `offers_received`, and a notification (`Notification` + `EmailOutbox`) is dispatched to the traveler.
5. **Given** a Local who has already submitted an active offer on a request, **When** attempting to submit a duplicate offer, **Then** the backend rejects the request with `409 Conflict`.

---

### User Story 3 — Traveler Compares and Accepts a Quote → Booking Conversion (Priority: P1)

As a Traveler with received quotes,  
I want to compare the incoming offers from verified locals (profiles, ratings, pricing, personalized messages), and accept my preferred local,  
So that a confirmed booking is immediately created and I can pay securely via Safepay.

**Why this priority**: Bridges demand capture back into the core monetization and fulfillment pipeline.

**Independent Test**:
A traveler reviews 2 offers on `/dashboard/requests`, clicks "Accept offer" on the chosen Local's quote. The system updates the offer to `accepted`, marks the request `converted_to_booking`, declines competing offers, creates a `Booking` entity, and redirects the traveler directly to `/dashboard/bookings/{new_booking_id}` for payment.

**Acceptance Scenarios**:
1. **Given** a Traveler on `/dashboard/requests`, **When** viewing a request, **Then** they see all received `RequestOffer` items with the Local's avatar, verified badge, rating, hourly rate, offered total price, proposed itinerary notes, and proposed time.
2. **Given** an offer with status `submitted`, **When** the Traveler clicks "Accept offer" (`POST /api/traveler/requests/{id}/accept/{offer_id}`), **Then** the backend verifies Traveler ownership (`tourist_user_id == user.id`).
3. **Given** a valid acceptance, **When** processed atomically in a transaction:
   - The accepted `RequestOffer.status` becomes `accepted`.
   - All other competing offers on that request become `declined`.
   - `TripRequest.status` becomes `converted_to_booking` with `selected_offer_id` and `converted_booking_id` populated.
   - A new standard `Booking` is created with `tourist_user_id`, `local_profile_id`, `booking_date`, `start_time`, `hours`, `guests`, `subtotal = offer.offered_price`, `platform_fee = subtotal * fee_percent`, and status `confirmed`.
   - A `BookingDetail` is created attaching the traveler's meeting preferences.
   - Notifications are sent to the accepted Local and the Traveler.
4. **Given** a completed conversion, **When** the response returns, **Then** the traveler is routed to `/dashboard/bookings/{booking_id}` where Safepay checkout is immediately available.

---

### User Story 4 — Administrator Oversees and Dispatches Custom Requests (Priority: P2)

As a Marketplace Administrator,  
I want a centralized view of all custom traveler requests, their fulfillment status, eligible candidate locals, and conversion metrics,  
So that I can manually assist high-value requests, ensure prompt partner response, and monitor market demand.

**Why this priority**: Operational supervision and quality assurance for custom marketplace transactions.

**Independent Test**:
An administrator navigates to `/admin/requests`, filters by city or status, inspects traveler requirements, views verified locals in that city, and can trigger broadcast notifications to eligible candidate partners.

**Acceptance Scenarios**:
1. **Given** an admin on `/admin/requests`, **When** viewing the list, **Then** each request displays traveler name, destination city, travel date, guests, budget, status, offer count, and conversion state.
2. **Given** a request with status `submitted`, **When** an admin views detail, **Then** the UI shows a list of active verified Local Partners in that city with their response times and verification badges.
3. **Given** an admin clicking "Notify eligible locals" (`POST /api/admin/requests/{id}/notify-locals`), **Then** notifications are dispatched to verified locals in that city, updating request status to `matching`.

---

## 3. Data Models & Schemas

### 3.1 `TripRequest` (SQLModel Entity)

Represents a traveler's custom demand record.

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
    date_end: Optional[str] = Field(default=None, max_length=20)  # For date ranges
    preferred_time: str = Field(default="morning", max_length=30)  # morning, afternoon, evening, exact time
    duration_hours: float = Field(default=3.0)
    
    # Party & Requirements
    guests: int = Field(default=1)
    category: str = Field(default="Custom Experience", index=True, max_length=80)
    title: str = Field(default="", max_length=180)
    description: str = Field(max_length=4000)
    interests: str = Field(default="", max_length=500)  # Comma-separated tags
    language_preference: str = Field(default="English", max_length=120)
    
    # Budget & Pricing
    budget_amount: Optional[float] = Field(default=None)
    budget_currency: str = Field(default="USD", max_length=8)
    
    # Meeting & Special Needs
    special_requirements: str = Field(default="", max_length=2000)
    meeting_preference: str = Field(default="", max_length=300)
    
    # Lifecycle & Conversion State
    status: str = Field(default="submitted", index=True, max_length=30)
    selected_offer_id: Optional[int] = Field(default=None, index=True)
    converted_booking_id: Optional[int] = Field(default=None, foreign_key="booking.id", index=True)
    
    # Timestamps
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
```

### 3.2 `RequestOffer` (SQLModel Entity)

Represents a verified local partner's proposal/quote on a specific `TripRequest`.

```python
class RequestOffer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    trip_request_id: int = Field(foreign_key="triprequest.id", index=True)
    local_profile_id: int = Field(foreign_key="localprofile.id", index=True)
    
    # Quote Proposal Details
    offered_price: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=8)
    duration_hours: float = Field(default=3.0)
    proposed_start_time: str = Field(default="10:00", max_length=10)
    proposal_message: str = Field(max_length=4000)
    inclusions: str = Field(default="", max_length=1000)
    
    # Status
    status: str = Field(default="submitted", index=True, max_length=30)
    # Status values: submitted | accepted | declined | withdrawn | expired
    
    # Timestamps
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
```

---

## 4. State Machines & Transitions

### 4.1 `TripRequest` Lifecycle State Machine

```
                   ┌─────────────┐
                   │    draft    │ (Client-side / Unsaved)
                   └──────┬──────┘
                          │ Submit (POST /api/requests)
                          ▼
                   ┌─────────────┐
                   │  submitted  │
                   └──────┬──────┘
                          │ Admin/System Notify (Matching initiated)
                          ▼
                   ┌─────────────┐
                   │  matching   │
                   └──────┬──────┘
                          │ Local submits Quote
                          ▼
                   ┌─────────────────┐
    ┌─────────────►│ offers_received │◄────────────┐ (Subsequent offers)
    │              └──────┬──────────┘             │
    │                     │ Traveler accepts offer │
    │                     ▼                        │
    │              ┌──────────────────────┐        │
    │              │ converted_to_booking │        │
    │              └──────────────────────┘        │
    │                                              │
    │ (Cancel / Expire)                            │ (Withdraw)
    ▼                                              ▼
┌───────────┐                              ┌───────────┐
│ cancelled │                              │  expired  │
└───────────┘                              └───────────┘
```

#### Valid Transitions & Rules:
- `draft` → `submitted`: Authenticated traveler creates request.
- `submitted` → `matching`: Notification dispatched to eligible verified locals.
- `submitted` / `matching` → `offers_received`: First valid local quote submitted.
- `offers_received` → `converted_to_booking`: Traveler accepts a specific quote.
- `submitted` / `matching` / `offers_received` → `cancelled`: Traveler cancels open request before accepting.
- `submitted` / `matching` / `offers_received` → `expired`: Request passes `expires_at` (e.g. travel date passes) without an accepted offer.

### 4.2 `RequestOffer` Lifecycle State Machine

- `submitted`: Local partner creates and sends quote.
- `accepted`: Traveler accepts this specific quote (triggers booking conversion).
- `declined`: Competing offer automatically declined upon another offer's acceptance, or traveler explicitly passes.
- `withdrawn`: Local partner rescinds quote prior to acceptance.
- `expired`: Parent `TripRequest` expires or is cancelled.

---

## 5. Zero-Result & Liquidity Bridge Specification

When a traveler performs a search on `/explore` that returns zero results (`items.length === 0`), the UI transitions from a passive empty state to an active demand-capture bridge.

### UI / UX Behavior:
1. **Prominent Card Placement:** Replaces generic empty box with an attractive, conversion-oriented card:
   - **Headline:** *"No exact match in [City] yet? We'll find one for you."*
   - **Body:** *"Tell us your dates, group size and what you want to experience. Verified local experts in [City] will send tailored offers directly to your dashboard."*
   - **CTA Button:** `[ Request a Local in {City} → ]`
2. **Context Preservation (URL Query Parameters):**
   - The CTA links to `/request-a-local?city={city}&category={category}&date={date}&guests={guests}&max_rate={maxRate}`.
   - The `/request-a-local` page automatically initializes its form fields using these parameters, eliminating redundant data entry for the traveler.

---

## 6. Eligibility, Trust & Authorization Matrix

| Action | Traveler (Owner) | Verified Local | Unverified Local | Admin | Unauthenticated Visitor |
|---|---|---|---|---|---|
| View public `/request-a-local` form | Yes | Yes | Yes | Yes | Yes |
| Submit `POST /api/requests` | Yes | No (requires traveler role) | No | Yes | Redirect to Auth |
| View own requests `/api/traveler/requests` | Yes | No | No | Yes | No (401) |
| View open city opportunities `/api/local/requests` | No | **Yes (in local's city)** | **No (403)** | Yes | No (401) |
| Submit quote `/api/local/requests/{id}/offers` | No | **Yes (if KYC approved)** | **No (403)** | No | No (401) |
| Accept quote `/api/traveler/requests/{id}/accept/{offer_id}` | **Yes (owner only)** | No | No | No | No (401) |
| Admin manage `/api/admin/requests` | No | No | No | **Yes** | No (401/403) |

---

## 7. Request → Booking Conversion Engine

When a traveler calls `POST /api/traveler/requests/{id}/accept/{offer_id}`:

1. **Atomic Transaction:**
   ```python
   # 1. Validate ownership & state
   assert request.tourist_user_id == current_user.id
   assert request.status in {"submitted", "matching", "offers_received"}
   assert offer.trip_request_id == request.id
   assert offer.status == "submitted"

   # 2. Update offer states
   offer.status = "accepted"
   for other in competing_offers:
       other.status = "declined"

   # 3. Create Booking entity
   subtotal = round(offer.offered_price, 2)
   fee_percent = float(get_setting(session, "platform_fee_percent") or "12")
   platform_fee = round(subtotal * (fee_percent / 100), 2)

   booking = Booking(
       tourist_user_id=request.tourist_user_id,
       local_profile_id=offer.local_profile_id,
       service_id=None,  # Custom quote booking
       booking_date=request.booking_date,
       start_time=offer.proposed_start_time,
       guests=request.guests,
       hours=offer.duration_hours,
       message=f"Custom Request: {request.title}\n\n{request.description}\n\nLocal Proposal:\n{offer.proposal_message}",
       subtotal=subtotal,
       platform_fee=platform_fee,
       status="confirmed",  # Ready for immediate checkout
   )
   session.add(booking)
   session.flush()

   # 4. Create BookingDetail & Timeline
   detail = BookingDetail(
       booking_id=booking.id,
       meeting_point_name=request.meeting_preference or "To be agreed with local",
       meeting_address=request.city_name,
       meeting_instructions=request.special_requirements,
       updated_by_user_id=current_user.id,
   )
   session.add(detail)
   log_booking_event(session, booking, current_user.id, "requested", "", "confirmed", f"Converted from Custom Request #{request.id}")

   # 5. Link TripRequest
   request.status = "converted_to_booking"
   request.selected_offer_id = offer.id
   request.converted_booking_id = booking.id
   ```
2. **Post-Conversion Navigation:**
   - The API returns `{"ok": True, "booking_id": booking.id, "redirect_url": f"/dashboard/bookings/{booking.id}"}`.
   - The frontend routes directly to the booking detail page where the traveler completes payment using the frozen Safepay checkout flow.

---

## 8. Notifications & Messaging Architecture

No duplicate messaging or notification systems are introduced. Existing modules are extended:

1. **New Notification Kinds:**
   - `request_received`: Traveler notified that their request was received.
   - `opportunity_new`: Verified Locals in destination city notified of a matching custom request.
   - `offer_received`: Traveler notified that a Local submitted a quote on their request.
   - `offer_accepted`: Local partner notified that their quote was accepted and converted to Booking `#id`.
   - `offer_declined`: Local partner notified that the traveler chose another quote.
2. **Messaging:**
   - Once converted to a `Booking`, the existing booking conversation thread (`/dashboard/messages?booking={id}`) immediately activates for coordination.

---

## 9. Analytics & Operational Metrics

The following metrics are derived cleanly from `TripRequest` and `RequestOffer` tables:
- **Unmet Demand Volume:** Total requests by city, country, and category.
- **Liquidity Response Rate:** Percentage of requests receiving ≥1 quote within 24 hours.
- **Average Offer Turnaround:** Time between `TripRequest.created_at` and first `RequestOffer.created_at`.
- **Conversion Rate:** `(Converted Requests / Total Submitted Requests) * 100`.
- **Budget vs. Price Variance:** Difference between traveler `budget_amount` and average `offered_price`.

---

## 10. Edge Cases & Failure Modes

1. **No Verified Locals in Requested City:**
   - Request enters `submitted` / `matching`. Admin is notified in `/admin/requests` to recruit or manually recommend partner locals in nearby regions.
2. **Travel Date Passes Without Offers:**
   - When `current_utc_date > booking_date` and status is not `converted_to_booking`, status updates to `expired`.
3. **Local Partner Becomes Unverified Before Quote Acceptance:**
   - If `LocalProfile.verified` is revoked, their pending `submitted` offers are automatically marked `withdrawn`.
4. **Duplicate Acceptance Attempt (Race Condition):**
   - Server-side transaction checks `request.status != "converted_to_booking"`. If already converted, returns `409 Conflict: This request has already been accepted and converted`.
5. **Traveler Cancels Request After Quotes Received:**
   - Request status set to `cancelled`; all open offers transitioned to `declined` with notification to quoting locals.
6. **Conflicting Schedule on Converted Time Slot:**
   - If the Local has conflicting bookings during acceptance, standard validation warns or traveler coordinates alternate time slot via booking timeline.

---

## 11. Explicit Non-Goals

- **NO AI or Algorithmic Auto-Matching:** Manual local response and transparent quote comparison only.
- **NO Second Payment System:** Strict reuse of Safepay checkout.
- **NO Second Verification System:** Strict reuse of KYC single source of truth.
- **NO Overhaul of Local Workspace:** Opportunity list integrated cleanly without modifying frozen Point 2 components.
- **NO Fake Marketplace Activity:** Zero simulated quotes or artificial requests.

---

## 12. Acceptance Test Matrix (12 Scenarios)

| # | Scenario | Expected Outcome |
|---|---|---|
| 1 | Explore zero-result search | Renders "Request a Local" CTA pre-filled with city, category, date, guests. |
| 2 | Traveler submits valid request | `TripRequest` created with status `submitted`; appears in `/dashboard/requests`. |
| 3 | Unauthenticated visitor submits | Redirects to login/register, preserves draft, completes on auth. |
| 4 | Unverified Local queries opportunities | Returns HTTP `403 Forbidden`. |
| 5 | Verified Local in matching city queries | Returns open requests in their destination city. |
| 6 | Verified Local submits quote | `RequestOffer` created (`status: submitted`); parent request becomes `offers_received`. |
| 7 | Local submits duplicate quote | Returns HTTP `409 Conflict`. |
| 8 | Traveler views received quotes | Displays quoting locals with ratings, hourly rates, and personalized messages. |
| 9 | Traveler accepts quote | Converts atomically into standard `Booking` (`status: confirmed`); competing offers declined. |
| 10 | Traveler pays converted booking | Reuses Safepay checkout flow (`/dashboard/bookings/{id}?payment=success`); payment reconciles. |
| 11 | Duplicate acceptance attempt | Returns HTTP `409 Conflict` and prevents duplicate booking creation. |
| 12 | Admin inspects and filters requests | Admin views request table, city distribution, and eligible local partners in `/admin/requests`. |

---

*This specification is complete, authoritative, and strictly conforms to HireALocals architectural standards.*
