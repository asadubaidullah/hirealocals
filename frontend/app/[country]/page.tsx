import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import LocalCard from "@/components/LocalCard";
import SafeImage from "@/components/SafeImage";
import { getBlogPosts, getCities, getServiceCategories, type SeoCity } from "@/lib/content";
import { serverApiUrl, shareImageUrl, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type CountryConfig = {
  slug: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
  tips: { title: string; body: string }[];
};

const COUNTRIES: Record<string, CountryConfig> = {
  uk: {
    slug: "uk",
    code: "GB",
    name: "United Kingdom",
    tagline: "Explore British cities with someone who lives there.",
    description: "Connect with verified, trusted locals across England, Scotland, and beyond for private tours, neighborhood orientation, cultural insights, and photography.",
    heroImage: "/images/home/hero-home-pexels.jpg",
    tips: [
      {
        title: "Walkable Neighbourhoods",
        body: "From London's historic alleys to Edinburgh's Old Town, UK cities are best explored on foot with a local guide.",
      },
      {
        title: "Local Food & Pubs",
        body: "Discover authentic gastropubs, afternoon tea spots, and bustling local street food markets off the tourist trail.",
      },
      {
        title: "Public Transit Secrets",
        body: "Navigate the Tube, trains, and regional coaches with confidence through practical local advice.",
      },
    ],
  },
  usa: {
    slug: "usa",
    code: "US",
    name: "United States",
    tagline: "Experience America's vibrant cities from an insider's perspective.",
    description: "Discover iconic metropolitan neighborhoods, hidden dining spots, cultural landmarks, and personal orientation with trusted local experts.",
    heroImage: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=86",
    tips: [
      {
        title: "Diverse Cultural Districts",
        body: "Explore diverse neighborhood enclaves, art scenes, and culinary hubs with locals who call them home.",
      },
      {
        title: "Flexible Private Itineraries",
        body: "Customize your schedule around your interests—whether architecture, local history, or hidden spots.",
      },
      {
        title: "Practical City Navigation",
        body: "Get firsthand tips on subway routes, ride shares, and neighborhood safety to maximize your visit.",
      },
    ],
  },
};

async function getCountryLocals(countryCode: string) {
  try {
    const r = await fetch(`${serverApiUrl}/api/locals?country=${countryCode}`, { cache: "no-store" });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map((row: any) => {
      const p = row.profile;
      const services = (row.services || []).filter((s: any) => s.active !== false);
      return {
        id: p.id,
        slug: p.slug,
        name: p.display_name,
        city: p.city_name,
        countryCode: p.country_code,
        headline: p.headline,
        languages: String(p.languages || "").split(",").map((x: string) => x.trim()).filter(Boolean),
        rating: p.rating,
        reviews: p.review_count,
        rate: p.hourly_rate,
        verified: p.verified,
        image: p.image_url,
        categories: [...new Set(services.map((s: any) => s.category))] as string[],
      };
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params;
  const config = COUNTRIES[country.toLowerCase().trim()];
  if (!config) return {};

  const title = `Hire a Local in ${config.name}`;
  const description = config.description;
  const share = shareImageUrl({
    title: `Hire a Local in ${config.name}`,
    subtitle: description,
    eyebrow: "EXPLORE WITH SOMEONE WHO LIVES THERE",
    badge: config.name,
  });

  return {
    title,
    description,
    alternates: { canonical: `/${config.slug}` },
    openGraph: {
      title,
      description,
      url: `/${config.slug}`,
      images: [{ url: share, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [share],
    },
  };
}

export default async function CountryHubPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const config = COUNTRIES[country.toLowerCase().trim()];
  if (!config) notFound();

  const [allCities, locals, categories, posts] = await Promise.all([
    getCities(),
    getCountryLocals(config.code),
    getServiceCategories(),
    getBlogPosts(),
  ]);

  const countryCities = allCities.filter(
    (c) => c.country_code === config.code || c.country_slug.toLowerCase() === config.slug
  );

  const countryNeedle = config.name.toLowerCase();
  const relatedGuides = posts
    .filter((p) => `${p.title} ${p.excerpt} ${p.content || ""}`.toLowerCase().includes(countryNeedle))
    .slice(0, 3);

  const activeCategories = categories.filter((c) => c.active !== false).slice(0, 6);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Hire a Local in ${config.name}`,
        description: config.description,
        url: `${siteUrl}/${config.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "HireALocals", item: siteUrl },
          { "@type": "ListItem", position: 2, name: config.name, item: `${siteUrl}/${config.slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Hero */}
      <section className="page-hero country-page-hero">
        <div className="container">
          <span className="badge">
            <MapPin size={14} />
            {config.name}
          </span>
          <h1 style={{ fontSize: "clamp(36px, 5.5vw, 60px)", marginTop: 14 }}>
            Hire a local in {config.name}.
          </h1>
          <p className="lead" style={{ maxWidth: 780 }}>
            {config.description}
          </p>
          <div className="hero-actions" style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" href={`/explore?country=${encodeURIComponent(config.code)}`}>
              Browse all {config.name} locals <ArrowRight size={16} />
            </Link>
            <Link className="btn secondary" href="/become-a-local">
              Become a {config.name} local
            </Link>
          </div>
        </div>
      </section>

      {/* Cities in Country */}
      <section className="section country-cities-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Destinations</span>
              <h2>Top cities in {config.name}</h2>
              <p>Explore active cities with verified local partners and private travel experiences.</p>
            </div>
            <Link href="/destinations" className="seo-text-link">
              All destinations <ArrowRight size={15} />
            </Link>
          </div>

          {countryCities.length ? (
            <div className="destination-card-grid" style={{ marginTop: 24 }}>
              {countryCities.map((city) => (
                <Link href={`/${city.country_slug}/${city.slug}`} className="destination-market-card" key={city.id}>
                  <div className="destination-market-image">
                    {city.image_url ? (
                      <SafeImage src={city.image_url} alt={`${city.name}, ${config.name}`} />
                    ) : (
                      <div className="destination-image-missing">
                        <MapPin size={25} />
                        <span>{city.name}</span>
                      </div>
                    )}
                    <span className="destination-country-badge">{config.name}</span>
                  </div>
                  <div className="destination-market-copy">
                    <div>
                      <h3>{city.name}</h3>
                      <p>{city.tagline || `Explore ${city.name} with local context.`}</p>
                    </div>
                    <ArrowRight size={18} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">Destinations in {config.name} are currently being onboarded.</div>
          )}
        </div>
      </section>

      {/* Verified Locals in Country */}
      <section className="section country-locals-section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Verified Local Guides</span>
              <h2>Meet locals in {config.name}</h2>
              <p>Private, flexible help from real people who know their city inside out.</p>
            </div>
            <Link href={`/explore?country=${encodeURIComponent(config.code)}`} className="seo-text-link">
              View all locals <ArrowRight size={15} />
            </Link>
          </div>

          {locals.length ? (
            <div className="grid grid-3" style={{ marginTop: 26 }}>
              {locals.slice(0, 6).map((l: any) => (
                <LocalCard key={l.id} local={l} />
              ))}
            </div>
          ) : (
            <div className="empty">
              We are onboarding the first trusted locals in {config.name}.{" "}
              <Link href="/become-a-local" style={{ color: "var(--green)", fontWeight: 800 }}>
                Apply to be one of them.
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Categories in Country */}
      {activeCategories.length ? (
        <section className="section country-categories-section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Experiences</span>
                <h2>What kind of experience are you looking for?</h2>
                <p>Browse by popular travel services available across {config.name}.</p>
              </div>
              <Link href="/experiences" className="seo-text-link">
                All experiences <ArrowRight size={15} />
              </Link>
            </div>

            <div className="experience-card-grid" style={{ marginTop: 24 }}>
              {activeCategories.map((cat) => (
                <Link href={`/experiences/${cat.slug}`} className="experience-service-card" key={cat.id}>
                  <span className="experience-service-icon">
                    <Compass size={22} />
                  </span>
                  <div>
                    <h3>{cat.name}</h3>
                    <p>{cat.description || `Discover ${cat.name.toLowerCase()} with a local.`}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Practical Travel Insights */}
      <section className="section country-insights-section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                <Sparkles size={14} /> Travel Planning
              </span>
              <h2>Tips for visiting {config.name}</h2>
              <p>Useful recommendations to help shape your itinerary before you meet your local guide.</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginTop: 24 }}>
            {config.tips.map((tip, idx) => (
              <div className="city-trust-card" key={idx}>
                <h3>{tip.title}</h3>
                <p>{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Guides */}
      {relatedGuides.length ? (
        <section className="section country-guides-section">
          <div className="container">
            <div className="city-guides-head">
              <div>
                <span className="eyebrow">Travel Guides</span>
                <h2>Read about traveling in {config.name}</h2>
              </div>
              <Link href="/blog" className="seo-text-link">
                All travel guides <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-3 city-guide-grid">
              {relatedGuides.map((post) => (
                <Link className="card city-guide-card" href={`/blog/${post.slug}`} key={post.id}>
                  {post.image_url ? <img src={post.image_url} alt={post.title} loading="lazy" /> : null}
                  <div className="card-body">
                    <span className="badge">{post.category}</span>
                    <h3>{post.title}</h3>
                    <p className="muted">{post.excerpt}</p>
                    <span className="seo-read-link">
                      Read guide <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
