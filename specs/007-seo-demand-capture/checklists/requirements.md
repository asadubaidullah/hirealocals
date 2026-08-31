# Requirements Checklist: SPEC-07 — SEO & Marketplace Demand Capture

This checklist tracks requirements coverage, architectural integrity, technical SEO compliance, and demand telemetry accuracy for **SPEC-07: SEO & Marketplace Demand Capture**.

---

### 1. Country Hub Landing Pages (`/[country]`)

- [ ] **Canonical Route Handling:** `/uk` and `/usa` resolve with HTTP 200 server-rendered pages.
- [ ] **Invalid Country 404:** Non-supported country slugs (e.g. `/france`, `/xyz`) cleanly return HTTP 404 via `notFound()`.
- [ ] **Real Data Aggregation:** Country hub aggregates published `SeoCity` records and verified `LocalProfile` records for that country.
- [ ] **Country Metadata & OpenGraph:** Tailored `title`, `description`, `canonical`, and OpenGraph tags.
- [ ] **Structured Data:** Page includes `CollectionPage` and `BreadcrumbList` (`Home > Country`) JSON-LD schemas.

---

### 2. City Destination Preservation & Linking (`/[country]/[city]`)

- [ ] **Preserve Existing Architecture:** Existing `/[country]/[city]` routes remain fully backward compatible.
- [ ] **Bidirectional Country Linking:** City pages link back to the parent Country Hub (`/[country]`).
- [ ] **Category Cross-Navigation:** Direct contextual links from city pages to category and service offerings.

---

### 3. Canonical Category Landing Pages (`/experiences/[category]`)

- [ ] **Canonical Category Routes:** `/experiences/[category]` resolves for all active `ServiceCategory` taxonomy records.
- [ ] **Verified Local Listings:** Displays verified locals offering services within that category across destinations.
- [ ] **Canonical URL Tag:** `<link rel="canonical" href="https://hirealocals.com/experiences/[category]">`.
- [ ] **Breadcrumbs & Schema:** `BreadcrumbList` (`Home > Experiences > Category`) and `CollectionPage` JSON-LD schemas.
- [ ] **Invalid Category 404:** Non-existent category slugs return HTTP 404 via `notFound()`.

---

### 4. Local Profile Structured Data Hardening (`/locals/[slug]`)

- [ ] **`AggregateRating` Schema:** Injected only when `review_count > 0` with real rating value and count.
- [ ] **`Offer` Service Pricing Schema:** Real hourly rates and active service prices included in JSON-LD.
- [ ] **Individual `Review` Schema:** Verified reviews included in structured data with privacy-safe author names.
- [ ] **Zero Review Handling:** If a local has 0 reviews, `aggregateRating` is safely omitted (no false 5.0).

---

### 5. Robots.txt & Crawl Boundary Hardening

- [ ] **Public Marketplace Allowed:** Allows crawler access to `/`, `/destinations`, `/experiences`, country hubs, city pages, and local profiles.
- [ ] **Private Workspaces Disallowed:** Explicitly disallows `/dashboard/` and `/local-dashboard/`.
- [ ] **Admin & KYC Disallowed:** Explicitly disallows `/admin/` and `/kyc/`.
- [ ] **Backend API Disallowed:** Explicitly disallows `/api/`.
- [ ] **Sitemap Pointer:** Directly references canonical `https://hirealocals.com/sitemap.xml`.

---

### 6. Sitemap Generation & Query Control

- [ ] **Dynamic Sitemap Coverage:** Includes homepage, static routes, country hubs (`/uk`, `/usa`), published cities, published categories, verified locals, and blog posts.
- [ ] **Private Route Exclusions:** Zero dashboard, KYC, admin, or API routes in `sitemap.xml`.
- [ ] **Canonical Parameter Control:** `/explore?city=...` points canonical URL back to `/explore` to prevent search query index bloat.

---

### 7. Marketplace Search Demand & Zero-Result Telemetry

- [ ] **`SearchEvent` Database Model:** SQLModel table storing query, country, city, category, result count, and zero-result boolean.
- [ ] **Telemetry Logging in Search API:** `/api/search/locals` logs search events with real result counts.
- [ ] **Zero-Result Event Flagging:** Explicitly sets `is_zero_result = True` when result count is 0.
- [ ] **Privacy & Anonymization:** Logs anonymized `ip_hash`; zero passwords, emails, tokens, or KYC data stored.
- [ ] **Admin Demand Summary API:** `GET /api/admin/demand/summary` returns top searched cities, top searched categories, and zero-result rates.
- [ ] **Request-a-Local Bridge Preservation:** Traveler with 0 search results is seamlessly guided to pre-filled `/request-a-local` (Point 4 Frozen).

---

### 8. Strict Frozen Boundaries & Non-Goals

- [ ] **Points 1–6 Frozen:** KYC, 2FA, Local Workspace, Traveler Flow, Request-a-Local, Reviews & Trust, and Revenue Engine remain 100% frozen.
- [ ] **Safepay Exclusivity:** Zero modification to Safepay payment gateway or financial ledger.
- [ ] **No AI Mass Content:** Zero programmatic spam or fake text generation.
- [ ] **No Point 8 Command Center:** Point 8 Revenue Command Center remains untouched.

---

### 9. Acceptance Verification Coverage (18 Scenarios)

- [ ] **S01:** `/uk` country hub resolves with HTTP 200 and real data.
- [ ] **S02:** `/usa` country hub resolves with HTTP 200 and real data.
- [ ] **S03:** Invalid country slug (`/france`) returns HTTP 404.
- [ ] **S04:** Existing city page (`/uk/london`) remains functional with breadcrumbs.
- [ ] **S05:** Canonical category page (`/experiences/food-discovery`) resolves with HTTP 200.
- [ ] **S06:** Invalid category slug (`/experiences/non-existent`) returns HTTP 404.
- [ ] **S07:** Category page canonical tag points strictly to `/experiences/[category]`.
- [ ] **S08:** Local profile JSON-LD includes accurate `AggregateRating` when reviews exist.
- [ ] **S09:** Local profile JSON-LD includes service `Offer` pricing schemas.
- [ ] **S10:** Local profile with 0 reviews omits `AggregateRating` without error.
- [ ] **S11:** `robots.txt` disallows `/admin/`, `/dashboard/`, `/local-dashboard/`, `/kyc/`, `/api/`.
- [ ] **S12:** `sitemap.xml` contains all public SEO routes (countries, cities, categories, locals, blogs).
- [ ] **S13:** `sitemap.xml` strictly contains zero private, admin, or KYC routes.
- [ ] **S14:** Explore search query parameters do not cause canonical URL drift.
- [ ] **S15:** Bidirectional country <-> city <-> category links navigate correctly.
- [ ] **S16:** Search telemetry in `/api/search/locals` creates `SearchEvent` records.
- [ ] **S17:** Zero-result searches record `is_zero_result = True`.
- [ ] **S18:** Admin demand intelligence endpoint `GET /api/admin/demand/summary` returns accurate metrics.
