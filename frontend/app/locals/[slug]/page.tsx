import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, CheckCircle2, Languages, MapPin, MessageCircle, Star } from "lucide-react";
import BookingBox from "@/components/BookingBox";
import SaveLocalButton from "@/components/SaveLocalButton";
import { serverApiUrl, shareImageUrl, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type ApiLocal = {
  profile: any;
  services: any[];
  availability: any[];
  reviews: any[];
  rating_breakdown?: Record<string | number, number>;
  completed_trips_count?: number;
};

async function getLocal(slug: string): Promise<ApiLocal | null> {
  try {
    const r = await fetch(`${serverApiUrl}/api/locals/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

function shape(d: ApiLocal) {
  const p = d.profile;
  const breakdown = d.rating_breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
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
    bio: p.bio,
    response: p.response_time,
    yearsLocal: p.years_local,
    completedTrips: d.completed_trips_count || 0,
    breakdown,
    categories: [...new Set((d.services || []).filter((s: any) => s.active).map((s: any) => s.category))],
    services: (d.services || []).filter((s: any) => s.active).map((s: any) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      description: s.description,
      duration: s.duration_hours,
      price: s.price,
    })),
    availability: d.availability || [],
    publicReviews: d.reviews || [],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await getLocal(slug);
  if (!d) return {};
  const l = shape(d);
  const services = l.categories.slice(0, 2).join(" and ");
  const description = `Meet ${l.name}, a local in ${l.city}${services ? ` offering ${services.toLowerCase()}` : ""}. Compare services, languages, reviews and availability before sending a private booking request.`;
  const share = shareImageUrl({
    title: `Meet ${l.name} in ${l.city}`,
    subtitle: description,
    eyebrow: "HIREALOCALS LOCAL PROFILE",
    badge: l.verified ? "VERIFIED LOCAL" : l.city,
  });
  return {
    title: `${l.name} — Local in ${l.city}`,
    description,
    alternates: { canonical: `/locals/${l.slug}` },
    openGraph: {
      type: "profile",
      url: `/locals/${l.slug}`,
      title: `${l.name} — Local in ${l.city}`,
      description,
      images: [{ url: share, width: 1200, height: 630, alt: `${l.name}, local in ${l.city}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${l.name} — Local in ${l.city}`,
      description,
      images: [share],
    },
  };
}

export default async function LocalProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getLocal(slug);
  if (!d) notFound();
  const l = shape(d);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        name: `${l.name} — Local in ${l.city}`,
        url: `${siteUrl}/locals/${l.slug}`,
        mainEntity: {
          "@type": "Person",
          name: l.name,
          description: l.headline,
          image: l.image,
          homeLocation: { "@type": "Place", name: l.city },
          knowsLanguage: l.languages,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "HireALocals", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Find a Local", item: `${siteUrl}/explore` },
          { "@type": "ListItem", position: 3, name: l.name, item: `${siteUrl}/locals/${l.slug}` },
        ],
      },
    ],
  };

  const totalReviews = l.reviews || 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="section">
        <div className="container profile-grid">
          <div>
            <img className="profile-cover" src={l.image} alt={l.name} />
            <div style={{ padding: "28px 4px" }}>
              <div className="local-meta">
                <div>
                  {l.verified ? (
                    <span className="badge">
                      <BadgeCheck size={14} />
                      Verified local
                    </span>
                  ) : (
                    <span className="badge badge-neutral">Verification pending</span>
                  )}
                  <h1 style={{ fontSize: "clamp(40px,6vw,62px)", marginTop: 14 }}>{l.name}</h1>
                  <div className="lead">{l.headline}</div>
                </div>
                <div className="rating">
                  <Star size={16} fill="currentColor" /> {l.rating ? `${l.rating.toFixed(1)} / 5.0` : "New"}{" "}
                  {l.reviews ? `· ${l.reviews} verified reviews` : ""}
                </div>
              </div>

              <div className="chips">
                <span className="chip">
                  <MapPin size={12} /> {l.city}
                </span>
                <span className="chip">
                  <Languages size={12} /> {l.languages.join(", ")}
                </span>
                <span className="chip">{l.yearsLocal} years local</span>
                {l.completedTrips > 0 && (
                  <span className="chip">
                    <CheckCircle2 size={12} /> {l.completedTrips} completed experiences
                  </span>
                )}
              </div>

              <div className="profile-inline-actions">
                <SaveLocalButton localId={l.id} />
              </div>

              <div className="divider" />
              <h2 style={{ fontSize: 32 }}>About {l.name.split(" ")[0]}</h2>
              <p className="lead" style={{ fontSize: 17 }}>
                {l.bio}
              </p>
              <p className="muted">
                <MessageCircle size={15} style={{ display: "inline" }} /> {l.response}
              </p>

              <div className="divider" />
              <h2 style={{ fontSize: 32 }}>Services</h2>
              {l.services.length ? (
                l.services.map((s: any) => (
                  <div className="service" key={s.id}>
                    <div>
                      <span className="badge">{s.category}</span>
                      <h3 style={{ marginTop: 10 }}>{s.title}</h3>
                      <p className="muted" style={{ maxWidth: 650 }}>
                        {s.description}
                      </p>
                      <span className="muted">{s.duration} hours</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: 22 }}>${s.price}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>
                        per private booking
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">This local has not published services yet.</div>
              )}

              <div className="divider" />
              <div className="profile-reviews-section">
                <h2 style={{ fontSize: 32 }}>Traveler reviews</h2>

                {l.publicReviews.length > 0 && (
                  <div className="rating-breakdown-box">
                    <div className="breakdown-score-col">
                      <strong className="big-score">{l.rating ? l.rating.toFixed(1) : "0.0"}</strong>
                      <div className="stars-row">
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                      </div>
                      <span className="muted score-count-label">Based on {totalReviews} verified reviews</span>
                    </div>

                    <div className="breakdown-bars-col">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = (l.breakdown as any)[stars] || 0;
                        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                        return (
                          <div key={stars} className="rating-bar-row">
                            <span className="bar-label">{stars} ★</span>
                            <div className="rating-bar-track">
                              <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="bar-count-label">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {l.publicReviews.length ? (
                  <div className="public-review-list">
                    {l.publicReviews.map((r: any) => (
                      <article className="public-review" key={r.id}>
                        <div className="public-review-head">
                          <div>
                            <strong>{r.traveler_name}</strong>
                            <span className="verified-experience-badge">
                              <BadgeCheck size={13} />
                              Verified Experience
                            </span>
                          </div>
                          <span className="review-stars">
                            {"★".repeat(r.rating)}
                            {"☆".repeat(5 - r.rating)}
                          </span>
                        </div>
                        {r.title && <h3>{r.title}</h3>}
                        <p>{r.comment}</p>
                        <small className="muted">{new Date(r.created_at).toLocaleDateString()}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Written reviews from completed HireALocals bookings will appear here.</p>
                )}
              </div>
            </div>
          </div>
          <BookingBox local={l} />
        </div>
      </section>
    </>
  );
}
