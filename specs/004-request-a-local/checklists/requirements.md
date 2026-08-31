# Requirements Checklist: SPEC-04 — Request-a-Local

This checklist tracks requirement completion, design integrity, and architectural compliance for **SPEC-04: Request-a-Local**.

---

### 1. User Stories & Scope

- [x] **Traveler Intake:** Traveler can submit structured custom requests with destination, date, duration, guests, category, description, and budget.
- [x] **Zero-Result Transition:** Search results with 0 items bridge cleanly into `/request-a-local` with preserved search query context.
- [x] **Local Partner Opportunities:** Verified Locals in matching destination cities can view open requests and submit quotes (`RequestOffer`).
- [x] **Traveler Offer Comparison:** Traveler can review received quotes, local ratings, and personalized proposals in `/dashboard/requests`.
- [x] **Booking Conversion:** Accepting an offer converts atomically into a standard `Booking` record with `confirmed` status.
- [x] **Admin Governance:** Administrators can oversee requests, view candidate locals, and dispatch alerts in `/admin/requests`.

---

### 2. Trust, Payment & Architecture Compliance

- [x] **KYC & Trust Guard:** Only KYC-approved Local Partners (`LocalProfile.verified == True`) can access opportunities and submit quotes.
- [x] **Safepay Exclusivity:** Converted bookings immediately reuse the frozen Safepay checkout flow; no parallel payment system is introduced.
- [x] **No Fake Marketplace Activity:** Zero fabricated requests, quotes, or ratings.
- [x] **Workspace Isolation:** Frozen Point 2 (Local Workspace) and Point 3 (Traveler Flow) components are preserved without architectural redesign.

---

### 3. Data Models & Schemas

- [x] **`TripRequest` Model Defined:** Destination (city/country), dates, time, duration, guests, category, description, budget, special requirements, status, and conversion pointers.
- [x] **`RequestOffer` Model Defined:** Request link, local profile link, offered price, proposed start time, duration, proposal message, and offer status.
- [x] **State Machine Defined:** `draft` → `submitted` → `matching` → `offers_received` → `converted_to_booking` (plus `cancelled`/`expired`).
- [x] **Offer Lifecycle Defined:** `submitted` → `accepted` | `declined` | `withdrawn` | `expired`.

---

### 4. Edge Cases & Security

- [x] **Ownership Enforcement:** Traveler can only accept/cancel requests they own (`tourist_user_id == current_user.id`).
- [x] **Duplicate Conversion Prevention:** Atomic state verification prevents double-acceptance or duplicate `Booking` creation.
- [x] **Duplicate Quote Prevention:** Local Partner cannot submit multiple competing quotes on the same request.
- [x] **Expired Request Handling:** Automatic expiration when travel date passes without accepted offer.
- [x] **Unverified Partner Revocation:** Pending quotes automatically withdrawn if Local Partner verification is revoked.

---

### 5. Acceptance Criteria

- [x] 12 testable acceptance scenarios defined across public intake, zero-result bridge, local quote submission, booking conversion, Safepay payment, and admin oversight.
