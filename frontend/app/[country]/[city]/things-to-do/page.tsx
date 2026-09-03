import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import LocalCard from "@/components/LocalCard";
import { getBlogPosts, getCity } from "@/lib/content";
import { getCuratedThingsToDo } from "@/lib/things-to-do";
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
  if (!c || c.published === false) return {};

  const ttd = getCuratedThingsToDo(c.slug);
  if (!ttd) return {};

  const title = ttd.metaTitle;
  const description = ttd.metaDescription;
  const canonical = `/${c.country_slug}/${c.slug}/things-to-do`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${canonical}`,
      siteName: "HireALocals",
      images: [
        {
          url: shareImageUrl({
            title: ttd.heroTitle,
            subtitle: description,
            eyebrow: `THINGS TO DO IN ${c.name.toUpperCase()}`,
            badge: c.country_name,
          }),
          width: 1200,
          height: 630,
          alt: `${ttd.heroTitle} - HireALocals`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        shareImageUrl({
          title: ttd.heroTitle,
          subtitle: description,
          eyebrow: `THINGS TO DO IN ${c.name.toUpperCase()}`,
          badge: c.country_name,
        }),
      ],
    },
  };
}

export default async function ThingsToDoPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const { country, city } = await params;
  const c = await getCity(country, city);
  if (!c || c.published === false) notFound();

  const ttd = getCuratedThingsToDo(c.slug);
  if (!ttd) notFound();

  const [foundLocals, posts] = await Promise.all([
    getLocals(c.country_code, c.slug),
    getBlogPosts(),
  ]);

  const cityNeedle = c.name.toLowerCase();
  const relatedGuides = posts
    .filter((p) =>
      `${p.title} ${p.excerpt} ${p.content || ""}`
        .toLowerCase()
        .includes(cityNeedle)
    )
    .slice(0, 3);

  const pageUrl = `${siteUrl}/${c.country_slug}/${c.slug}/things-to-do`;

  // Structured Data Schema (BreadcrumbList + ItemList + CollectionPage)
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#webpage`,
        name: ttd.heroTitle,
        description: ttd.metaDescription,
        url: pageUrl,
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
          {
            "@type": "ListItem",
            position: 5,
            name: `Things to Do in ${c.name}`,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `Top Things to Do in ${c.name}`,
        description: `Curated authentic neighborhood activities, walks, and discoveries in ${c.name}.`,
        itemListElement: ttd.activities.map((act, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: act.title,
          description: act.summary,
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
            <Link href={`/${c.country_slug}/${c.slug}`}>{c.name}</Link>
            <ChevronRight size={13} />
            <span aria-current="page">Things to Do</span>
          </nav>

          <div className="dest-hero-grid">
            <div className="dest-hero-copy">
              <span className="eyebrow">
                <MapPin size={13} />
                {c.name}, {c.country_name} · {ttd.heroEyebrow}
              </span>

              <h1>{ttd.heroTitle}</h1>

              <p className="lead">{ttd.heroLead}</p>

              <div className="dest-hero-actions">
                <a className="btn" href="#activities">
                  Explore {c.name} activities <ArrowRight size={16} />
                </a>

                <Link
                  className="btn secondary"
                  href={`/${c.country_slug}/${c.slug}`}
                >
                  Browse verified {c.name} locals
                </Link>
              </div>

              <div className="dest-trust-pills">
                <span>
                  <Sparkles size={16} />
                  {ttd.activitiesCountText}
                </span>
                <span>
                  <Compass size={16} />
                  100% Walkable & Insider Curated
                </span>
                <span>
                  <Users size={16} />
                  Connect with Verified Residents
                </span>
              </div>
            </div>

            {c.image_url ? (
              <div className="dest-hero-media">
                <img
                  src={c.image_url}
                  alt={`Things to do in ${c.name}`}
                  fetchPriority="high"
                />
                <div className="dest-media-caption">
                  <Sparkles size={16} />
                  <div>
                    <strong>Explore {c.name} beyond the postcard</strong>
                    <span>Authentic neighborhoods, secret mews, and local food.</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* CURATED ACTIVITIES LIST */}
      <section className="section ttd-activities-section" id="activities">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Curated Activity Guide</span>
            <h2>Top things to do in {c.name} beyond the crowds.</h2>
            <p className="lead">
              Carefully chosen experiences that showcase the authentic character, historic architecture, and local flavors of {c.name}.
            </p>
          </div>

          <div className="ttd-activities-grid">
            {ttd.activities.map((act, idx) => (
              <article className="ttd-activity-card" key={act.id}>
                <div className="ttd-activity-top">
                  <span className="badge">{act.categoryLabel}</span>
                  <span className="ttd-best-for">
                    <strong>Best for:</strong> {act.bestFor}
                  </span>
                  <span className="ttd-card-number">0{idx + 1}</span>
                </div>

                <h3>{act.title}</h3>

                <div className="ttd-meta-row">
                  <span>
                    <Clock size={15} /> {act.duration}
                  </span>
                  <span>
                    <MapPin size={15} /> {act.neighborhood}
                  </span>
                </div>

                <p className="ttd-summary">{act.summary}</p>

                <div className="ttd-callout-box insider">
                  <Lightbulb size={18} />
                  <div>
                    <strong>Local insider tip</strong>
                    <p>{act.insiderTip}</p>
                  </div>
                </div>

                <div className="ttd-callout-box practical">
                  <Navigation size={18} />
                  <div>
                    <strong>Practical navigation note</strong>
                    <p>{act.practicalTip}</p>
                  </div>
                </div>

                {act.relatedExperienceSlug ? (
                  <div className="ttd-related-link">
                    <Link href={`/experiences/${act.relatedExperienceSlug}`}>
                      <span>Want a guided experience?</span>
                      <strong>Explore {act.relatedExperienceName || act.categoryLabel} options &rarr;</strong>
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* NEIGHBORHOOD SPOTLIGHTS */}
      <section className="section dest-neighborhoods-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Neighborhood Navigation</span>
            <h2>Key {c.name} districts to explore on foot.</h2>
            <p className="lead">
              Every district has its own rhythm and history. Group your activities by neighborhood to minimize transit time.
            </p>
          </div>

          <div className="dest-neighborhoods-grid">
            {ttd.neighborhoods.map((n, idx) => (
              <article className="dest-neighborhood-card" key={n.name}>
                <div className="dest-nb-header">
                  <span className="dest-nb-badge">{n.vibe}</span>
                  <span className="dest-nb-number">0{idx + 1}</span>
                </div>
                <h3>{n.name}</h3>
                <p className="dest-nb-tagline">{n.highlight}</p>
                <p className="dest-nb-desc">{n.whyVisit}</p>
                <div className="ttd-nb-transit">
                  <Navigation size={14} />
                  <span>{n.transitTip}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRACTICAL TRAVEL & TRANSIT GUIDE */}
      <section className="section ttd-practical-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Practical Advice</span>
            <h2>City navigation & trip pacing advice.</h2>
            <p className="lead">
              Practical pointers from residents to ensure your days run smoothly.
            </p>
          </div>

          <div className="ttd-practical-grid">
            <div className="ttd-practical-card">
              <div className="ttd-practical-icon">
                <Navigation size={22} />
              </div>
              <h3>Public Transit Secrets</h3>
              <ul className="ttd-check-list">
                {ttd.practicalGuide.transitTips.map((tip, i) => (
                  <li key={i}>
                    <CheckCircle2 size={16} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ttd-practical-card">
              <div className="ttd-practical-icon">
                <Calendar size={22} />
              </div>
              <h3>Best Times to Visit</h3>
              <p>{ttd.practicalGuide.bestTimeToVisit}</p>
              <div className="ttd-card-divider" />
              <h3>Pacing Your Days</h3>
              <p>{ttd.practicalGuide.pacingAdvice}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORTING LOCAL HOST SECTION */}
      <section className="section city-locals-section" id="locals">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Connect with a resident</span>
            <h2>Explore {c.name} with someone who lives there.</h2>
            <p className="lead">
              These activities can be enjoyed independently, or hosted by a verified resident who tailors the pace, stories, and route to your personal travel party.
            </p>
          </div>

          {foundLocals.length ? (
            <>
              <div className="grid grid-3" style={{ marginTop: 28 }}>
                {foundLocals.slice(0, 3).map((l: any) => (
                  <LocalCard key={l.id} local={l} />
                ))}
              </div>
              <div className="ttd-view-all-locals">
                <Link
                  className="btn secondary"
                  href={`/${c.country_slug}/${c.slug}#locals`}
                >
                  View all verified {c.name} locals <ArrowRight size={16} />
                </Link>
              </div>
            </>
          ) : (
            <div className="dest-empty-state">
              <Sparkles size={28} />
              <h3>Prefer a tailored itinerary hosted by a local?</h3>
              <p>
                Have a specific walk in mind? Submit a custom trip request and verified {c.name} residents will provide personalized proposals.
              </p>
              <div className="dest-empty-actions">
                <Link className="btn" href="/request-a-local">
                  Request a Local in {c.name}
                </Link>
                <Link
                  className="btn secondary"
                  href={`/${c.country_slug}/${c.slug}`}
                >
                  Visit {c.name} Marketplace
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* VISIBLE FREQUENTLY ASKED QUESTIONS */}
      <section className="section dest-faq-section">
        <div className="container">
          <div className="dest-section-head">
            <span className="eyebrow">Common questions</span>
            <h2>Frequently asked questions about visiting {c.name}.</h2>
            <p className="lead">
              Activity planning, neighborhood advice, and itinerary tips.
            </p>
          </div>

          <div className="dest-faq-grid">
            {ttd.faqs.map((faq, idx) => (
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

      {/* BRIDGE CONVERSION CTA */}
      <section className="section dest-final-cta-section">
        <div className="container">
          <div className="dest-final-cta-box">
            <div className="dest-final-cta-copy">
              <h2>Ready to experience {c.name} like an insider?</h2>
              <p>
                Connect with verified local hosts, book private walking experiences, or submit a custom trip request for your visit.
              </p>
            </div>
            <div className="dest-final-cta-actions">
              <Link
                className="btn"
                href={`/${c.country_slug}/${c.slug}`}
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
