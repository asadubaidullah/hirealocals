# Task List: SPEC-08 — Admin Revenue Command Center

**Specification**: [specs/008-revenue-command-center/spec.md](spec.md)  
**Implementation Plan**: [specs/008-revenue-command-center/plan.md](plan.md)  
**Checklist**: [specs/008-revenue-command-center/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Ready for Implementation (Awaiting User Directive)  

---

## Task Organization & Dependencies

```
PHASE 0: Safety & Baseline (T001-T002)
   │
   ▼
PHASE 1: Analytics Contracts & Schemas (T003-T005)
   │
   ▼
PHASE 2: Time Range Engine & Temporal Parser (T006)
   │
   ▼
PHASE 3: Core Revenue Analytics & Comparison Engine (T007-T008)
   │
   ▼
PHASE 4: Time-Series Trend Aggregations (T009)
   │
   ▼
PHASE 5: Multi-Dimensional Revenue Segmentation (T010-T014)
   │
   ▼
PHASE 6: Payment Lifecycle & Gateway Intelligence (T015)
   │
   ▼
PHASE 7: Financial Reconciliation Engine (T016-T017)
   │
   ▼
PHASE 8: Payout Liability & Aging Engine (T018)
   │
   ▼
PHASE 9: Batch Settlement Operations (T019)
   │
   ▼
PHASE 10: Financial CSV Export Suite (T020-T023)
   │
   ▼
PHASE 11: Frontend Command Center Interface (T024-T027)
   │
   ▼
PHASE 12: Admin Navigation & Sidebar Integration (T028)
   │
   ▼
PHASE 13: Clickable Drilldown Behavior (T029)
   │
   ▼
PHASE 14: Responsive CSS Styling Polish (T030)
   │
   ▼
PHASE 15: Automated Test Suite (T031)
   │
   ▼
PHASE 16: Full Regression Verification & Freeze Gate (T032-T037)
```

---

## Phase 0 — Safety & Baseline Preparation

- [ ] **T001**: Verify clean git working tree, confirmed remote sync on `master`, and create a timestamped pre-implementation backup directory under `backups/POINT8-PREP-<timestamp>/` containing current copies of `backend/app/schemas.py`, `backend/app/main.py`, `frontend/components/AdminSidebar.tsx`, and `frontend/app/globals.css`.
  - **File**: `backups/POINT8-PREP-<timestamp>/`
  - **Depends on**: None
  - **Implementation Intent**: Safeguard active working state before modifying backend or frontend files.
  - **Acceptance Criterion**: Backup directory created outside `backend/` and `frontend/` containing intact copies of all targeted files.
  - **Test Requirement**: Verify backup directory existence and non-zero file sizes.

- [ ] **T002**: Verify baseline service health for backend daemon (`127.0.0.1:8000`), frontend dev server (`localhost:3000`), and SQLite database connectivity, confirming Points 1–7 frozen systems are intact.
  - **File**: Workspace environment
  - **Depends on**: T001
  - **Implementation Intent**: Ensure all daemons and test suites are functional before starting Point 8 changes.
  - **Acceptance Criterion**: HTTP 200 on `/api/locals` and `/explore`.
  - **Test Requirement**: `curl -I http://127.0.0.1:8000/api/locals` returns 200.

---

## Phase 1 — Analytics Contracts & Schemas

- [ ] **T003**: Define `RevenueKPIOverview`, `PeriodComparison`, and `RevenueTrendPoint` Pydantic schemas in `backend/app/schemas.py`.
  - **File**: `backend/app/schemas.py`
  - **Depends on**: T002
  - **Implementation Intent**: Provide strongly typed serialization for executive KPIs, growth deltas, and chronological trend series.
  - **Acceptance Criterion**: Schemas defined with fields for GBV, Net Revenue, Fees, Subsidies, Payables, Refunds, and delta percentages.
  - **Test Requirement**: Schema validation test with sample mock data.

- [ ] **T004**: Define dimensional analytics schemas (`CityRevenueItem`, `CategoryRevenueItem`, `LocalRevenueItem`, `PromoRevenueItem`, `ReferralRevenueItem`, and `PaymentLifecycleStats`) in `backend/app/schemas.py`.
  - **File**: `backend/app/schemas.py`
  - **Depends on**: T003
  - **Implementation Intent**: Strongly type grouped revenue breakdowns across destinations, categories, local partners, marketing campaigns, and payment channels.
  - **Acceptance Criterion**: Dimensional models support grouping by authentic database fields with volumetric and currency metrics.
  - **Test Requirement**: Schema validation test with sample dimensional items.

- [ ] **T005**: Define reconciliation and payout aging schemas (`ReconciliationRow`, `PayoutAgingBucket`, `PayoutAgingBreakdown`, `BatchPayoutInput`, `BatchPayoutResult`) in `backend/app/schemas.py`.
  - **File**: `backend/app/schemas.py`
  - **Depends on**: T004
  - **Implementation Intent**: Strongly type transaction audit rows, aging buckets, and batch settlement payloads.
  - **Acceptance Criterion**: Schemas defined with validation rules for status transitions and aging periods.
  - **Test Requirement**: Schema validation test for batch update input.

---

## Phase 2 — Time Range Engine & Temporal Parser

- [ ] **T006**: Implement `parse_date_window` utility helper in `backend/app/main.py` supporting presets (`today`, `7d`, `30d`, `90d`, `mtd`, `qtd`, `all_time`) and custom ISO date ranges (`from_date` / `to_date`).
  - **File**: `backend/app/main.py`
  - **Depends on**: T005
  - **Implementation Intent**: Provide robust UTC boundary parsing with automatic calculation of prior equivalent comparison intervals ($t_{\text{prev\_start}}$ to $t_{\text{prev\_end}}$).
  - **Acceptance Criterion**: Returns normalized UTC timestamps for current and prior comparison periods; handles leap years and month boundaries without error.
  - **Test Requirement**: Unit tests for all presets and custom date strings.

---

## Phase 3 — Core Revenue Analytics & Comparison Engine

- [ ] **T007**: Implement executive KPI aggregation logic in `backend/app/main.py` computing GBV, Local Payables, Platform Fees, Promo Subsidies, Net Revenue, Take Rate, Paid Volume, and Refunds using Point 6 exact formulas.
  - **File**: `backend/app/main.py`
  - **Depends on**: T006
  - **Implementation Intent**: Server-side aggregation of authentic booking and payment records within the requested temporal window.
  - **Acceptance Criterion**: Executive metrics match Point 6 exact formulas; Local subtotal is 100% protected.
  - **Test Requirement**: Execute query against sample bookings and assert metric sums.

- [ ] **T008**: Implement period-over-period comparison calculations ($\Delta\%$) with zero-denominator safety guards in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T007
  - **Implementation Intent**: Compute percentage change between current window and prior comparison window without `ZeroDivisionError`.
  - **Acceptance Criterion**: Returns signed percentage change ($\Delta\%$) and absolute change; returns `0.0%` when prior metric is zero.
  - **Test Requirement**: Compare two simulated periods and verify delta percentages.

---

## Phase 4 — Time-Series Trend Aggregations

- [ ] **T009**: Implement server-side time-series trend bucketing (daily for $\le 30\text{d}$, weekly for $\le 90\text{d}$, monthly for $> 90\text{d}$) in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Bucket transactions into chronological intervals with zero-value smoothing for inactive dates.
  - **Acceptance Criterion**: Returns ordered array of `RevenueTrendPoint` objects covering the full date range with no missing dates.
  - **Test Requirement**: Test 7-day, 30-day, and 90-day trend series generation.

---

## Phase 5 — Multi-Dimensional Revenue Segmentation

- [ ] **T010**: Implement City Revenue Segmentation in `backend/app/main.py` grouping transactions by `LocalProfile.city_name` (and `country_code`).
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Aggregate GBV, booking counts, local payables, platform revenue, and take rate per destination city.
  - **Acceptance Criterion**: Returns sorted array of `CityRevenueItem` objects by GBV descending.
  - **Test Requirement**: Verify city grouping against bookings in multiple destinations.

- [ ] **T011**: Implement Service Category Revenue Segmentation in `backend/app/main.py` grouping transactions by `Service.category`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Aggregate GBV, booking volume, and net revenue across active travel service categories.
  - **Acceptance Criterion**: Returns sorted array of `CategoryRevenueItem` objects by GBV descending.
  - **Test Requirement**: Verify category grouping against active bookings.

- [ ] **T012**: Implement Local Partner Performance Ranking in `backend/app/main.py` grouping transactions by `LocalProfile.id`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Aggregate gross host payouts, paid booking counts, and platform revenue yield per local partner.
  - **Acceptance Criterion**: Returns top local partners sorted by gross earnings descending.
  - **Test Requirement**: Verify local partner ranking against database records.

- [ ] **T013**: Implement Promo Campaign ROI Analytics in `backend/app/main.py` cross-referencing `PromoRedemption` and `PromoCode`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Measure redemption counts, total discount burn, and generated GBV per promotional campaign.
  - **Acceptance Criterion**: Returns array of `PromoRevenueItem` objects with accurate discount sums.
  - **Test Requirement**: Verify promo code analytics against redeemed promo codes.

- [ ] **T014**: Implement Referral Channel Yield Analytics in `backend/app/main.py` cross-referencing `ReferralAttribution` and `ReferralCode`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Measure referee booking conversion, referral credits earned, and generated booking value per referral code.
  - **Acceptance Criterion**: Returns array of `ReferralRevenueItem` objects with accurate credit liabilities.
  - **Test Requirement**: Verify referral analytics against qualified attributions.

---

## Phase 6 — Payment Lifecycle & Gateway Intelligence

- [ ] **T015**: Implement Payment Lifecycle Analytics in `backend/app/main.py` aggregating `PaymentRecord` states (`paid`, `processing`, `failed`, `refunded`) and computing success, failure, and refund conversion rates.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Provide gateway conversion rates and volume metrics derived from authentic Safepay payment records.
  - **Acceptance Criterion**: Returns `PaymentLifecycleStats` with accurate percentage rates and volume counts.
  - **Test Requirement**: Verify conversion rates across mixed payment states.

---

## Phase 7 — Financial Reconciliation Engine

- [ ] **T016**: Implement unified relational transaction cross-referencing in `backend/app/main.py` linking `Booking` $\leftrightarrow$ `PaymentRecord` $\leftrightarrow$ `CommissionLedger` $\leftrightarrow$ `Safepay Tracker`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Join relational transaction records to produce a complete line-by-line financial audit trail.
  - **Acceptance Criterion**: Assembles `ReconciliationRow` records containing booking total, charged total, local payable, platform fee, and gateway reference.
  - **Test Requirement**: Query reconciliation for paid and completed bookings.

- [ ] **T017**: Implement automated discrepancy classification rules (`[Matched]`, `[Warning]`, `[Mismatch]`) in `GET /api/admin/revenue/reconciliation`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T016
  - **Implementation Intent**: Classify transaction health without mutating database records.
  - **Acceptance Criterion**: Correctly classifies intact transactions as `matched`, unreleased completed bookings as `warning`, and amount/fee mismatches as `mismatch`.
  - **Test Requirement**: Test classification against intact and simulated discrepancy scenarios.

---

## Phase 8 — Payout Liability & Aging Engine

- [ ] **T018**: Implement Payout Liability Aging Analysis in `GET /api/admin/revenue/payout-aging` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Categorize host settlement liabilities across status tiers (`held`, `unpaid`, `scheduled`, `paid`, `void`) and classify mature unpaid liabilities into aging buckets (`0-7d`, `8-14d`, `15-30d`, `30d+` overdue).
  - **Acceptance Criterion**: Returns `PayoutAgingBreakdown` with accurate sums per aging bucket based on booking completion dates.
  - **Test Requirement**: Verify aging calculations against bookings completed at various timestamps.

---

## Phase 9 — Batch Settlement Operations

- [ ] **T019**: Implement `POST /api/admin/commission/batch-update` endpoint in `backend/app/main.py` supporting atomic bulk settlement transitions to `scheduled` or `paid`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T018
  - **Implementation Intent**: Enable administrators to update multiple eligible settlements in a single audited transaction.
  - **Acceptance Criterion**: Updates eligible records, rejects `void` or `paid` records with HTTP 400, and creates persistent `AuditLog` rows.
  - **Test Requirement**: Test successful multi-select batch update and test rejection of invalid records.

---

## Phase 10 — Financial CSV Export Suite

- [ ] **T020**: Implement Executive Revenue Summary CSV export at `GET /api/admin/revenue/export/summary` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T008
  - **Implementation Intent**: Stream sanitized CSV download containing period GBV, net revenue, platform fees, subsidies, and refunds.
  - **Acceptance Criterion**: Returns `text/csv` with `Content-Disposition` header and verified column headers.
  - **Test Requirement**: Fetch export and assert CSV content format.

- [ ] **T021**: Implement Settlement & Payout Manifest CSV export at `GET /api/admin/revenue/export/settlements` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T018
  - **Implementation Intent**: Stream bank-ready payout manifest CSV with local partner name, email, booking ID, amount, currency, aging, and notes.
  - **Acceptance Criterion**: Returns valid CSV with host payout liabilities formatted for disbursement.
  - **Test Requirement**: Fetch export and verify host payout rows.

- [ ] **T022**: Implement Transaction Reconciliation Ledger CSV export at `GET /api/admin/revenue/export/reconciliation` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T017
  - **Implementation Intent**: Stream full reconciliation ledger CSV with booking IDs, customer charge, Safepay tracker, local payable, and reconciliation status.
  - **Acceptance Criterion**: Returns valid CSV with line-by-line financial audit data.
  - **Test Requirement**: Fetch export and assert reconciliation columns.

- [ ] **T023**: Implement Marketing & Promotional Cost CSV export at `GET /api/admin/revenue/export/marketing` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T013, T014
  - **Implementation Intent**: Stream marketing subsidy audit CSV with promo code redemptions and referral credit attributions.
  - **Acceptance Criterion**: Returns valid CSV detailing promotional discounts and referral reward costs.
  - **Test Requirement**: Fetch export and assert marketing audit rows.

---

## Phase 11 — Frontend Revenue Command Center UI

- [ ] **T024**: Create `frontend/app/admin/revenue/page.tsx` with Executive KPI Ribbon, Range Selector pill controls, and Period-over-Period Delta badges ($\Delta\%$).
  - **File**: `frontend/app/admin/revenue/page.tsx`
  - **Depends on**: T008, T019
  - **Implementation Intent**: Establish the primary command center layout displaying top-level financial metrics and time controls.
  - **Acceptance Criterion**: Page loads cleanly inside `AdminShell`; displays 8 KPI boxes with positive/negative delta indicators.
  - **Test Requirement**: Render page and verify KPI card rendering.

- [ ] **T025**: Implement visual Time-Series Trend Charts and Multi-Dimensional Performance Grids (Destinations, Categories, Local Partners, Campaigns) in `frontend/app/admin/revenue/page.tsx`.
  - **File**: `frontend/app/admin/revenue/page.tsx`
  - **Depends on**: T024
  - **Implementation Intent**: Provide interactive visual charts and sortable dimensional tables.
  - **Acceptance Criterion**: Renders chronological trend bar/line charts and segmented data tables with sorting.
  - **Test Requirement**: Verify tab switching and table row rendering.

- [ ] **T026**: Implement Transaction Reconciliation Explorer and Payout Liability Aging Dashboard with Batch Settlement Toolbar in `frontend/app/admin/revenue/page.tsx`.
  - **File**: `frontend/app/admin/revenue/page.tsx`
  - **Depends on**: T025
  - **Implementation Intent**: Embed reconciliation table with status filters (`Matched`, `Warning`, `Mismatch`) and multi-select batch payout action modal.
  - **Acceptance Criterion**: Multi-select checkboxes enable batch payout button; triggers confirmation and updates settlement state.
  - **Test Requirement**: Test UI batch selection and status transition.

- [ ] **T027**: Implement Financial Export Actions Toolbar in `frontend/app/admin/revenue/page.tsx`.
  - **File**: `frontend/app/admin/revenue/page.tsx`
  - **Depends on**: T026
  - **Implementation Intent**: Provide one-click authenticated CSV download buttons for all 4 financial export streams.
  - **Acceptance Criterion**: Clicking export triggers authenticated file download with current date filter parameters.
  - **Test Requirement**: Test export button click and file download initiation.

---

## Phase 12 — Admin Navigation & Sidebar Integration

- [ ] **T028**: Update `frontend/components/AdminSidebar.tsx` to add primary **Revenue** navigation link under the `Operations` group while preserving existing `Payments` and `Settlements` links.
  - **File**: `frontend/components/AdminSidebar.tsx`
  - **Depends on**: T024
  - **Implementation Intent**: Enable administrators to navigate directly to the Revenue Command Center from anywhere in the admin console.
  - **Acceptance Criterion**: "Revenue" link appears with active route highlighting on `/admin/revenue`.
  - **Test Requirement**: Verify sidebar navigation item and active state.

---

## Phase 13 — Clickable Drilldown Behavior

- [ ] **T029**: Implement clickable drilldowns from summary tables to underlying filtered booking, payment, and ledger records in `frontend/app/admin/revenue/page.tsx`.
  - **File**: `frontend/app/admin/revenue/page.tsx`
  - **Depends on**: T026
  - **Implementation Intent**: Enable admins to click on a city, category, local partner, or reconciliation row to inspect individual bookings.
  - **Acceptance Criterion**: Clicking a row opens the corresponding booking detail or filtered transaction view while preserving admin authorization.
  - **Test Requirement**: Verify drilldown link targets.

---

## Phase 14 — Responsive CSS Styling Polish

- [ ] **T030**: Add scoped CSS classes in `frontend/app/globals.css` for Revenue Command Center layout, KPI delta badges, trend containers, reconciliation status pills, and aging grid cards.
  - **File**: `frontend/app/globals.css`
  - **Depends on**: T024-T028
  - **Implementation Intent**: Provide clean, responsive styling matching the HireALocals admin design system across mobile, tablet, and desktop viewports.
  - **Acceptance Criterion**: Zero layout overflow on mobile viewports; clean typography and high-contrast badges.
  - **Test Requirement**: CSS validation and visual responsiveness check.

---

## Phase 15 — Automated Test Suite

- [ ] **T031**: Create and execute `backend/scripts/test_point8_e2e.py` covering all 28 acceptance scenarios.
  - **File**: `backend/scripts/test_point8_e2e.py`
  - **Depends on**: T001-T030
  - **Implementation Intent**: Provide automated end-to-end verification of KPIs, period comparisons, time ranges, trends, dimensional breakdowns, reconciliation, payout aging, batch updates, and CSV exports.
  - **Acceptance Criterion**: 28/28 scenarios pass with zero failures.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point8_e2e.py` exits with code 0.

---

## Phase 16 — Full Regression Verification & Freeze Gate

- [ ] **T032**: Run SPEC-01 Didit KYC regression test suite (`backend/scripts/test_spec01_kyc.py`).
  - **File**: `backend/scripts/test_spec01_kyc.py`
  - **Depends on**: T031
  - **Implementation Intent**: Ensure Point 8 changes did not affect identity verification.
  - **Acceptance Criterion**: 12/12 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_spec01_kyc.py` exits with code 0.

- [ ] **T033**: Run Point 3 Traveler Flow E2E regression test suite (`backend/scripts/test_point3_e2e.py`).
  - **File**: `backend/scripts/test_point3_e2e.py`
  - **Depends on**: T031
  - **Implementation Intent**: Ensure Point 8 changes did not affect traveler booking or checkout.
  - **Acceptance Criterion**: 14/14 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point3_e2e.py` exits with code 0.

- [ ] **T034**: Run Point 4 Request-a-Local E2E regression test suite (`backend/scripts/test_point4_e2e.py`).
  - **File**: `backend/scripts/test_point4_e2e.py`
  - **Depends on**: T031
  - **Implementation Intent**: Ensure Point 8 changes did not affect custom trip requests or quotes.
  - **Acceptance Criterion**: 14/14 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point4_e2e.py` exits with code 0.

- [ ] **T035**: Run Point 5 Reviews & Trust regression test suite (`backend/scripts/test_point5_e2e.py`).
  - **File**: `backend/scripts/test_point5_e2e.py`
  - **Depends on**: T031
  - **Implementation Intent**: Ensure Point 8 changes did not affect review moderation or ratings.
  - **Acceptance Criterion**: 14/14 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point5_e2e.py` exits with code 0.

- [ ] **T036**: Run Point 6 Revenue Engine regression test suite (`backend/scripts/test_point6_e2e.py`) and Point 7 SEO test suite (`backend/scripts/test_point7_e2e.py`).
  - **File**: `backend/scripts/test_point6_e2e.py`, `backend/scripts/test_point7_e2e.py`
  - **Depends on**: T031
  - **Implementation Intent**: Ensure Point 8 changes did not alter Point 6 core pricing or Point 7 SEO routes.
  - **Acceptance Criterion**: Point 6 (18/18) and Point 7 (18/18) tests pass with 100% success.
  - **Test Requirement**: Both test suites exit with code 0.

- [ ] **T037**: Execute frontend TypeScript typecheck (`npx tsc --noEmit`) and compile all backend Python modules.
  - **File**: Full workspace
  - **Depends on**: T031-T036
  - **Implementation Intent**: Ensure zero TypeScript type errors, syntax regressions, or broken imports across the entire repository.
  - **Acceptance Criterion**: 0 TypeScript errors and 0 Python compile errors.
  - **Test Requirement**: `npx tsc --noEmit` and `py_compile` exit with code 0.
