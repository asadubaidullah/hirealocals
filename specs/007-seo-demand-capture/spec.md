# Feature Specification: SPEC-07 — SEO & Marketplace Demand Capture

**Feature ID**: `SPEC-07`  
**Feature Branch**: `master`  
**Created**: 2026-08-31  
**Status**: Specification Complete / Ready for Planning  
**Target Marketplace**: United Kingdom (GB), United States (US), Global Destinations  
**Primary Actors**: Travelers (Search Engine & Direct Visitors), Local Partners, Marketplace Administrators, Search Engine Crawlers (Googlebot, Bingbot)  
**Dependencies**: Point 1 (KYC & Trust), Point 2 (Local Workspace), Point 3 (Traveler Flow), Point 4 (Request-a-Local), Point 5 (Reviews & Trust), Point 6 (Revenue Engine)  

---

## 1. Executive Summary & Business Objective

To achieve sustainable organic marketplace liquidity, HireALocals requires a coherent, crawlable public marketplace hierarchy and an authoritative demand-capture loop. Organic travelers discover guided travel by geography (Country, City) or by specific interest (Photography, Food, Orientation, History).

While prior points implemented individual pieces (database-driven `SeoCity` landing pages, rich Local profiles, and a zero-result Request-a-Local bridge), the public architecture exhibits notable gaps:
1. **Broken Country Hubs**: Country routes (`/uk` and `/usa`) return HTTP 404 because `frontend/app/[country]` only contains `[city]/page.tsx` without a country-level `page.tsx`.
2. **Missing Canonical Category Pages**: `/experiences` links solely to client-filtered search parameters (`/explore?service=...`) rather than indexable canonical pages (`/experiences/[category]`).
3. **Robots.txt Exposure**: `robots.txt` disallows `/admin/` but fails to explicitly exclude private traveler dashboards (`/dashboard/`), local partner workspaces (`/local-dashboard/`), identity verification (`/kyc/`), and backend API endpoints (`/api/`).
4. **Local Profile Structured Data Gaps**: Local profiles provide `Person` schema but lack `AggregateRating`, `Review`, and service `Offer` pricing structured data.
5. **Passive Demand Blind Spots**: When travelers perform searches that yield zero results on `/explore`, no telemetry is captured unless they complete a `TripRequest`. The marketplace cannot measure latent demand across unserved cities or categories.

**SPEC-07** establishes a crawlable, high-relevance marketplace hierarchy (`Country -> City -> Category -> Local Partner`) and implements privacy-safe search demand telemetry while keeping all frozen systems strictly intact.

```
+-----------------------------------------------------------------------------------+
|                     SPEC-07 PUBLIC MARKETPLACE HIERARCHY                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. COUNTRY HUBS (/uk, /usa)                                                      |
|     - Aggregates real published cities, verified locals, country travel guides     |
|     - JSON-LD CollectionPage + BreadcrumbList                                     |
|                                                                                   |
|  2. CITY DESTINATIONS (/[country]/[city], e.g. /uk/london)                        |
|     - Local cards, local insights, category filters, related guides               |
|     - Cross-links to country hub and category landings                            |
|                                                                                   |
|  3. CATEGORY / EXPERIENCE HUBS (/experiences/[category], e.g. /experiences/food)  |
|     - Canonical landing for specific travel intent across active cities           |
|     - Curated local listings, category value propositions                         |
|                                                                                   |
|  4. VERIFIED LOCAL PROFILES (/locals/[slug])                                      |
|     - Person + AggregateRating + Review + Offer JSON-LD schema                    |
|     - Verified badge, booking box, verified reviews, repeat booking               |
|                                                                                   |
|  5. SEARCH & DEMAND TELEMETRY (/explore & /api/search/locals)                     |
|     - Clean canonical query parameter control                                     |
|     - SearchEvent telemetry logging query, city, category, result count           |
|     - Zero-Result Bridge -> Request-a-Local (Point 4 Frozen Flow)                 |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Scope & Boundaries

### Included in Point 7:
- **Country Landing Hubs (`/[country]/page.tsx`)**: Canonical server-rendered hubs for `/uk` and `/usa` displaying real published cities, verified locals, travel guides, and breadcrumbs.
- **City Landing Page Enhancements**: Bidirectional cross-linking between country hubs, cities, and service categories without breaking existing `/[country]/[city]` structure.
- **Canonical Category Landing Pages (`/experiences/[category]/page.tsx`)**: Canonical indexable pages for active service categories (e.g. `/experiences/photo-walks`, `/experiences/food-discovery`) featuring verified locals and category context.
- **Local Profile Structured Data Enhancements**: Addition of `AggregateRating`, `Review`, and service `Offer` pricing schemas to `/locals/[slug]`.
- **Robots & Crawlability Hardening**: Updating `robots.ts` to allow public indexable paths while disallowing `/admin/`, `/dashboard/`, `/local-dashboard/`, `/kyc/`, and `/api/`.
- **Dynamic Sitemap Extension**: Updating `sitemap.ts` to include verified country hubs and canonical category pages alongside existing cities, locals, and blog posts.
- **Marketplace Demand & Zero-Result Telemetry**: Lightweight, privacy-safe logging of search events (`SearchEvent` entity) in `search_locals` to measure real search volume and zero-result demand by city and category.
- **Admin Demand Intelligence Summary**: `GET /api/admin/demand/summary` providing administrative insights into top searched cities, top searched categories, and zero-result demand hotspots.

### Explicitly Excluded (Non-Goals):
- **AI SEO / Automated Content Generation**: No programmatic mass generation of hundreds of thin pages or synthetic content.
- **Link Farms & Keyword Stuffing**: All internal linking must be natural, contextual, and user-facing.
- **Fake Metrics & Synthetic Traffic**: No fabricated search counts, page views, ratings, or demand data.
- **Payment & Booking Workflow Modifications**: Safepay payments, pricing calculations, and CommissionLedger remain 100% frozen (Point 6).
- **Request-a-Local Architectural Redesign**: The Request-a-Local feature remains 100% frozen (Point 4); Point 7 only measures zero-result demand.
- **Protected System Redesigns**: KYC (Didit), 2FA, Local Workspace, Traveler Flow, and Reviews & Trust remain untouched.
- **Point 8 Revenue Command Center**: Point 8 must not start.

---

## 3. User Stories & Acceptance Scenarios

### User Story 1 — Traveler Navigates Country Hubs (Priority: P1)
**As a** prospective Traveler planning a trip to the UK or USA,  
**I want to** visit dedicated country hubs at `/uk` and `/usa`,  
**So that I can** explore available cities, see active local guides, and read country-level travel planning context.

#### Acceptance Scenarios:
1. **Route Resolution:** Navigating to `/uk` and `/usa` returns HTTP 200 with server-rendered content (no 404).
2. **Real Data Aggregation:** Country page renders only published `SeoCity` records and KYC-verified `LocalProfile` records belonging to that country.
3. **Structured Data:** Page includes valid `CollectionPage` and `BreadcrumbList` JSON-LD schemas.
4. **Metadata & OpenGraph:** Country page includes customized `title`, `description`, `canonical`, and OpenGraph tags.
5. **Invalid Country 404:** Navigating to an unconfigured country slug (e.g. `/france` or `/xyz`) cleanly triggers `notFound()`.

---

### User Story 2 — Traveler Explores Canonical Category Pages (Priority: P1)
**As a** Traveler with a specific travel interest (e.g. Food, Photography, Nightlife),  
**I want to** visit dedicated category landing pages at `/experiences/[category]`,  
**So that I can** discover verified locals who offer services in that category across supported destinations.

#### Acceptance Scenarios:
1. **Canonical Route Resolution:** Navigating to `/experiences/food-tours` or `/experiences/photography` returns HTTP 200.
2. **Verified Supply Listings:** Renders active local partners who have active services in that taxonomy category.
3. **Canonical Linkage:** Canonical tag points strictly to `/experiences/[category]`.
4. **Breadcrumbs:** Semantic breadcrumb navigation (`Home > Experiences > Category Name`).
5. **Invalid Category 404:** Navigating to a non-existent category slug cleanly returns 404.

---

### User Story 3 — Search Engine Crawls Rich Local Profile Schema (Priority: P1)
**As a** Search Engine Crawler indexing `/locals/[slug]`,  
**I want to** parse accurate schema.org structured data,  
**So that I can** display rich snippets (ratings, review counts, pricing) in search engine result pages (SERPs).

#### Acceptance Scenarios:
1. **AggregateRating Schema:** If `review_count > 0`, JSON-LD includes `aggregateRating` with `ratingValue`, `reviewCount`, `bestRating: "5"`, `worstRating: "1"`.
2. **Service Offers Schema:** Services on the profile are included as `offers` with `price`, `priceCurrency: "USD"`, and `description`.
3. **Zero Fake Data:** If a local has 0 reviews, `aggregateRating` is cleanly omitted (no synthetic 5.0 rating).
4. **Verified Experience Reviews:** Visible reviews include individual `Review` schemas with author attribution and rating.

---

### User Story 4 — Search Engines Respect Crawl Boundaries (Priority: P1)
**As a** Search Engine Spider visiting `hirealocals.com`,  
**I want to** follow clear directives in `robots.txt` and `sitemap.xml`,  
**So that I** index only public marketplace landing pages and avoid crawling private dashboards, auth, or API routes.

#### Acceptance Scenarios:
1. **Robots Exclusions:** `robots.txt` explicitly disallows `/admin/`, `/dashboard/`, `/local-dashboard/`, `/kyc/`, and `/api/`.
2. **Sitemap Completeness:** `sitemap.xml` contains `/`, `/explore`, `/destinations`, `/experiences`, country hubs (`/uk`, `/usa`), published cities, published categories, verified locals, and blog posts.
3. **Sitemap Cleanliness:** `sitemap.xml` strictly contains zero URLs from `/dashboard/`, `/admin/`, `/kyc/`, or `/api/`.

---

### User Story 5 — Platform Measures Unmet Traveler Demand (Priority: P1)
**As a** Marketplace Administrator,  
**I want to** measure search queries and zero-result events by city and category,  
**So that I can** identify where travelers want locals but supply is currently missing.

#### Acceptance Scenarios:
1. **Search Event Logging:** Calls to `/api/search/locals` log search criteria (`q`, `city`, `category`, `results_count`, `is_zero_result`).
2. **Zero-Result Flagging:** Searches returning 0 results are explicitly flagged with `is_zero_result = True`.
3. **Privacy Protection:** Telemetry logs anonymized IP hashes (`ip_hash`) and strictly excludes user passwords, emails, tokens, or KYC data.
4. **Admin Demand Summary:** Admin endpoint `GET /api/admin/demand/summary` returns top searched cities, top searched categories, and zero-result search counts.
5. **Zero-Result Bridge Preservation:** Traveler experiencing zero results on `/explore` continues to see the Request-a-Local bridge card pre-filled with their search parameters.

---

## 4. Technical Architecture & Requirements

### 4.1 Country Hub Landing Pages (`frontend/app/[country]/page.tsx`)
1. **Path Structure**: `frontend/app/[country]/page.tsx` handles valid country URL slugs (`uk`, `usa`).
2. **Data Fetching**:
   - Matches country by `country_slug` or `country_code` against `SeoCity`.
   - Fetches published cities in that country (`/api/content/cities?country=...`).
   - Fetches verified locals in that country (`/api/locals?country=...`).
   - Fetches related blog articles mentioning the country.
3. **Layout & Content**:
   - Hero header with country badge, total destination count, and verified locals count.
   - City destination cards linking to `/[country]/[city]`.
   - Featured verified local guides in that country.
   - Category exploration links.
   - SEO travel context and practical travel tips.
4. **Structured Data**:
   ```json
   {
     "@context": "https://schema.org",
     "@graph": [
       {
         "@type": "CollectionPage",
         "name": "Hire a Local in United Kingdom",
         "description": "Find trusted locals for private travel experiences in UK cities.",
         "url": "https://hirealocals.com/uk"
       },
       {
         "@type": "BreadcrumbList",
         "itemListElement": [
           { "@type": "ListItem", "position": 1, "name": "HireALocals", "item": "https://hirealocals.com" },
           { "@type": "ListItem", "position": 2, "name": "United Kingdom", "item": "https://hirealocals.com/uk" }
         ]
       }
     ]
   }
   ```

### 4.2 Canonical Category Landing Pages (`frontend/app/experiences/[category]/page.tsx`)
1. **Path Structure**: `frontend/app/experiences/[category]/page.tsx` matches taxonomy slugs (e.g. `food-discovery`, `photo-walks`, `city-orientation`, `nightlife`).
2. **Data Fetching**:
   - Resolves category via `ServiceCategory` table.
   - Fetches locals offering services in that category across all active destinations (`/api/locals?category=...`).
3. **Layout & Content**:
   - Category title, icon, and tailored value proposition.
   - Destination pills linking to city pages where this service is available.
   - Grid of verified locals offering this category.
   - Request-a-Local callout if traveler desires custom arrangements in that category.
4. **Structured Data**: `CollectionPage` + `BreadcrumbList` (`Home > Experiences > Category`).

### 4.3 Local Profile Structured Data (`frontend/app/locals/[slug]/page.tsx`)
Enrich existing JSON-LD with:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "name": "James Wilson — Local in London",
      "url": "https://hirealocals.com/locals/james-wilson-london",
      "mainEntity": {
        "@type": "Person",
        "name": "James Wilson",
        "image": "https://...",
        "homeLocation": { "@type": "Place", "name": "London" },
        "knowsLanguage": ["English", "French"],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": 4.9,
          "reviewCount": 18,
          "bestRating": "5",
          "worstRating": "1"
        },
        "offers": [
          {
            "@type": "Offer",
            "name": "Historical London Walk",
            "price": "60.00",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock"
          }
        ]
      }
    }
  ]
}
```

### 4.4 Robots.txt Hardening (`frontend/app/robots.ts`)
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

### 4.5 Dynamic Sitemap Extension (`frontend/app/sitemap.ts`)
Add:
- Country Hubs: `/uk`, `/usa`
- Category Pages: `/experiences/${category.slug}` for all active `ServiceCategory` items.

---

## 5. Database Models & Schema Extensions

### 5.1 SearchEvent Model (`backend/app/models.py`)
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
    user_agent: str = Field(default="", max_length=255)
    created_at: datetime = Field(default_factory=utcnow, index=True)
```

---

## 6. Backend API Endpoints

### 6.1 Search Locals & Demand Logging
- `GET /api/search/locals`: Updates existing endpoint to asynchronously record a `SearchEvent` row when queries or filters are supplied.
- Calculates `results_count` and sets `is_zero_result = (results_count == 0)`.

### 6.2 Admin Demand Intelligence
- `GET /api/admin/demand/summary`:
  - Access: Admin only (`admin_user`).
  - Parameters: `period` (`today`, `7d`, `30d`, `all_time`).
  - Returns:
    ```json
    {
      "period": "30d",
      "total_searches": 1420,
      "zero_result_searches": 185,
      "zero_result_rate": 13.03,
      "top_searched_cities": [
        { "city": "London", "count": 450, "zero_results": 0 },
        { "city": "Manchester", "count": 85, "zero_results": 32 }
      ],
      "top_searched_categories": [
        { "category": "Food Discovery", "count": 310, "zero_results": 12 },
        { "category": "Nightlife", "count": 140, "zero_results": 45 }
      ],
      "recent_unmet_demand": [
        { "city": "Edinburgh", "category": "Ghost Tours", "created_at": "2026-08-31T14:20:00Z" }
      ]
    }
    ```

---

## 7. Security, Privacy & Safety Controls

1. **Zero Personally Identifiable Information (PII) in Search Logs**:
   - `ip_hash` stores a one-way SHA-256 hash with a daily rotating salt or standard truncation.
   - User identity `user_id` is optional and only linked for authenticated users.
   - Zero passwords, payment details, or KYC document data are ever logged.
2. **Abuse Prevention**:
   - `search_locals` is protected by existing rate limiting.
   - Admin demand endpoints require valid JWT authentication with `role == "admin"`.
3. **Data Integrity**:
   - All SEO counters, ratings, and counts are calculated server-side from actual verified records.

---

## 8. Complete Acceptance Verification Matrix (18 Scenarios)

| ID | Category | Scenario Description | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **S01** | Country Hubs | `/uk` country hub URL resolution | HTTP 200 with server-rendered UK cities and verified locals |
| **S02** | Country Hubs | `/usa` country hub URL resolution | HTTP 200 with server-rendered US cities and verified locals |
| **S03** | Country Hubs | Invalid country slug resolution (`/france`) | Clean HTTP 404 (notFound) |
| **S04** | City Pages | Existing city page (`/uk/london`) integrity | HTTP 200 with locals, insights, guides, and breadcrumbs |
| **S05** | Category Hubs | Canonical category page resolution (`/experiences/food-discovery`) | HTTP 200 with verified locals offering that category |
| **S06** | Category Hubs | Invalid category slug resolution (`/experiences/non-existent`) | Clean HTTP 404 (notFound) |
| **S07** | Category Canonical | Category page canonical URL check | `<link rel="canonical" href=".../experiences/food-discovery">` |
| **S08** | Structured Data | Local profile `AggregateRating` schema | Accurate `ratingValue` and `reviewCount` when reviews exist |
| **S09** | Structured Data | Local profile `Offer` pricing schema | Accurate service titles and hourly rates in JSON-LD |
| **S10** | Structured Data | Local with 0 reviews schema handling | `aggregateRating` cleanly omitted without error or false 5.0 |
| **S11** | Robots.txt | Robots exclusion directives | `disallow: [/admin/, /dashboard/, /local-dashboard/, /kyc/, /api/]` |
| **S12** | Sitemap | Sitemap indexation coverage | Sitemap contains homepage, country hubs, cities, categories, locals, blogs |
| **S13** | Sitemap | Sitemap exclusion boundary | Zero private dashboard, KYC, or admin URLs in `sitemap.xml` |
| **S14** | Query Parameters | Explore search query URL handling | Canonical tag on `/explore?city=...` points to `/explore` (no index bloat) |
| **S15** | Internal Linking | Bidirectional hierarchy cross-linking | Country hub links to cities; city links to country; category links to cities |
| **S16** | Demand Telemetry | Search event logging in `/api/search/locals` | Creates `SearchEvent` with query, city, category, and result count |
| **S17** | Demand Telemetry | Zero-result search event logging | Records `is_zero_result = True` when results count is 0 |
| **S18** | Demand Intelligence | Admin demand summary endpoint | `GET /api/admin/demand/summary` returns accurate counts and zero-result rates |

---

## 9. Non-Goals & Architectural Invariants

- **FROZEN: Points 1 to 6**: KYC verification, 2FA, Local Partner Workspace, Traveler Flow, Request-a-Local, Reviews & Trust, and Revenue Engine will NOT be modified.
- **FROZEN: Gateway**: Exclusively Safepay. No Stripe or secondary processors.
- **No AI SEO**: No automatic bulk generation of fake programmatic text or fake reviews.
- **No Point 8 Command Center**: Revenue command center remains strictly out of scope for Point 7.
