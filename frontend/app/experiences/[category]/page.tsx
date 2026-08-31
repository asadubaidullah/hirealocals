import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Camera,
  CarFront,
  Compass,
  Landmark,
  Languages,
  MapPin,
  PlaneLanding,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import LocalCard from "@/components/LocalCard";
import { getCities, getServiceCategories, type ServiceCategory } from "@/lib/content";
import { serverApiUrl, shareImageUrl, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function categoryIcon(name: string) {
  const key = name.toLowerCase();
  const props = { size: 28, strokeWidth: 1.8 };

  if (key.includes("photo")) return <Camera {...props} />;
  if (key.includes("food")) return <UtensilsCrossed {...props} />;
  if (key.includes("airport")) return <PlaneLanding {...props} />;
  if (key.includes("driver")) return <CarFront {...props} />;
  if (key.includes("interpreter") || key.includes("translator") || key.includes("language")) return <Languages {...props} />;
  if (key.includes("shopping")) return <ShoppingBag {...props} />;
  if (key.includes("family")) return <UsersRound {...props} />;
  if (key.includes("wheelchair") || key.includes("access")) return <Accessibility {...props} />;
  if (key.includes("history") || key.includes("historical")) return <Landmark {...props} />;
  if (key.includes("guide") || key.includes("tour")) return <Compass {...props} />;

  return <Sparkles {...props} />;
}

async function getCategoryLocals(categoryName: string) {
  try {
    const r = await fetch(`${serverApiUrl}/api/locals?category=${encodeURIComponent(categoryName)}`, {
      cache: "no-store",
    });
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
        languages: String(p.languages || "")
          .split(",")
          .map((x: string) => x.trim())
          .filter(Boolean),
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

function findCategory(categories: ServiceCategory[], slugParam: string): ServiceCategory | null {
  const norm = slugParam.toLowerCase().trim();
  return (
    categories.find(
      (c) =>
        c.slug.toLowerCase() === norm ||
        c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === norm
    ) || null
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const categories = await getServiceCategories();
  const matched = findCategory(categories, categorySlug);
  if (!matched) return {};

  const title = `${matched.name} with Trusted Locals`;
  const description =
    matched.description ||
    `Discover private ${matched.name.toLowerCase()} experiences with verified local guides in top UK and US cities.`;
  const share = shareImageUrl({
    title,
    subtitle: description,
    eyebrow: "HIREALOCALS TRAVEL EXPERIENCES",
    badge: matched.name,
  });

  return {
    title,
    description,
    alternates: { canonical: `/experiences/${matched.slug}` },
    openGraph: {
      title,
      description,
      url: `/experiences/${matched.slug}`,
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

export default async function CategoryLandingPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const [categories, allCities] = await Promise.all([getServiceCategories(), getCities()]);
  const matched = findCategory(categories, categorySlug);
  if (!matched) notFound();

  const locals = await getCategoryLocals(matched.name);

  // Active cities where these locals reside
  const availableCities = allCities.filter((city) =>
    locals.some(
      (l: any) =>
        l.city.toLowerCase() === city.name.toLowerCase() ||
        l.countryCode.toUpperCase() === city.country_code.toUpperCase()
    )
  );

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${matched.name} with Trusted Locals`,
        description:
          matched.description ||
          `Private ${matched.name.toLowerCase()} experiences with verified local guides.`,
        url: `${siteUrl}/experiences/${matched.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "HireALocals", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Experiences", item: `${siteUrl}/experiences` },
          {
            "@type": "ListItem",
            position: 3,
            name: matched.name,
            item: `${siteUrl}/experiences/${matched.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Hero Section */}
      <section className="page-hero category-page-hero">
        <div className="container">
          <span className="badge">
            <Sparkles size={14} />
            Experience Category
          </span>
          <h1 style={{ fontSize: "clamp(36px, 5.5vw, 60px)", marginTop: 14 }}>
            {matched.name}
          </h1>
          <p className="lead" style={{ maxWidth: 780 }}>
            {matched.description ||
              `Connect with verified local experts offering private, flexible ${matched.name.toLowerCase()} services shaped around your personal itinerary.`}
          </p>
          <div className="hero-actions" style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" href={`/explore?service=${encodeURIComponent(matched.name)}`}>
              Browse all {matched.name} locals <ArrowRight size={16} />
            </Link>
            <Link
              className="btn secondary"
              href={`/request-a-local?category=${encodeURIComponent(matched.name)}`}
            >
              Request custom experience
            </Link>
          </div>
        </div>
      </section>

      {/* Available Destinations for this Category */}
      {availableCities.length ? (
        <section className="section category-destinations-section" style={{ background: "var(--surface)" }}>
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Destinations</span>
                <h2>Where to find {matched.name}</h2>
                <p>Explore active cities offering verified {matched.name.toLowerCase()} services.</p>
              </div>
            </div>

            <div className="destination-country-pills" style={{ marginTop: 16 }}>
              {availableCities.map((city) => (
                <Link
                  href={`/explore?city=${encodeURIComponent(city.name)}&service=${encodeURIComponent(matched.name)}`}
                  key={city.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <MapPin size={14} />
                  {city.name}, {city.country_name || city.country_code}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Verified Local Partners Offering this Category */}
      <section className="section category-locals-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Local Partners</span>
              <h2>Verified locals offering {matched.name}</h2>
              <p>Compare local profiles, languages, reviews, and rates before booking.</p>
            </div>
            <Link
              href={`/explore?service=${encodeURIComponent(matched.name)}`}
              className="seo-text-link"
            >
              View all results <ArrowRight size={15} />
            </Link>
          </div>

          {locals.length ? (
            <div className="grid grid-3" style={{ marginTop: 26 }}>
              {locals.map((l: any) => (
                <LocalCard key={l.id} local={l} />
              ))}
            </div>
          ) : (
            <div className="empty">
              We are currently onboarding verified local partners specializing in {matched.name}.
              <div style={{ marginTop: 14 }}>
                <Link
                  className="btn"
                  href={`/request-a-local?category=${encodeURIComponent(matched.name)}`}
                >
                  Request a Local for {matched.name} &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Category Trust & Value Proposition */}
      <section className="section category-trust-section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="grid grid-3">
            <div className="city-trust-card">
              <h3>Tailored to your interests</h3>
              <p>Discuss your specific preferences, pace, and interests directly with your local partner before meeting.</p>
            </div>
            <div className="city-trust-card">
              <h3>100% Private experiences</h3>
              <p>No large tour groups or rigid itineraries. Enjoy personal time and flexibility throughout your session.</p>
            </div>
            <div className="city-trust-card">
              <h3>Verified & reviewed</h3>
              <p>Every local partner undergoes identity review and booking verification so you can book with confidence.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
