import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Compass,
  HelpCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  Wallet
} from "lucide-react";

import LocalCard from "@/components/LocalCard";
import { getBlogPosts, getCity } from "@/lib/content";
import { getDestinationContent } from "@/lib/destinationContent";
import { serverApiUrl, shareImageUrl, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getLocals(countryCode: string, citySlug: string) {
  try {
    const r = await fetch(`${serverApiUrl}/api/locals`, { cache: "no-store" });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows
      .filter(
        (row: any) =>
          row.profile?.country_code === countryCode &&
          row.profile?.city_slug === citySlug
      )
      .map((row: any) => {
        const p = row.profile;
        const services = (row.services || []).filter(
          (s: any) => s.active !== false
        );
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
          categories: [
            ...new Set(services.map((s: any) => s.category)),
          ] as string[],
        };
      });
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}): Promise<Metadata> {
  const { country, city } = await params;
  const c = await getCity(country, city);
  if (!c) return {};

  const title = c.meta_title || `Hire a Local in ${c.name} | Private Guides & Local Experiences`;
  const description =
    c.meta_description ||
    `Connect with verified ${c.name} locals for private walking tours, neighborhood food discoveries, street photography, and first-day city orientation.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${c.country_slug}/${c.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${c.country_slug}/${c.slug}`,
      siteName: "HireALocals",
      images: [
        {
          url: shareImageUrl({
            title: `Hire a Local in ${c.name}`,
            subtitle: description,
            eyebrow: "EXPLORE WITH SOMEONE WHO LIVES THERE",
            badge: c.country_name,
          }),
          width: 1200,
          height: 630,
          alt: `Hire a local in ${c.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        shareImageUrl({
          title: `Hire a Local in ${c.name}`,
          subtitle: description,
          eyebrow: "EXPLORE WITH SOMEONE WHO LIVES THERE",
          badge: c.country_name,
        }),
      ],
    },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const { country, city } = await params;
  const c = await getCity(country, city);
  if (!c) notFound();

  const [found, posts] = await Promise.all([
    getLocals(c.country_code, c.slug),
    getBlogPosts(),
  ]);

  const destContent = getDestinationContent(c.slug);

  const cityNeedle = c.name.toLowerCase();
  const relatedGuides = posts
    .filter((p) =>
      `${p.title} ${p.excerpt} ${p.content || ""}`
        .toLowerCase()
        .includes(cityNeedle)
    )
    .slice(0, 3);

  // Structured Data Schema
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/${c.country_slug}/${c.slug}#webpage`,
        name: `Hire a Local in ${c.name}`,
        description: c.meta_description || c.description,
        url: `${siteUrl}/${c.country_slug}/${c.slug}`,
        isPartOf: {
          "@type": "WebSite",
          name: "HireALocals",
          url: siteUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Destinations",
            item: `${siteUrl}/destinations`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: c.country_name,
            item: `${siteUrl}/${c.country_slug}`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: c.name,
            item: `${siteUrl}/${c.country_slug}/${c.slug}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: destContent.customFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* HERO SECTION */}
      <section className="dest-hero">
        <div className="container">
          <nav className="dest-breadcrumbs" aria-label="Breadcrumbs">
            <Link href="/">Home</Link>
            <ChevronRight size={13} />
            <Link href="/destinations">Destinations</Link>
            <ChevronRight size={13} />
            <Link href={`/${c.country_slug}`}>{c.country_name}</Link>
            <ChevronRight size={13} />
            <span aria-current="page">{c.name}</span>
          </nav>

          <div className="dest-hero-grid">
            <div className="dest-hero-copy">
              <span className="eyebrow">
                <MapPin size={13} />
                {c.name}, {c.country_name}
              </span>

              <h1>Hire a verified local in {c.name}.</h1>

              <p className="lead">
                {c.description ||
                  `Experience ${c.name} with someone who lives there. Discover neighborhood stories, hidden food spots, street photography, and tailored walking experiences without crowded group tours.`}
              </p>

              <div className="dest-hero-actions">
                <Link
                  className="btn"
                  href={`/explore?city=${encodeURIComponent(c.name)}`}
                >
                  Browse {c.name} locals <ArrowRight size={16} />
                </Link>

                <Link className="btn secondary" href="/request-a-local">
                  Request a custom trip
                </Link>
              </div>

              <div className="dest-trust-pills">
                <span>
                  <ShieldCheck size={16} />
                  100% Private experiences
                </span>
                <span>
                  <BadgeCheck size={16} />
                  Verified local residents
                </span>
                <span>
                  <MessageCircle size={16} />
                  Direct messaging
                </span>
                <span>
                  <Wallet size={16} />
                  Secure payment protection
                </span>
              </div>
            </div>

            {c.image_url ? (
              <div className="dest-hero-media">
                <img
                  src={c.image_url}
                  alt={`Explore ${c.name} with a verified local`}
                  fetchPriority="high"
                />
                <div className="dest-media-caption">
                  <Sparkles size={16} />
                  <div>
                    <strong>Tailored to your pace</strong>
                    <span>No crowds. No megaphones. Just real {c.name}.</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* WHY HIRE A LOCAL SECTION */}
      <section className="section dest-why-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">The local difference</span>
            <h2>Why explore {c.name} with someone who lives there?</h2>
            <p className="lead">
              Visiting a major world city should feel exciting, not overwhelming. A private local host transforms your visit from a checklist into an authentic connection.
            </p>
          </div>

          <div className="dest-benefit-grid">
            <article className="dest-benefit-card">
              <div className="dest-benefit-icon">
                <Compass size={24} />
              </div>
              <h3>Skip the tourist traps</h3>
              <p>
                Discover authentic neighborhood bakeries, historic taverns, tucked-away viewpoints, and cultural spots that mass tour buses drive straight past.
              </p>
            </article>

            <article className="dest-benefit-card">
              <div className="dest-benefit-icon">
                <Users size={24} />
              </div>
              <h3>Paced entirely to you</h3>
              <p>
                No rushing with 30 strangers. Stop for coffee when you like, wander intriguing alleys, and spend time where your genuine curiosity takes you.
              </p>
            </article>

            <article className="dest-benefit-card">
              <div className="dest-benefit-icon">
                <MapPin size={24} />
              </div>
              <h3>Effortless city orientation</h3>
              <p>
                Get confident with transit routes, neighborhood safety, tipping customs, and local etiquette from day one with clear practical guidance.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* WHAT LOCALS CAN HELP WITH */}
      <section className="section dest-services-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Local capabilities</span>
            <h2>What {c.name} locals can help you discover.</h2>
            <p className="lead">
              Every local brings unique expertise. Choose the style of help that matches how you love to travel.
            </p>
          </div>

          <div className="dest-service-grid">
            <div className="dest-service-pill-card">
              <div className="dest-service-icon">
                <Compass size={22} />
              </div>
              <div>
                <h3>Neighborhood & Culture Walks</h3>
                <p>
                  Explore historic architecture, street art, hidden courtyards, and vibrant districts with a resident storyteller.
                </p>
              </div>
            </div>

            <div className="dest-service-pill-card">
              <div className="dest-service-icon">
                <UtensilsCrossed size={22} />
              </div>
              <div>
                <h3>Local Food & Market Tastings</h3>
                <p>
                  Taste regional street foods, iconic neighborhood markets, local delis, and specialty eateries known only to locals.
                </p>
              </div>
            </div>

            <div className="dest-service-pill-card">
              <div className="dest-service-icon">
                <Camera size={22} />
              </div>
              <div>
                <h3>Street & Portrait Photography</h3>
                <p>
                  Capture memorable, natural high-quality photos against scenic city backdrops with a local photographer guide.
                </p>
              </div>
            </div>

            <div className="dest-service-pill-card">
              <div className="dest-service-icon">
                <MapPin size={22} />
              </div>
              <div>
                <h3>First-Day Transit & Orientation</h3>
                <p>
                  Learn the subway network, neighborhood navigation, and essential local tips to unlock your entire trip with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AVAILABLE LOCALS LISTING */}
      <section className="section city-locals-section" id="locals">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Verified locals in {c.name}</span>
            <h2>Choose a person, not an anonymous package.</h2>
            <p className="lead">
              Review real profiles, languages, specialities, and verified traveler feedback before booking.
            </p>
          </div>

          {found.length ? (
            <div className="grid grid-3" style={{ marginTop: 28 }}>
              {found.map((l: any) => (
                <LocalCard key={l.id} local={l} />
              ))}
            </div>
          ) : (
            <div className="dest-empty-state">
              <Sparkles size={28} />
              <h3>We are onboarding trusted locals in {c.name}</h3>
              <p>
                Have a specific plan in mind? Submit a custom trip request, or apply to join our local partner community.
              </p>
              <div className="dest-empty-actions">
                <Link className="btn" href="/request-a-local">
                  Request a Local in {c.name}
                </Link>
                <Link className="btn secondary" href="/become-a-local">
                  Become a {c.name} Local
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* POPULAR NEIGHBORHOODS HIGHLIGHTS */}
      <section className="section dest-neighborhoods-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Neighborhood guide</span>
            <h2>{destContent.highlightsTitle}</h2>
            <p className="lead">{destContent.highlightsLead}</p>
          </div>

          <div className="dest-neighborhoods-grid">
            {destContent.neighborhoods.map((n, idx) => (
              <article className="dest-neighborhood-card" key={n.name}>
                <div className="dest-nb-header">
                  <span className="dest-nb-badge">{n.vibe}</span>
                  <span className="dest-nb-number">0{idx + 1}</span>
                </div>
                <h3>{n.name}</h3>
                <p className="dest-nb-tagline">{n.tagline}</p>
                <p className="dest-nb-desc">{n.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW BOOKING WORKS */}
      <section className="section dest-how-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Simple & transparent</span>
            <h2>How booking a local works.</h2>
            <p className="lead">
              Three straightforward steps from discovery to meeting up in {c.name}.
            </p>
          </div>

          <div className="dest-how-grid">
            <div className="dest-how-card">
              <div className="dest-how-number">1</div>
              <h3>Discover & connect</h3>
              <p>
                Browse verified local profiles in {c.name}, read reviews, and explore offered experiences that match your travel style.
              </p>
            </div>

            <div className="dest-how-card">
              <div className="dest-how-number">2</div>
              <h3>Message & align</h3>
              <p>
                Chat directly with your local to customize start times, preferred meeting points, and any specific sights you want to see.
              </p>
            </div>

            <div className="dest-how-card">
              <div className="dest-how-number">3</div>
              <h3>Meet & explore</h3>
              <p>
                Meet at your agreed spot, enjoy an authentic private experience, and pay securely in-platform with milestone protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM TRUST & SAFEGUARDS */}
      <section className="section dest-trust-section">
        <div className="container">
          <div className="dest-trust-banner">
            <div className="dest-trust-copy">
              <span className="eyebrow">Platform safeguards</span>
              <h2>Book with confidence on HireALocals.</h2>
              <p>
                Every experience is backed by identity verification review, encrypted payments, and genuine traveler reviews.
              </p>
            </div>

            <div className="dest-trust-items">
              <div className="dest-trust-item">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Verified local profiles</strong>
                  <span>Reviewed before public listing</span>
                </div>
              </div>

              <div className="dest-trust-item">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Secure escrow checkout</strong>
                  <span>Funds held safely until completion</span>
                </div>
              </div>

              <div className="dest-trust-item">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Verified traveler reviews</strong>
                  <span>Authentic feedback from real bookings</span>
                </div>
              </div>

              <div className="dest-trust-item">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Flexible coordination</strong>
                  <span>Direct in-platform chat and support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="section dest-faq-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Common questions</span>
            <h2>Frequently asked questions about hiring a local in {c.name}.</h2>
            <p className="lead">
              Everything you need to know about planning, booking, and meeting a local host.
            </p>
          </div>

          <div className="dest-faq-grid">
            {destContent.customFaqs.map((faq, idx) => (
              <details className="dest-faq-item" key={idx} open={idx === 0}>
                <summary>
                  <span className="dest-faq-q">{faq.question}</span>
                </summary>
                <p className="dest-faq-a">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED TRAVEL GUIDES */}
      {relatedGuides.length ? (
        <section className="section city-guides-section">
          <div className="container">
            <div className="city-guides-head">
              <div>
                <span className="eyebrow">Travel guides for {c.name}</span>
                <h2>Read our local insights before your trip.</h2>
              </div>
              <Link href="/blog" className="seo-text-link">
                All travel guides <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid grid-3 city-guide-grid">
              {relatedGuides.map((post) => (
                <Link
                  className="card city-guide-card"
                  href={`/blog/${post.slug}`}
                  key={post.id}
                >
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.title} loading="lazy" />
                  ) : null}
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

      {/* FINAL CONVERSION CTA */}
      <section className="section dest-final-cta-section">
        <div className="container">
          <div className="dest-final-cta-box">
            <div className="dest-final-cta-copy">
              <h2>Ready to experience {c.name} like an insider?</h2>
              <p>
                Browse available locals, send a message to tailor your experience, or submit a custom trip request today.
              </p>
            </div>
            <div className="dest-final-cta-actions">
              <Link
                className="btn"
                href={`/explore?city=${encodeURIComponent(c.name)}`}
              >
                Browse {c.name} locals <ArrowRight size={16} />
              </Link>
              <Link className="btn secondary" href="/request-a-local">
                Request a custom trip
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
