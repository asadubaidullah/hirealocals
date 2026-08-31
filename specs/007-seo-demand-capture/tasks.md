# Task List: SPEC-07 — SEO & Marketplace Demand Capture

**Specification**: [specs/007-seo-demand-capture/spec.md](spec.md)  
**Implementation Plan**: [specs/007-seo-demand-capture/plan.md](plan.md)  
**Checklist**: [specs/007-seo-demand-capture/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Ready for Implementation (Awaiting User Directive)  

---

## Task Organization & Dependencies

```
PHASE 0: Safety & Baseline (T001-T002)
   │
   ▼
PHASE 1: Search Demand Telemetry & Data Layer (T003-T005)
   │
   ▼
PHASE 2: Country Landing Hubs (T006-T008)
   │
   ▼
PHASE 3: Canonical Category Landing Pages (T009-T011)
   │
   ▼
PHASE 4: Local Profile Structured Data Hardening (T012-T013)
   │
   ▼
PHASE 5: Robots & Crawl Boundary Hardening (T014)
   │
   ▼
PHASE 6: Dynamic Sitemap Extension (T015)
   │
   ▼
PHASE 7: Internal Linking & Canonical Query Control (T016-T017)
   │
   ▼
PHASE 8: Zero-Result Telemetry Integration (T018)
   │
   ▼
PHASE 9: Admin Demand Intelligence Summary (T019)
   │
   ▼
PHASE 10: Responsive Styling & Performance (T020)
   │
   ▼
PHASE 11: Testing & Freeze Gate (T021-T027)
```

---

## Phase 0 — Safety & Baseline Preparation

- [ ] **T001**: Create timestamped pre-implementation backup directory under `backups/POINT7-PREP-<timestamp>/` containing current copies of `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/main.py`, `frontend/app/locals/[slug]/page.tsx`, `frontend/app/robots.ts`, `frontend/app/sitemap.ts`, `frontend/app/explore/page.tsx`, and `frontend/app/globals.css`.
  - **File**: `backups/POINT7-PREP-<timestamp>/`
  - **Depends on**: None
  - **Implementation Intent**: Safeguard active working state before modifying backend or frontend files.
  - **Acceptance Criterion**: Backup directory created outside `backend/` and `frontend/` containing intact copies of all targeted files.
  - **Test Requirement**: Verify backup directory existence and non-zero file sizes.

- [ ] **T002**: Verify baseline service health for backend daemon (`127.0.0.1:8000`), frontend dev server (`localhost:3000`), and SQLite database connectivity, confirming Points 1–6 frozen systems are intact.
  - **File**: Workspace environment
  - **Depends on**: T001
  - **Implementation Intent**: Ensure all daemons and test suites are functional before starting Point 7 changes.
  - **Acceptance Criterion**: HTTP 200 on `/api/locals` and `/explore`.
  - **Test Requirement**: `curl -I http://127.0.0.1:8000/api/locals` returns 200.

---

## Phase 1 — Search Demand Telemetry & Data Layer

- [ ] **T003**: Define `SearchEvent` SQLModel entity in `backend/app/models.py` with fields: `id`, `query`, `country_code`, `city_name`, `category`, `results_count`, `is_zero_result`, `user_id`, `ip_hash`, and `created_at`.
  - **File**: `backend/app/models.py`
  - **Depends on**: T002
  - **Implementation Intent**: Establish an append-only, privacy-safe search demand and zero-result tracking table.
  - **Acceptance Criterion**: `SearchEvent` model defined with appropriate column types, lengths, and indexes.
  - **Test Requirement**: Python import and SQLModel table metadata inspection.

- [ ] **T004**: Define `DemandSummaryResponse` Pydantic schemas in `backend/app/schemas.py` for structured demand intelligence responses.
  - **File**: `backend/app/schemas.py`
  - **Depends on**: T003
  - **Implementation Intent**: Provide strongly typed serialization for admin demand aggregation APIs.
  - **Acceptance Criterion**: `DemandSummaryResponse` schema defined with period, total searches, zero-result counts, zero-result percentage, and top lists.
  - **Test Requirement**: Schema validation test with sample mock data.

- [ ] **T005**: Integrate search event logging into `GET /api/search/locals` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T003, T004
  - **Implementation Intent**: Asynchronously record search queries, filters, result counts, and anonymized `ip_hash` (`hashlib.sha256`).
  - **Acceptance Criterion**: Non-empty searches persist a `SearchEvent` row with accurate `results_count` and `is_zero_result = (results_count == 0)`.
  - **Test Requirement**: Execute `/api/search/locals?city=London` and verify `SearchEvent` row insertion.

---

## Phase 2 — Country Landing Hubs

- [ ] **T006**: Create canonical Country Landing Hub page at `frontend/app/[country]/page.tsx` with dynamic routing, country slug validation (`uk`, `usa`), and `notFound()` for invalid slugs.
  - **File**: `frontend/app/[country]/page.tsx`
  - **Depends on**: T002
  - **Implementation Intent**: Fix the 404 error on `/uk` and `/usa` by providing a dedicated country hub page.
  - **Acceptance Criterion**: `/uk` and `/usa` resolve with HTTP 200; `/france` returns HTTP 404.
  - **Test Requirement**: Fetch `/uk`, `/usa`, and `/france` to verify status codes.

- [ ] **T007**: Implement real published city and verified local data aggregation in `frontend/app/[country]/page.tsx`.
  - **File**: `frontend/app/[country]/page.tsx`
  - **Depends on**: T006
  - **Implementation Intent**: Aggregate active `SeoCity` records and KYC-verified `LocalProfile` records for that specific country without fake counts.
  - **Acceptance Criterion**: Displays city cards, verified local cards, category exploration links, and practical travel context.
  - **Test Requirement**: Verify rendered HTML contains real destination names and local profile links.

- [ ] **T008**: Add `CollectionPage` and `BreadcrumbList` JSON-LD structured data and canonical metadata in `frontend/app/[country]/page.tsx`.
  - **File**: `frontend/app/[country]/page.tsx`
  - **Depends on**: T007
  - **Implementation Intent**: Provide rich search engine indexing directives and self-referencing canonical URLs (`/${country}`).
  - **Acceptance Criterion**: `<script type="application/ld+json">` output includes valid `CollectionPage` and `BreadcrumbList` (`Home > {CountryName}`).
  - **Test Requirement**: Validate JSON-LD structure using schema parser.

---

## Phase 3 — Canonical Category Landing Pages

- [ ] **T009**: Create canonical Category Landing Page at `frontend/app/experiences/[category]/page.tsx` resolving active `ServiceCategory` taxonomy records and enforcing `notFound()` for invalid slugs.
  - **File**: `frontend/app/experiences/[category]/page.tsx`
  - **Depends on**: T002
  - **Implementation Intent**: Provide indexable canonical landing pages for traveler intent categories (e.g. `/experiences/photo-walks`, `/experiences/food-discovery`).
  - **Acceptance Criterion**: Supported category slugs return HTTP 200; unsupported slugs return HTTP 404.
  - **Test Requirement**: Fetch `/experiences/photo-walks` (200) and `/experiences/invalid-slug` (404).

- [ ] **T010**: Implement real verified Local Partner listings by category and category hero value propositions in `frontend/app/experiences/[category]/page.tsx`.
  - **File**: `frontend/app/experiences/[category]/page.tsx`
  - **Depends on**: T009
  - **Implementation Intent**: Surface active locals offering services in that category across all active destinations, with destination pills and Request-a-Local custom CTA.
  - **Acceptance Criterion**: Renders category icon, title, description, destination filter pills, and verified local cards.
  - **Test Requirement**: Verify rendered local cards offer services matching the selected category.

- [ ] **T011**: Add self-referencing canonical tags, `BreadcrumbList`, and `CollectionPage` JSON-LD schemas in `frontend/app/experiences/[category]/page.tsx`.
  - **File**: `frontend/app/experiences/[category]/page.tsx`
  - **Depends on**: T010
  - **Implementation Intent**: Ensure search engines index canonical category pages without parameter duplication.
  - **Acceptance Criterion**: `<link rel="canonical" href=".../experiences/[category]">` present; JSON-LD contains `BreadcrumbList` (`Home > Experiences > {CategoryName}`).
  - **Test Requirement**: Validate metadata alternates and JSON-LD schema.

---

## Phase 4 — Local Profile Structured Data Hardening

- [ ] **T012**: Enrich JSON-LD schema generator in `frontend/app/locals/[slug]/page.tsx` with `AggregateRating` when `review_count > 0`, cleanly omitting it when `review_count == 0`.
  - **File**: `frontend/app/locals/[slug]/page.tsx`
  - **Depends on**: T002
  - **Implementation Intent**: Expose rich review ratings to search engines without creating false ratings on unreviewed profiles.
  - **Acceptance Criterion**: Profiles with reviews output `aggregateRating` (`ratingValue`, `reviewCount`, `bestRating: "5"`, `worstRating: "1"`); unreviewed profiles omit `aggregateRating`.
  - **Test Requirement**: Inspect JSON-LD on reviewed and unreviewed local profiles.

- [ ] **T013**: Add service `Offer` pricing schemas and individual `Review` schemas in `frontend/app/locals/[slug]/page.tsx`.
  - **File**: `frontend/app/locals/[slug]/page.tsx`
  - **Depends on**: T012
  - **Implementation Intent**: Provide rich snippet price ranges and individual review citations matching authoritative backend data.
  - **Acceptance Criterion**: Active services rendered as `offers` with `price`, `priceCurrency: "USD"`; visible reviews rendered as `Review` items.
  - **Test Requirement**: Validate JSON-LD against Schema.org specification.

---

## Phase 5 — Robots & Crawl Boundary Hardening

- [ ] **T014**: Update `frontend/app/robots.ts` to allow public marketplace surfaces while explicitly disallowing `/admin/`, `/dashboard/`, `/local-dashboard/`, `/kyc/`, and `/api/`.
  - **File**: `frontend/app/robots.ts`
  - **Depends on**: T002
  - **Implementation Intent**: Prevent search engines from crawling private traveler workspaces, host dashboards, KYC sessions, and backend APIs.
  - **Acceptance Criterion**: `/robots.txt` output includes disallow directives for all private paths while referencing `/sitemap.xml`.
  - **Test Requirement**: Fetch `/robots.txt` and assert rule contents.

---

## Phase 6 — Dynamic Sitemap Extension

- [ ] **T015**: Update `frontend/app/sitemap.ts` to dynamically include country hubs (`/uk`, `/usa`) and active canonical category pages (`/experiences/${category.slug}`).
  - **File**: `frontend/app/sitemap.ts`
  - **Depends on**: T006, T009
  - **Implementation Intent**: Ensure search engines discover all public SEO landing pages via dynamic XML sitemap.
  - **Acceptance Criterion**: `/sitemap.xml` contains homepage, country hubs, published cities, categories, verified locals, and blog posts with zero private URLs.
  - **Test Requirement**: Fetch `/sitemap.xml` and verify entry URLs.

---

## Phase 7 — Internal Linking & Canonical Query Control

- [ ] **T016**: Enhance bidirectional cross-linking between country hubs, city destination pages, category hubs, and local profiles.
  - **File**: `frontend/app/[country]/[city]/page.tsx`, `frontend/app/experiences/page.tsx`, `frontend/app/destinations/page.tsx`
  - **Depends on**: T006, T009
  - **Implementation Intent**: Create intuitive traveler navigation paths (`Country <-> City <-> Category <-> Local`) without link stuffing.
  - **Acceptance Criterion**: City pages link back to country hub; category links navigate to canonical category hubs.
  - **Test Requirement**: Verify link URLs in rendered pages.

- [ ] **T017**: Enforce strict self-referencing canonical URLs on `/explore` to prevent search filter query parameter index bloat.
  - **File**: `frontend/app/explore/page.tsx`
  - **Depends on**: T002
  - **Implementation Intent**: Ensure discovery filter queries (`/explore?city=London&service=Food`) do not dilute search indexation.
  - **Acceptance Criterion**: `<link rel="canonical" href=".../explore">` maintained regardless of query parameters.
  - **Test Requirement**: Verify canonical tag on `/explore?city=London`.

---

## Phase 8 — Zero-Result Telemetry Integration

- [ ] **T018**: Connect `search_locals` zero-result detection (`is_zero_result = True`) to existing Request-a-Local bridge without modifying Point 4 architecture.
  - **File**: `backend/app/main.py`, `frontend/components/ExploreClient.tsx`
  - **Depends on**: T005
  - **Implementation Intent**: Log zero-result demand when travelers encounter 0 matches on `/explore` while keeping the Request-a-Local bridge intact.
  - **Acceptance Criterion**: When search yields 0 items, `SearchEvent(is_zero_result=True)` is recorded and traveler sees the Request-a-Local pre-filled CTA.
  - **Test Requirement**: Execute empty search query and verify database row and UI bridge.

---

## Phase 9 — Admin Demand Intelligence Summary

- [ ] **T019**: Implement `GET /api/admin/demand/summary` in `backend/app/main.py`.
  - **File**: `backend/app/main.py`
  - **Depends on**: T005, T018
  - **Implementation Intent**: Provide administrators with real-time intelligence on top searched cities, top searched categories, and zero-result unmet demand rates across time horizons (`today`, `7d`, `30d`, `all_time`).
  - **Acceptance Criterion**: Endpoint requires `admin_user` dependency; returns accurate counts derived from authentic `SearchEvent` rows.
  - **Test Requirement**: Query `/api/admin/demand/summary` with admin token and verify JSON payload structure.

---

## Phase 10 — Responsive Styling & Performance

- [ ] **T020**: Add scoped styling in `frontend/app/globals.css` for country hub hero banners, destination grids, category landing cards, and breadcrumb trails.
  - **File**: `frontend/app/globals.css`
  - **Depends on**: T006, T009
  - **Implementation Intent**: Provide responsive, accessible styling matching the HireALocals design system across mobile and desktop viewports.
  - **Acceptance Criterion**: Clean rendering on mobile (375px), tablet (768px), and desktop (1200px) viewports with zero horizontal overflow.
  - **Test Requirement**: CSS validation and visual responsiveness check.

---

## Phase 11 — Automated Verification & Regression Testing

- [ ] **T021**: Create and execute `backend/scripts/test_point7_e2e.py` covering all 18 acceptance scenarios.
  - **File**: `backend/scripts/test_point7_e2e.py`
  - **Depends on**: T001-T020
  - **Implementation Intent**: Provide automated end-to-end verification of country hubs, canonical categories, structured data schemas, robots directives, sitemap completeness, search telemetry, and zero-result tracking.
  - **Acceptance Criterion**: 18/18 scenarios pass with zero failures.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point7_e2e.py` exits with code 0.

- [ ] **T022**: Run SPEC-01 KYC regression test suite (`backend/scripts/test_spec01_kyc.py`).
  - **File**: `backend/scripts/test_spec01_kyc.py`
  - **Depends on**: T021
  - **Implementation Intent**: Ensure Point 7 changes did not affect Didit KYC or manual verification.
  - **Acceptance Criterion**: 12/12 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_spec01_kyc.py` exits with code 0.

- [ ] **T023**: Run Point 3 Traveler Flow E2E regression test suite (`backend/scripts/test_point3_e2e.py`).
  - **File**: `backend/scripts/test_point3_e2e.py`
  - **Depends on**: T021
  - **Implementation Intent**: Ensure Point 7 changes did not affect traveler booking or Safepay checkout.
  - **Acceptance Criterion**: 14/14 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point3_e2e.py` exits with code 0.

- [ ] **T024**: Run Point 4 Request-a-Local E2E regression test suite (`backend/scripts/test_point4_e2e.py`).
  - **File**: `backend/scripts/test_point4_e2e.py`
  - **Depends on**: T021
  - **Implementation Intent**: Ensure Point 7 changes did not affect Request-a-Local quote submission or acceptance.
  - **Acceptance Criterion**: 14/14 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point4_e2e.py` exits with code 0.

- [ ] **T025**: Run Point 5 Reviews & Trust regression test suite (`backend/scripts/test_point5_e2e.py`).
  - **File**: `backend/scripts/test_point5_e2e.py`
  - **Depends on**: T021
  - **Implementation Intent**: Ensure Point 7 changes did not affect review reporting or rating recalculation.
  - **Acceptance Criterion**: 14/14 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point5_e2e.py` exits with code 0.

- [ ] **T026**: Run Point 6 Revenue Engine regression test suite (`backend/scripts/test_point6_e2e.py`).
  - **File**: `backend/scripts/test_point6_e2e.py`
  - **Depends on**: T021
  - **Implementation Intent**: Ensure Point 7 changes did not affect pricing calculations, promo codes, or referrals.
  - **Acceptance Criterion**: 18/18 tests pass.
  - **Test Requirement**: `py -3.14 backend/scripts/test_point6_e2e.py` exits with code 0.

- [ ] **T027**: Execute frontend TypeScript typecheck (`npx tsc --noEmit`) and compile all backend Python modules.
  - **File**: Full workspace
  - **Depends on**: T021-T026
  - **Implementation Intent**: Ensure zero TypeScript type errors, syntax regressions, or broken imports across the entire application.
  - **Acceptance Criterion**: 0 TypeScript errors and 0 Python compile errors.
  - **Test Requirement**: `npx tsc --noEmit` and `py_compile` exit with code 0.
