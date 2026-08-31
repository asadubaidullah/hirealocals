# Feature Specification: SPEC-08 — Admin Revenue Command Center

**Feature ID**: `SPEC-08`  
**Feature Branch**: `master`  
**Created**: 2026-08-31  
**Status**: Specification Complete / Ready for Planning  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Marketplace Administrators, Financial Controllers  
**Dependencies**: Point 1 (KYC & Trust), Point 2 (Local Workspace), Point 3 (Traveler Flow), Point 4 (Request-a-Local), Point 5 (Reviews & Trust), Point 6 (Revenue Engine), Point 7 (SEO & Demand Capture)  

---

## 1. Executive Summary & Business Objective

HireALocals operates a two-sided travel marketplace where travelers book customized local experiences and local partners provide guiding services. In Point 6, the core **Revenue Engine** was established (12% buyer-side platform fees, promo code validation with caps/subsidies, referral attributions with qualifying triggers, Safepay transaction trackers, and basic summary aggregations).

However, marketplace administrators currently lack a centralized, executive-grade financial nerve center. Financial information is fragmented across disparate views (`/admin/payments` for gateway records, `/admin/commission` for settlement rows, `/admin/promotions` for discount lists, and `/admin/bookings` for individual reservations). Crucial multi-dimensional revenue analytics (by city, service category, local partner, and marketing campaign), visual time-series trends, payout liability aging, transaction reconciliation, batch settlements, and exportable financial manifests are missing.

**SPEC-08** unifies all financial operations into a dedicated **Admin Revenue Command Center** (`/admin/revenue`). It provides authoritative, server-derived revenue intelligence, period-over-period comparisons, multi-dimensional segmentation, end-to-end reconciliation auditing, payout liability aging, and secure CSV financial exports—without modifying any frozen core booking, payment, or KYC flows.

```
+---------------------------------------------------------------------------------------------------+
|                            SPEC-08 ADMIN REVENUE COMMAND CENTER                                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [1] EXECUTIVE KPI CARDS                                                                          |
|      - Gross Booking Value (GBV)  | Net Platform Revenue | Effective Take Rate | Paid Bookings     |
|      - Refund Volume              | Promo Subsidies      | Referral Liabilities| Local Payables    |
|      - Period-over-Period Delta (% & Absolute Change vs Previous Comparable Period)               |
|                                                                                                   |
|  [2] TIME HORIZONS & RANGE SELECTOR                                                               |
|      - Presets: Today | 7 Days | 30 Days | 90 Days | Month-to-Date | Quarter-to-Date | All Time     |
|      - Custom Date Range: [YYYY-MM-DD] to [YYYY-MM-DD] with strict UTC boundaries                  |
|                                                                                                   |
|  [3] TIME-SERIES TREND ANALYTICS                                                                  |
|      - Server-aggregated Buckets (Daily, Weekly, Monthly) for GBV, Net Revenue, Fees, Subsidies   |
|                                                                                                   |
|  [4] MULTI-DIMENSIONAL SEGMENTATION                                                               |
|      - By Destination / City (GBV, volume, take-rate yield)                                       |
|      - By Service Category (Photography, Food Discovery, Orientation, etc.)                      |
|      - By Local Partner (Top-earning hosts, gross subtotal, platform revenue contribution)        |
|      - By Campaign & Channel (Promo discount burn vs GMV; Referral acquisition cost vs ROI)       |
|                                                                                                   |
|  [5] PAYMENT & GATEWAY INTELLIGENCE                                                               |
|      - Success, Failure, and Refund Conversion Rates                                              |
|      - Safepay Gateway Reconciliation & Tracker Linkages                                          |
|                                                                                                   |
|  [6] FINANCIAL RECONCILIATION EXPLORER                                                            |
|      - End-to-End Audit: Booking #ID <-> Safepay Payment <-> CommissionLedger <-> Local Payout     |
|      - Discrepancy Status Classification: [Matched] | [Warning] | [Mismatch]                      |
|                                                                                                   |
|  [7] PAYOUT LIABILITIES & AGING                                                                   |
|      - Status Breakdown: Held | Unpaid | Scheduled | Paid | Void                                  |
|      - Aging Buckets: 0-7 Days | 8-14 Days | 15-30 Days | 30+ Days Overdue                        |
|                                                                                                   |
|  [8] BATCH SETTLEMENT OPERATIONS                                                                  |
|      - Eligible Settlement Multi-Select -> Bulk Status Transition (Scheduled / Paid)             |
|      - Mandatory Admin Confirmation, Reference Logging, and AuditLog Persistence                  |
|                                                                                                   |
|  [9] SECURE CSV FINANCIAL EXPORTS                                                                 |
|      - Executive Summary Report | Local Settlement Manifest | Transaction Ledger | Promo/Referral |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Scope & System Boundaries

### Included in Point 8:
- **Dedicated Revenue Command Center (`/admin/revenue`)**: Accessible exclusively by administrators via the main admin navigation sidebar.
- **Executive Revenue KPIs & Comparisons**: Authoritative calculations for GBV, Net Revenue, Take Rate, Paid Volume, Refunds, Promo Burn, Referral Costs, and Local Payables with period-over-period comparisons ($\Delta\%$).
- **Expanded Time Range Engine**: Presets for `today`, `7d`, `30d`, `90d`, `mtd`, `qtd`, `all_time`, and custom date filtering (`from_date` / `to_date`).
- **Time-Series Trend Bucketing**: Server-computed time buckets (daily/weekly/monthly) for financial trajectory curves.
- **Multi-Dimensional Analytics**: Grouped financial breakdowns across authentic marketplace dimensions:
  1. *Destination / City* (e.g. London vs New York vs Edinburgh)
  2. *Service Category* (e.g. Photography vs Food & Drink vs City Orientation)
  3. *Local Partner* (Top-earning hosts and commission contribution)
  4. *Promotions* (Promo code discount burn vs generated GMV)
  5. *Referrals* (Referral credits awarded vs referee booking volume)
- **Payment Lifecycle & Conversion Analytics**: Transaction success, abandonment, failure, and refund rates.
- **Financial Reconciliation Explorer**: Traceable linkage connecting Booking $\to$ Safepay PaymentRecord $\to$ CommissionLedger $\to$ Payout Status with discrepancy detection.
- **Payout Liability Aging Analysis**: Categorization of unpaid host earnings by maturity buckets (`0–7d`, `8–14d`, `15–30d`, `30d+`).
- **Batch Settlement Management**: Secure multi-record settlement status transitions with audit logging.
- **CSV Financial Export Suite**: Server-generated, sanitized CSV downloads for accounting, reconciliation, and payout disbursement.

### Non-Goals (Strictly Excluded):
- No replacement of payment gateways (Safepay remains the sole payment gateway).
- No new external payout disbursement API (payout operations remain internal ledger transitions).
- No Stripe or third-party processor integrations.
- No modifications to Point 1 KYC, Point 2 Local Workspace, Point 3 Traveler Flow, Point 4 Request-a-Local, Point 5 Reviews, Point 6 Revenue Engine core, or Point 7 SEO routes.
- No machine-learning predictive revenue forecasts, external marketing ad-spend ingestion (CAC/LTV ad network scraping), or foreign exchange hedging.
- No synthetic or fabricated financial data.

---

## 3. Financial Definitions & Mathematical Formulas

All financial metrics are computed strictly server-side from authoritative SQLModel records.

### 1. Gross Booking Value (GBV)
The total customer-facing transacted transaction value across all paid, non-cancelled bookings within the selected time window:
$$\text{GBV} = \sum_{b \in \text{PaidBookings}} (\text{subtotal}_b + \text{platform\_fee}_b - \text{discount\_amount}_b)$$

### 2. Total Local Payables
The guaranteed earnings payable to local partners (100% of the service subtotal, fully insulated from promotional discounts):
$$\text{Local Payables} = \sum_{b \in \text{PaidBookings}} \text{subtotal}_b$$

### 3. Total Platform Fees
The gross 12% buyer-side marketplace platform fees collected from travelers:
$$\text{Platform Fees} = \sum_{b \in \text{PaidBookings}} \text{platform\_fee}_b$$

### 4. Promotional Subsidies
The total discounts funded by the platform via validated promo code redemptions:
$$\text{Promo Subsidies} = \sum_{b \in \text{PaidBookings}} \text{discount\_amount}_b$$

### 5. Net Platform Revenue
The actual gross profit retained by the marketplace after absorbing promotional subsidies:
$$\text{Net Platform Revenue} = \text{Platform Fees} - \text{Promo Subsidies}$$

### 6. Effective Take Rate
The realized platform take rate percentage relative to gross local transaction volume:
$$\text{Effective Take Rate (\%)} = \begin{cases} \left(\frac{\text{Net Platform Revenue}}{\text{Local Payables}}\right) \times 100 & \text{if Local Payables} > 0 \\ 12.0\% & \text{otherwise} \end{cases}$$

### 7. Referral Liabilities & Cost
Total reward credits credited to referrers upon referee completed and paid bookings:
$$\text{Referral Cost} = \sum_{a \in \text{QualifiedAttributions}} \text{reward\_amount}_a$$

### 8. Refund Volume & Rate
Total currency refunded to travelers across processed refunds:
$$\text{Refund Volume} = \sum_{p \in \text{RefundedRecords}} \left(\frac{\text{refunded\_minor}_p}{100.0}\right)$$
$$\text{Refund Rate (\%)} = \begin{cases} \left(\frac{\text{Refund Volume}}{\text{GBV}}\right) \times 100 & \text{if GBV} > 0 \\ 0.0\% & \text{otherwise} \end{cases}$$

### 9. Period-over-Period Comparison ($\Delta\%$)
Comparing metric $M_{\text{current}}$ over duration $D$ against $M_{\text{previous}}$ over the immediately preceding duration $D$:
$$\Delta\% = \begin{cases} \left(\frac{M_{\text{current}} - M_{\text{previous}}}{M_{\text{previous}}}\right) \times 100 & \text{if } M_{\text{previous}} > 0 \\ 0.0\% & \text{otherwise} \end{cases}$$

---

## 4. Time Range & Date Boundary System

The Command Center supports flexible temporal windowing with strict UTC normalization:

| Period Preset | Start Boundary ($t_{\text{start}}$) | End Boundary ($t_{\text{end}}$) | Previous Comparison Window |
| :--- | :--- | :--- | :--- |
| `today` | Current day at `00:00:00 UTC` | Current timestamp `now()` | Yesterday `[00:00:00 UTC, 23:59:59 UTC]` |
| `7d` | `now() - 7 days` | `now()` | `[now() - 14 days, now() - 7 days]` |
| `30d` | `now() - 30 days` | `now()` | `[now() - 60 days, now() - 30 days]` |
| `90d` | `now() - 90 days` | `now()` | `[now() - 180 days, now() - 90 days]` |
| `mtd` | 1st of current month at `00:00:00 UTC` | `now()` | 1st of previous month to same day in previous month |
| `qtd` | 1st of current quarter at `00:00:00 UTC`| `now()` | 1st of previous quarter to same day in previous quarter |
| `all_time` | Epoch (`None`) | `now()` | None (N/A) |
| `custom` | `from_date` at `00:00:00 UTC` | `to_date` at `23:59:59 UTC` | Shifted back by exact day difference |

---

## 5. Multi-Dimensional Analytics Model

The backend computes grouped aggregations across 5 core dimensions:

### 1. Destination / City Analytics
- **Grouping**: `LocalProfile.city_name` (or `Booking.city_name`)
- **Metrics**: `city_name`, `country_code`, `paid_bookings_count`, `gbv`, `local_payable`, `platform_revenue`, `effective_take_rate`.

### 2. Service Category Analytics
- **Grouping**: `Service.category` (or `TripRequest.category`)
- **Metrics**: `category_name`, `paid_bookings_count`, `gbv`, `local_payable`, `platform_revenue`.

### 3. Local Partner Performance
- **Grouping**: `LocalProfile.id` $\to$ `LocalProfile.display_name`
- **Metrics**: `local_id`, `local_name`, `city_name`, `paid_bookings_count`, `gross_earnings`, `platform_revenue_generated`, `payout_status_summary`.

### 4. Promotional Campaign Efficiency
- **Grouping**: `PromoCode.id` $\to$ `PromoCode.code`
- **Metrics**: `code`, `discount_type`, `total_redemptions`, `total_discount_burn`, `associated_gbv`, `net_platform_revenue_yield`.

### 5. Referral Channel Yield
- **Grouping**: `ReferralCode.id` $\to$ `ReferralCode.code`
- **Metrics**: `code`, `referrer_name`, `total_referred_users`, `qualified_bookings_count`, `total_credits_earned`, `generated_booking_value`.

---

## 6. Financial Reconciliation Engine

To ensure ledger integrity, the Command Center cross-references all related transaction entities:

```
[Booking #ID] (subtotal, fee, discount)
     │
     ├──> [PaymentRecord] (amount_total_minor, platform_fee_minor, status, payment_intent_id)
     │         │
     │         └──> [Safepay Gateway Tracker] (verified remote transaction)
     │
     └──> [CommissionLedger] (gross_amount, local_amount, platform_fee, payout_status)
               │
               └──> [LocalProfile] (payable beneficiary)
```

### Discrepancy Classification Rules:
1. **MATCHED**:
   - `PaymentRecord.status == 'paid'`
   - `PaymentRecord.amount_total_minor == round((Booking.subtotal + Booking.platform_fee - Booking.discount) * 100)`
   - `CommissionLedger.local_amount == round(Booking.subtotal, 2)`
   - `CommissionLedger.platform_fee == round(Booking.platform_fee, 2)`
2. **WARNING**:
   - Booking completed but `CommissionLedger.payout_status == 'held'` (requires review/aging check).
   - Booking cancelled with `PaymentRecord.status == 'paid'` and refund pending.
3. **MISMATCH**:
   - `PaymentRecord.amount_total_minor` does not equal expected booking total.
   - Missing `PaymentRecord` for confirmed booking where payment was required.
   - Missing `CommissionLedger` row for active booking.

---

## 7. Payout Liabilities & Aging Model

Host settlement obligations are classified by status and aging maturity:

### 1. Payout Status Definitions:
- `held`: Booking is confirmed and paid, but event date has not concluded. Funds securely retained.
- `unpaid`: Booking is completed. Local earnings are mature and due for disbursement.
- `scheduled`: Administrator has batched or scheduled the settlement for bank payout.
- `paid`: Payout disbursement completed and confirmed by administrator.
- `void`: Booking was cancelled or refunded; payout obligation annulled.

### 2. Aging Buckets for Outstanding Liabilities (`unpaid` / `scheduled`):
- **0–7 Days**: Recently completed bookings (standard clearing cycle).
- **8–14 Days**: Regular payout processing window.
- **15–30 Days**: Approaching settlement threshold (priority dispatch).
- **30+ Days Overdue**: Delayed settlement requiring administrator attention.

---

## 8. Batch Settlement Operations

Administrators can execute bulk settlement transitions for eligible records:

### Batch Operation Contract:
- **Endpoint**: `POST /api/admin/commission/batch-update`
- **Payload**:
  ```json
  {
    "ledger_ids": [12, 14, 15],
    "target_status": "scheduled" | "paid",
    "reference_note": "Batch payout #2026-W35 wire transfer"
  }
  ```
- **Validation Rules**:
  - Rejects any IDs with status `void` or `paid`.
  - Rejects unconfirmed/pending bookings.
  - Generates an `AuditLog` entry per updated record recording `admin.user_id`, timestamp, and reference note.
  - Idempotent execution: skipping already-transitioned rows without error.

---

## 9. Secure Financial Export Engine

Four dedicated CSV export streams provide sanitized financial data:

1. **Executive Revenue Summary CSV** (`/api/admin/revenue/export/summary`):
   - Columns: `period`, `start_date`, `end_date`, `gbv`, `local_payables`, `platform_fees`, `promo_subsidies`, `net_revenue`, `take_rate_pct`, `paid_bookings_count`, `refund_volume`, `refund_count`.
2. **Settlement & Payout Manifest CSV** (`/api/admin/revenue/export/settlements`):
   - Columns: `ledger_id`, `booking_id`, `local_id`, `local_name`, `local_email`, `booking_date`, `completed_at`, `local_amount`, `currency`, `payout_status`, `aging_days`, `notes`.
3. **Transaction Reconciliation Ledger CSV** (`/api/admin/revenue/export/reconciliation`):
   - Columns: `booking_id`, `traveler_name`, `local_name`, `booking_status`, `payment_status`, `safepay_tracker`, `subtotal`, `platform_fee`, `discount`, `charged_total`, `local_payable`, `reconciliation_status`.
4. **Promotions & Referral Cost CSV** (`/api/admin/revenue/export/marketing`):
   - Columns: `type`, `code_or_ref`, `owner_or_campaign`, `redemptions_count`, `discount_or_reward_amount`, `associated_gbv`, `net_contribution`.

---

## 10. API Specification

```
+---------------------------------------------------------------------------------------------------+
| METHOD | ENDPOINT                                 | AUTH  | DESCRIPTION                           |
+---------------------------------------------------------------------------------------------------+
| GET    | /api/admin/revenue/summary               | Admin | Core executive revenue KPIs (Point 6) |
| GET    | /api/admin/revenue/analytics             | Admin | Multi-dimensional analytics & trends  |
| GET    | /api/admin/revenue/reconciliation        | Admin | Unified transaction reconciliation    |
| GET    | /api/admin/revenue/payout-aging          | Admin | Payout liability aging buckets        |
| POST   | /api/admin/commission/batch-update       | Admin | Bulk settlement status transitions    |
| GET    | /api/admin/revenue/export/summary        | Admin | CSV download: Revenue summary         |
| GET    | /api/admin/revenue/export/settlements    | Admin | CSV download: Payout manifest         |
| GET    | /api/admin/revenue/export/reconciliation | Admin | CSV download: Reconciliation ledger   |
| GET    | /api/admin/revenue/export/marketing      | Admin | CSV download: Promo/referral audit    |
+---------------------------------------------------------------------------------------------------+
```

---

## 11. Security, Authorization & Privacy Rules

1. **Role-Based Access Control**:
   - Every Point 8 endpoint strictly enforces `Annotated[User, Depends(admin_user)]`.
   - Travelers and Local Partners receive HTTP 403 Forbidden on all revenue endpoints.
2. **Server-Side Authoritative Truth**:
   - All financial metrics, sums, and take rates are derived directly from database models. The frontend never computes or dictates financial truth.
3. **Secret Redaction**:
   - Safepay API secrets, webhook signing keys, database connection strings, passwords, and user KYC documents are strictly excluded from all response schemas and CSV exports.
4. **Audit Logging**:
   - All batch settlement updates, manual overrides, and export generation actions create immutable `AuditLog` rows.

---

## 12. User Stories & Acceptance Scenarios

### User Story 1: Executive KPI Overview
> **As a** Marketplace Administrator,  
> **I want to** view high-level revenue KPIs with period-over-period growth comparisons,  
> **So that** I can assess the marketplace's financial velocity and take rate.

- **Scenario 01 (Admin-Only Access)**: Non-admin users attempting to access `/api/admin/revenue/analytics` receive HTTP 403 Forbidden.
- **Scenario 02 (KPI Calculation Accuracy)**: GBV, Net Revenue, Take Rate, and Payables match authoritative database sums.
- **Scenario 03 (Period-over-Period Delta)**: Displays percentage change ($\Delta\%$) comparing current window against prior equivalent duration.

### User Story 2: Temporal Windowing
> **As a** Financial Controller,  
> **I want to** filter marketplace financials across standard presets and custom date ranges,  
> **So that** I can analyze quarterly results or custom reporting intervals.

- **Scenario 04 (90-Day Filter)**: Selecting `period=90d` limits calculations to transactions within the past 90 days.
- **Scenario 05 (Month-to-Date Filter)**: Selecting `period=mtd` limits calculations to transactions from the 1st of the current month.
- **Scenario 06 (Quarter-to-Date Filter)**: Selecting `period=qtd` limits calculations to transactions from the start of the current quarter.
- **Scenario 07 (Custom Date Range)**: Specifying `from_date=2026-08-01&to_date=2026-08-31` restricts data strictly to that interval.

### User Story 3: Revenue Trend Analysis
> **As a** Marketplace Administrator,  
> **I want to** view time-series revenue trends,  
> **So that** I can identify seasonal patterns and growth trajectories.

- **Scenario 08 (GBV Trend Bucketing)**: Generates chronological buckets (daily/weekly) summing GBV accurately.
- **Scenario 09 (Net Revenue Trend Bucketing)**: Generates chronological buckets for Net Platform Revenue after promo subsidies.

### User Story 4: Multi-Dimensional Analytics
> **As a** Marketplace Administrator,  
> **I want to** inspect revenue segmented by City, Category, Local Partner, and Campaign,  
> **So that** I know where marketplace demand and profit are concentrated.

- **Scenario 10 (City Segmentation)**: Renders revenue breakdown grouped by destination city with accurate GBV and volume.
- **Scenario 11 (Category Segmentation)**: Renders revenue breakdown grouped by service category.
- **Scenario 12 (Local Partner Ranking)**: Lists top local partners sorted by gross earnings and platform revenue generated.
- **Scenario 13 (Promo Campaign ROI)**: Reports redemption counts, total discount burn, and generated GBV per promo code.
- **Scenario 14 (Referral Channel Yield)**: Reports referral credits awarded vs referee booking volume generated.

### User Story 5: Payment & Reconciliation
> **As a** Financial Auditor,  
> **I want to** reconcile every booking against its payment record and settlement ledger,  
> **So that** no financial discrepancy or orphaned transaction goes unnoticed.

- **Scenario 15 (Payment Conversion Rates)**: Accurately reports payment success, failure, and refund percentages.
- **Scenario 16 (Unified Reconciliation Matching)**: Validated booking, payment, and settlement entries receive `status: "matched"`.
- **Scenario 17 (Discrepancy Detection)**: Mismatched amounts or missing records are flagged with `status: "mismatch"` or `status: "warning"`.

### User Story 6: Payout Liability Management
> **As an** Operations Administrator,  
> **I want to** monitor unpaid local liabilities by aging buckets and execute batch settlements,  
> **So that** local partners are paid accurately and on time.

- **Scenario 18 (Payout Aging Classification)**: Unpaid liabilities correctly grouped into `0-7d`, `8-14d`, `15-30d`, and `30d+` overdue.
- **Scenario 19 (Eligible Batch Payout Transition)**: Selecting multiple `unpaid` ledger rows and setting `status: "scheduled"` updates all rows atomically and writes audit logs.
- **Scenario 20 (Invalid Batch Transition Blocked)**: Attempting to include `void` or `paid` entries in a batch payout is rejected with HTTP 400.

### User Story 7: Financial Exports & Compliance
> **As an** Accountant,  
> **I want to** download CSV financial reports,  
> **So that** I can import them into external accounting software or disburse batch bank wires.

- **Scenario 21 (Revenue Summary CSV Export)**: Generates valid CSV containing executive KPIs for the selected range.
- **Scenario 22 (Settlement Manifest CSV Export)**: Generates valid CSV listing host payout liabilities with banking/reference notes.
- **Scenario 23 (Reconciliation Ledger CSV Export)**: Generates valid CSV listing booking-level reconciliation mappings.
- **Scenario 24 (Marketing & Promotion CSV Export)**: Generates valid CSV auditing promo code burn and referral credits.

### User Story 8: System Integrity & Regressions
> **As a** Platform Engineer,  
> **I want to** guarantee zero regressions across all prior frozen marketplace systems,  
> **So that** marketplace stability is fully preserved.

- **Scenario 25 (Drilldown Access Control)**: Navigating from summary tables to underlying bookings preserves admin authorization.
- **Scenario 26 (Audit Logging)**: All settlement updates and financial mutations generate persistent `AuditLog` rows.
- **Scenario 27 (Zero Sensitive Data Leakage)**: CSV exports and API payloads contain zero passwords, tokens, or KYC records.
- **Scenario 28 (Point 1–7 Regression Preservation)**: All 90 prior E2E scenarios continue to pass with 100% success.

---

## 13. Freeze Gate & Verification Checklist

Point 8 will be eligible for final review and freezing when:
1. All 28 acceptance scenarios pass with 0 errors in `backend/scripts/test_point8_e2e.py`.
2. All regression suites pass: SPEC-01 KYC (12/12), Point 3 (14/14), Point 4 (14/14), Point 5 (14/14), Point 6 (18/18), Point 7 (18/18).
3. Frontend compiles cleanly with `npx tsc --noEmit` (0 errors).
4. Backend compiles cleanly with `py_compile` (0 errors).
5. All financial calculations strictly match backend database truth with zero synthetic data.
6. Admin-only access and audit logs are verified on all endpoints.
