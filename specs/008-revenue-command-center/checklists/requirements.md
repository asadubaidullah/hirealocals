# Requirements Checklist: SPEC-08 — Admin Revenue Command Center

This checklist tracks requirements coverage, architectural integrity, financial accuracy, reconciliation safety, and security compliance for **SPEC-08: Admin Revenue Command Center**.

---

### 1. Executive Revenue KPIs & Overview

- [ ] **Gross Booking Value (GBV):** Accurate calculation summing customer total transacted amounts across paid bookings.
- [ ] **Net Platform Revenue:** Accurate calculation of collected platform fees minus promotional discount subsidies.
- [ ] **Effective Take Rate:** Accurate percentage calculation ($(\text{Net Revenue} / \text{Local Payables}) \times 100$).
- [ ] **Local Payables Guarantee:** 100% of local partner subtotal preserved and displayed as gross earnings liability.
- [ ] **Refund Volume & Count:** Aggregated sums of processed refunds derived directly from `PaymentRecord` entities.
- [ ] **Promo & Referral Cost:** Visibility into platform marketing burn (promo subsidies and referral credits).
- [ ] **Period-over-Period Delta:** Visual percentage ($\Delta\%$) and absolute change compared against prior equivalent period.

---

### 2. Time Range & Temporal Engine

- [ ] **Standard Presets:** Support for `today`, `7d`, `30d`, `90d`, `mtd`, `qtd`, and `all_time`.
- [ ] **Custom Date Ranges:** Support for `from_date` and `to_date` with inclusive UTC day boundaries.
- [ ] **Timezone Consistency:** All timestamps normalized and parsed with UTC timezone offsets.
- [ ] **Comparison Consistency:** Prior period automatically shifts by the exact duration of the selected window.

---

### 3. Time-Series Revenue Trends

- [ ] **Server-Side Trend Bucketing:** Daily, weekly, or monthly chronological buckets computed on the server.
- [ ] **Trend Metrics:** Buckets include GBV, Net Platform Revenue, Collected Fees, Discounts, and Refunds.
- [ ] **Zero-Data Smoothing:** Empty days/intervals in the range are filled with zero values rather than omitted.

---

### 4. Multi-Dimensional Revenue Segmentation

- [ ] **Revenue by City:** Aggregates GBV, booking counts, local payables, and net revenue by destination city.
- [ ] **Revenue by Category:** Aggregates GBV and booking volume across active service categories.
- [ ] **Revenue by Local Partner:** Ranks top-earning local partners by gross payout and platform fee yield.
- [ ] **Promotional Campaign ROI:** Aggregates redemption counts, discount burn, and generated GBV per promo code.
- [ ] **Referral Channel Yield:** Measures referral credits awarded vs referee booking volume generated.

---

### 5. Payment Lifecycle & Gateway Intelligence

- [ ] **Payment State Metrics:** Volume and count for `paid`, `processing`, `failed`, `refund_pending`, and `refunded`.
- [ ] **Payment Conversion Rates:** Calculates payment success rate, failure rate, and refund rate.
- [ ] **Gateway Linkage:** Links every payment record to its verified Safepay tracker token.

---

### 6. Financial Reconciliation Engine

- [ ] **Relational Cross-Referencing:** Validates linkages: `Booking` $\leftrightarrow$ `PaymentRecord` $\leftrightarrow$ `CommissionLedger`.
- [ ] **Discrepancy Status:** Classifies each transaction into `[Matched]`, `[Warning]`, or `[Mismatch]`.
- [ ] **Read-Only Detection:** Discrepancy reporting does not automatically mutate database balances.
- [ ] **Drilldown Navigation:** Allows admin to jump directly from a reconciliation record to the booking detail.

---

### 7. Payout Liabilities & Aging Analysis

- [ ] **Payout Status Distribution:** Summarizes funds in `held`, `unpaid`, `scheduled`, `paid`, and `void`.
- [ ] **Liability Aging Buckets:** Classifies unpaid and scheduled host earnings into `0-7d`, `8-14d`, `15-30d`, and `30d+` overdue.
- [ ] **Aging Calculation Basis:** Derived from booking completion date and payment confirmation timestamp.

---

### 8. Batch Settlement Operations

- [ ] **Multi-Record Selection:** Administrator can select multiple eligible settlements (`unpaid`).
- [ ] **Safe Status Transition:** Supports bulk transition to `scheduled` or `paid`.
- [ ] **Invalid Transition Protection:** Rejects batch operations on `void`, `paid`, or unconfirmed bookings.
- [ ] **Mandatory Audit Logging:** Every updated record generates an `AuditLog` row with admin ID and reference note.

---

### 9. Secure Financial Exports

- [ ] **Executive Revenue Summary CSV:** Downloads sanitized summary metrics for the selected time range.
- [ ] **Settlement Manifest CSV:** Downloads bank-ready local payout liabilities with reference notes.
- [ ] **Reconciliation Ledger CSV:** Downloads booking-level financial reconciliation mapping.
- [ ] **Marketing & Promotion CSV:** Downloads promo code utilization and referral reward costs.
- [ ] **Sanitization & Security:** Zero passwords, auth tokens, KYC documents, or API secrets in exported files.

---

### 10. Admin Navigation & Interface (`/admin/revenue`)

- [ ] **Dedicated Command Center Route:** `/admin/revenue` accessible to administrators.
- [ ] **Admin Sidebar Navigation:** Primary "Revenue" link added to `AdminSidebar.tsx`.
- [ ] **Existing Admin Areas Preserved:** `/admin/payments` and `/admin/commission` remain functional.
- [ ] **Responsive Design:** Clear layout on mobile, tablet, and desktop viewports.

---

### 11. Security, Authorization & Privacy

- [ ] **Strict Role-Based Access:** All endpoints enforce `Depends(admin_user)`.
- [ ] **Forbidden for Non-Admins:** Tourists and Local Partners receive HTTP 403 Forbidden.
- [ ] **Server-Side Authoritative Truth:** Browser never dictates financial sums or balances.
- [ ] **Zero Sensitive Data Exposure:** Secrets and private KYC records strictly redacted from responses.

---

### 12. Strict Boundaries & Non-Goals

- [ ] **Frozen Systems Unchanged:** Points 1–7 (KYC, 2FA, Local Workspace, Traveler Flow, Request-a-Local, Reviews, Revenue Engine, SEO) remain 100% frozen.
- [ ] **Safepay Exclusivity:** Zero modification to Safepay core integration; no new payment gateways.
- [ ] **No Speculative Forecasting:** Zero machine-learning financial predictions or external ad-network scrapers.
- [ ] **No Fake Financial Activity:** All metrics derive strictly from authentic database records.

---

### 13. Acceptance Verification Coverage (28 Scenarios)

- [ ] **S01:** Non-admin blocked from revenue command center with HTTP 403.
- [ ] **S02:** Executive KPIs match authentic database sums.
- [ ] **S03:** Period-over-period comparison ($\Delta\%$) calculates accurately.
- [ ] **S04:** 90-day filter restricts data strictly to past 90 days.
- [ ] **S05:** Month-to-Date (MTD) filter restricts data from 1st of month.
- [ ] **S06:** Quarter-to-Date (QTD) filter restricts data from start of quarter.
- [ ] **S07:** Custom date range (`from_date` / `to_date`) filters accurately.
- [ ] **S08:** GBV time-series trend bucketing is chronological and accurate.
- [ ] **S09:** Net Platform Revenue trend bucketing is chronological and accurate.
- [ ] **S10:** City revenue segmentation aggregates GBV and volume by city.
- [ ] **S11:** Service category segmentation aggregates GBV and volume by category.
- [ ] **S12:** Local partner ranking ranks top hosts by gross earnings.
- [ ] **S13:** Promo campaign ROI measures discount burn vs generated GBV.
- [ ] **S14:** Referral channel yield measures reward costs vs referee bookings.
- [ ] **S15:** Payment lifecycle analytics report success/failure/refund rates.
- [ ] **S16:** Unified reconciliation correctly matches intact transactions.
- [ ] **S17:** Discrepancy detection flags mismatched sums or missing records.
- [ ] **S18:** Payout liability aging categorizes overdue payouts into aging buckets.
- [ ] **S19:** Eligible batch payout transitions status to scheduled/paid atomically.
- [ ] **S20:** Invalid batch payout transition on void/paid entries is rejected.
- [ ] **S21:** Executive revenue summary CSV export downloads valid formatted CSV.
- [ ] **S22:** Local settlement manifest CSV export downloads valid formatted CSV.
- [ ] **S23:** Transaction reconciliation ledger CSV export downloads valid formatted CSV.
- [ ] **S24:** Marketing/promo cost CSV export downloads valid formatted CSV.
- [ ] **S25:** Drill-down links preserve admin authorization.
- [ ] **S26:** Financial mutations and exports write persistent AuditLog rows.
- [ ] **S27:** CSV exports and API payloads contain zero sensitive tokens or secrets.
- [ ] **S28:** Prior regression suites (SPEC-01, Points 3, 4, 5, 6, 7) pass 100%.
