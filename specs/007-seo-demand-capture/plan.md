# Implementation Plan: SPEC-07 — SEO & Marketplace Demand Capture

**Feature ID**: `SPEC-07`  
**Specification**: [specs/007-seo-demand-capture/spec.md](spec.md)  
**Checklist**: [specs/007-seo-demand-capture/checklists/requirements.md](checklists/requirements.md)  
**Branch**: `master`  
**Status**: Implementation Plan Draft / Ready for Tasks  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Travelers, Local Partners, Search Engine Crawlers, Administrators  
**Dependencies**: Point 1 (KYC & Trust), Point 2 (Local Workspace), Point 3 (Traveler Flow), Point 4 (Request-a-Local), Point 5 (Reviews & Trust), Point 6 (Revenue Engine)  

---

## 1. Architecture Overview & Guarantees

This implementation plan establishes a crawlable public marketplace hierarchy (`Country -> City -> Category -> Local Partner`) and implements privacy-safe search demand telemetry for **Point 7: SEO + Marketplace Demand Capture**.

### Grounding in Existing Foundations:
- **Reuse Global Metadata & Schemas**: Preserves `metadataBase`, OpenGraph generation, and `Organization` / `WebSite` JSON-LD in [`RootLayout`](file:///c:/laragon/www/hirealocals/frontend/app/layout.tsx).
- **Preserve Existing Destination Hierarchy**: Existing `SeoCity` models and city pages at `/[country]/[city]` remain 100% backward-compatible.
- **Preserve Local Profiles & Review Engine**: Existing `/locals/[slug]` profile views and Point 5 verified review systems remain untouched, extending only structured data (JSON-LD).
- **Preserve Request-a-Local Zero-Result Bridge**: Point 4 Request-a-Local workflow remains completely frozen; Point 7 adds server-side telemetry measurement.
- **Maintain Frozen Scope**: Points 1 through 6 remain strictly frozen.

```
+-----------------------------------------------------------------------------------------+
|                               TECHNICAL ARCHITECTURE                                    |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
| 1. DATA LAYER (backend/app/models.py & schemas.py)                                      |
|    - SearchEvent [NEW]: Telemetry table tracking queries, filters, and zero results     |
|    - DemandSummaryResponse [NEW]: Pydantic schema for admin intelligence                |
|                                                                                         |
| 2. PUBLIC ROUTING & SEO PAGES (frontend/app/)                                           |
|    - /[country]/page.tsx [NEW]: Canonical country hubs (/uk, /usa)                      |
|    - /experiences/[category]/page.tsx [NEW]: Canonical category landing pages           |
|    - /locals/[slug]/page.tsx [MODIFY]: Enriched with AggregateRating & Offer schemas    |
|    - robots.ts [MODIFY]: Hardened with disallow rules for dashboards, KYC, and API      |
|    - sitemap.ts [MODIFY]: Extended to index country hubs and canonical categories       |
|                                                                                         |
| 3. SEARCH & TELEMETRY ENGINE (backend/app/main.py)                                      |
|    - GET /api/search/locals: Logs SearchEvent with is_zero_result flag                   |
|    - GET /api/admin/demand/summary [NEW]: Multi-period search demand intelligence        |
|                                                                                         |
| 4. VERIFICATION & TEST SUITE (backend/scripts/test_point7_e2e.py)                       |
|    - 18 automated E2E scenarios verifying routes, schemas, robots, sitemap & telemetry  |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Proposed Changes & Component Breakdown

### 2.1 Backend Data & Telemetry Foundation

#### [MODIFY] `backend/app/models.py`
- Add `SearchEvent` SQLModel entity:
  ```python
  class SearchEvent(SQLModel, table=True):
      """Telemetry record measuring marketplace search queries and unmet demand."""
      id: Optional[int] = Field(default=None, primary_key=True)
      query: str = Field(default="", index=True, max_length=200)
      country_code: str = Field(default="", index=True, max_length=2)
      city_name: str = Field(default="", index=True, max_length=120)
      category: str = Field(default="", index=True, max_length=80)
      results_count: int = Field(default=0, index=True)
      is_zero_result: bool = Field(default=False, index=True)
      user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
      ip_hash: str = Field(default="", index=True, max_length=64)
      created_at: datetime = Field(default_factory=utcnow, index=True)
  ```

#### [MODIFY] `backend/app/schemas.py`
- Add `DemandSummaryResponse` Pydantic model for admin intelligence responses.

#### [MODIFY] `backend/app/main.py`
- In `GET /api/search/locals`:
  - Calculate `results_count = len(rows)`.
  - Record a `SearchEvent` record if `q`, `country`, `city`, or `category` are present.
  - Set `is_zero_result = (results_count == 0)`.
  - Hash IP address using SHA-256 (`ip_hash = hashlib.sha256((request.client.host or "").encode()).hexdigest()[:16]`).
- Add `GET /api/admin/demand/summary`:
  - Enforce `admin_user` dependency.
  - Support `period` filtering (`today`, `7d`, `30d`, `all_time`).
  - Aggregate total searches, zero-result counts, zero-result percentage, top searched cities, and top searched categories.

---

### 2.2 Frontend Public Surfaces & SEO Routing

#### [NEW] `frontend/app/[country]/page.tsx`
- Implement canonical Country Landing Hub:
  - Supported URL slugs: `uk` (United Kingdom) and `usa` (United States).
  - Unconfigured country slugs trigger `notFound()`.
  - Queries published cities (`/api/content/cities?country={country}`) and verified locals (`/api/locals?country={country}`).
  - Renders country hero banner, active destination cards, top verified locals, category shortcuts, practical country travel advice, and related travel guides.
  - Implements dynamic `generateMetadata` with canonical tag (`/${country}`).
  - Injects `CollectionPage` and `BreadcrumbList` (`Home > {CountryName}`) JSON-LD schemas.

#### [NEW] `frontend/app/experiences/[category]/page.tsx`
- Implement canonical Category Landing Page:
  - Validates category against active `ServiceCategory` items (e.g. `food-discovery`, `photo-walks`, `city-orientation`, `nightlife`, `shopping`, `family-friendly`).
  - Unconfigured category slugs trigger `notFound()`.
  - Queries verified locals offering that category (`/api/locals?category={category}`).
  - Renders category hero, value proposition, destination pills, verified local cards, and Request-a-Local custom CTA.
  - Implements dynamic `generateMetadata` with canonical tag (`/experiences/${category}`).
  - Injects `CollectionPage` and `BreadcrumbList` (`Home > Experiences > {CategoryName}`) JSON-LD schemas.

#### [MODIFY] `frontend/app/locals/[slug]/page.tsx`
- Enhance structured data generator:
  - Check `l.reviews > 0`. If true, inject `aggregateRating` into `Person` schema:
    ```json
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": l.rating,
      "reviewCount": l.reviews,
      "bestRating": "5",
      "worstRating": "1"
    }
    ```
  - If `l.reviews == 0`, omit `aggregateRating` (no synthetic default).
  - Inject active services into `offers` array with `price`, `priceCurrency: "USD"`, and service name.
  - Include individual `Review` schemas for visible verified traveler reviews.

#### [MODIFY] `frontend/app/robots.ts`
- Update robots directives:
  ```typescript
  export default function robots(): MetadataRoute.Robots {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/local-dashboard/",
          "/kyc/",
          "/api/"
        ]
      },
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl
    };
  }
  ```

#### [MODIFY] `frontend/app/sitemap.ts`
- Extend dynamic sitemap entries:
  - Add country hub URLs: `${siteUrl}/uk` and `${siteUrl}/usa`.
  - Add category URLs: `${siteUrl}/experiences/${category.slug}` for all active `ServiceCategory` items.
  - Maintain existing static routes, city pages, verified local profiles, and blog posts.
  - Ensure zero private, dashboard, KYC, or admin URLs are emitted.

#### [MODIFY] `frontend/app/globals.css`
- Add scoped styles for Country Hub headers, destination pill grids, and category landing hero cards.

---

## 3. Database & Schema Migration Strategy

1. **Table Creation (`create_db_and_tables`)**:
   - `SearchEvent` table will be created automatically on startup by SQLModel in `backend/app/database.py`.
2. **Index Optimization**:
   - Indexed fields: `query`, `country_code`, `city_name`, `category`, `is_zero_result`, `created_at`.
   - Ensures high-performance aggregation in `admin_demand_summary` without blocking API workers.
3. **Data Retention & Privacy**:
   - Stores zero plaintext IP addresses, session cookies, passwords, or KYC data.
   - Anonymized `ip_hash` prevents duplicate bot amplification.

---

## 4. Test Strategy & Acceptance Matrix

### Point 7 E2E Test Suite (`backend/scripts/test_point7_e2e.py`)
Implement an 18-scenario automated verification script:

1. **Scenario 01**: `/uk` country hub resolves with HTTP 200 and real data.
2. **Scenario 02**: `/usa` country hub resolves with HTTP 200 and real data.
3. **Scenario 03**: Unsupported country slug (`/france`) cleanly returns HTTP 404 (`notFound`).
4. **Scenario 04**: Existing city destination page (`/uk/london`) remains functional with breadcrumbs.
5. **Scenario 05**: Canonical category page (`/experiences/food-discovery`) resolves with HTTP 200.
6. **Scenario 06**: Unsupported category slug (`/experiences/non-existent`) returns HTTP 404.
7. **Scenario 07**: Category page canonical tag points strictly to `/experiences/[category]`.
8. **Scenario 08**: Local profile JSON-LD includes accurate `AggregateRating` when reviews exist.
9. **Scenario 09**: Local profile JSON-LD includes service `Offer` pricing schemas matching backend prices.
10. **Scenario 10**: Local profile with 0 reviews omits `AggregateRating` without error.
11. **Scenario 11**: `robots.txt` output disallows `/admin/`, `/dashboard/`, `/local-dashboard/`, `/kyc/`, `/api/`.
12. **Scenario 12**: `sitemap.xml` output contains public routes (countries, cities, categories, locals, blogs).
13. **Scenario 13**: `sitemap.xml` strictly contains zero private, admin, or KYC routes.
14. **Scenario 14**: Explore search query parameters do not cause canonical URL drift.
15. **Scenario 15**: Bidirectional country $\leftrightarrow$ city $\leftrightarrow$ category navigation links navigate cleanly.
16. **Scenario 16**: Search telemetry in `/api/search/locals` creates `SearchEvent` records.
17. **Scenario 17**: Zero-result searches record `is_zero_result = True`.
18. **Scenario 18**: Admin demand intelligence endpoint `GET /api/admin/demand/summary` returns accurate metrics.

### Full Regression Testing:
- SPEC-01 KYC Suite (`test_spec01_kyc.py`): 12/12 PASS
- Point 3 Traveler Flow Suite (`test_point3_e2e.py`): 14/14 PASS
- Point 4 Request-a-Local Suite (`test_point4_e2e.py`): 14/14 PASS
- Point 5 Reviews & Trust Suite (`test_point5_e2e.py`): 14/14 PASS
- Point 6 Revenue Engine Suite (`test_point6_e2e.py`): 18/18 PASS
- TypeScript Typecheck (`npx tsc --noEmit`): 0 ERRORS
- Python Bytecode Compilation (`py_compile`): 0 ERRORS

---

## 5. Implementation Dependency Order

```
Phase 0: Safety & Baseline
  - Clean Git status verification
  - Timestamped pre-implementation backup

Phase 1: Telemetry Data Models & Search Logging
  - Define SearchEvent model in models.py
  - Add search event recording to /api/search/locals in main.py
  - Add GET /api/admin/demand/summary in main.py

Phase 2: Country Landing Hubs
  - Create frontend/app/[country]/page.tsx
  - Add country metadata, breadcrumb schema, and real city/local aggregation
  - Enforce 404 on unconfigured country slugs

Phase 3: Canonical Category Landing Pages
  - Create frontend/app/experiences/[category]/page.tsx
  - Add category metadata, canonical tags, and verified local listings
  - Enforce 404 on invalid categories

Phase 4: Structured Data & Robots/Sitemap Hardening
  - Enrich /locals/[slug]/page.tsx with AggregateRating, Offer, and Review schemas
  - Update robots.ts with private route disallow rules
  - Update sitemap.ts to index country hubs and categories

Phase 5: Styling & UI Polish
  - Add scoped CSS rules in globals.css for country hubs and category cards

Phase 6: Automated Verification & Freeze
  - Run test_point7_e2e.py (18/18)
  - Run all regression suites (SPEC-01, Point 3, Point 4, Point 5, Point 6)
  - Run TypeScript and Python compilation checks
  - Final independent review & freeze
```

---

## 6. Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Duplicate Indexable URLs** | Search engine crawl budget waste / canonical dilution | Enforce strict self-referencing canonical tags on category and country pages; keep search queries on `/explore` canonicalized to `/explore`. |
| **Search Telemetry Table Bloat** | Unnecessary database growth | Store only minimal attributes (`query`, `city`, `category`, `results_count`, `is_zero_result`); apply daily IP hashing. |
| **Fake Structured Data Penalties** | Search engine rich snippet penalties | Omit `AggregateRating` when review count is 0; generate `Offer` prices directly from verified backend records. |
| **Regressing Request-a-Local** | Point 4 flow breakage | Request-a-Local code remains untouched; Point 7 connects only via URL search params on zero-result cards. |

---

## 7. Strict Point 8 Boundary Enforcement

Point 8 (Revenue Command Center / Marketplace Operations Hub) is strictly separated from Point 7:
- Point 7 implements **Search Demand & Zero-Result Telemetry** and a lightweight `GET /api/admin/demand/summary` endpoint.
- Point 7 does **NOT** build the complete multi-dimensional analytics dashboard, payout approval engine, or financial forecasting tools reserved for Point 8.
