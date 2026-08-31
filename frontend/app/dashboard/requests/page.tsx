"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Star,
  ChevronDown,
  ChevronUp,
  XCircle,
  ArrowRight
} from "lucide-react";
import { authedFetch } from "@/lib/api";
import { apiUrl } from "@/lib/site";

type Offer = {
  id: number;
  trip_request_id: number;
  local_profile_id: number;
  local_name: string;
  local_slug: string;
  local_image: string;
  local_city: string;
  local_rating: number;
  local_review_count: number;
  local_hourly_rate: number;
  local_verified: boolean;
  offered_price: number;
  currency: string;
  duration_hours: number;
  proposed_start_time: string;
  proposal_message: string;
  inclusions: string;
  status: string;
  created_at: string;
};

type TripRequest = {
  id: number;
  tourist_user_id: number;
  traveler_name: string;
  country_code: string;
  city_name: string;
  city_slug: string;
  booking_date: string;
  flexible_dates: boolean;
  date_end?: string | null;
  preferred_time: string;
  duration_hours: number;
  guests: number;
  category: string;
  title: string;
  description: string;
  interests: string;
  language_preference: string;
  budget_amount?: number | null;
  budget_currency: string;
  special_requirements: string;
  meeting_preference: string;
  status: string;
  selected_offer_id?: number | null;
  converted_booking_id?: number | null;
  offer_count: number;
  offers: Offer[];
  created_at: string;
};

export default function TravelerRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedReqs, setExpandedReqs] = useState<Record<number, boolean>>({});
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const res = await authedFetch(`${apiUrl}/api/traveler/requests`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Could not load requests");
      }
      const data = await res.json();
      setRequests(data);
      // Auto-expand requests that have received offers
      const expanded: Record<number, boolean> = {};
      data.forEach((r: TripRequest) => {
        if (r.offers && r.offers.length > 0) {
          expanded[r.id] = true;
        }
      });
      setExpandedReqs(expanded);
    } catch (err: any) {
      setError(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function toggleExpand(id: number) {
    setExpandedReqs((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAcceptOffer(requestId: number, offerId: number) {
    if (!confirm("Are you sure you want to accept this quote? This will confirm your booking.")) {
      return;
    }
    setActionBusy(offerId);
    try {
      const res = await authedFetch(`${apiUrl}/api/traveler/requests/${requestId}/accept/${offerId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to accept quote");
      }
      if (data.redirect_url) {
        router.push(data.redirect_url);
      } else {
        await loadRequests();
      }
    } catch (err: any) {
      alert(err.message || "Could not accept quote.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleCancelRequest(requestId: number) {
    if (!confirm("Are you sure you want to cancel this request? Open quotes will be declined.")) {
      return;
    }
    setActionBusy(requestId);
    try {
      const res = await authedFetch(`${apiUrl}/api/traveler/requests/${requestId}/cancel`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to cancel request");
      }
      await loadRequests();
    } catch (err: any) {
      alert(err.message || "Could not cancel request.");
    } finally {
      setActionBusy(null);
    }
  }

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter === "all") return true;
      if (filter === "open") return ["submitted", "matching", "offers_received"].includes(r.status);
      if (filter === "offers") return r.status === "offers_received" || (r.offers && r.offers.length > 0);
      if (filter === "converted") return r.status === "converted_to_booking";
      if (filter === "cancelled") return r.status === "cancelled";
      return true;
    });
  }, [requests, filter]);

  function statusBadge(status: string) {
    switch (status) {
      case "submitted":
        return <span className="badge status-pending">Submitted</span>;
      case "matching":
        return <span className="badge status-pending">Matching Locals</span>;
      case "offers_received":
        return <span className="badge status-confirmed">Quotes Received</span>;
      case "converted_to_booking":
        return <span className="badge status-completed">Converted to Booking</span>;
      case "cancelled":
        return <span className="badge status-cancelled">Cancelled</span>;
      case "expired":
        return <span className="badge status-cancelled">Expired</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  }

  return (
    <div className="traveler-requests-container">
      <div className="traveler-requests-head">
        <div>
          <span className="eyebrow">Traveler Workspace</span>
          <h2>My Custom Requests</h2>
          <p className="muted">
            Track custom trip requests, review proposals from verified Local Partners, and accept quotes.
          </p>
        </div>
        <Link href="/request-a-local" className="btn primary">
          + New Custom Request
        </Link>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}

      <div className="filter-pills">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({requests.length})
        </button>
        <button
          className={filter === "open" ? "active" : ""}
          onClick={() => setFilter("open")}
        >
          Open ({requests.filter((r) => ["submitted", "matching", "offers_received"].includes(r.status)).length})
        </button>
        <button
          className={filter === "offers" ? "active" : ""}
          onClick={() => setFilter("offers")}
        >
          Quotes Received ({requests.filter((r) => (r.offers && r.offers.length > 0) || r.status === "offers_received").length})
        </button>
        <button
          className={filter === "converted" ? "active" : ""}
          onClick={() => setFilter("converted")}
        >
          Converted ({requests.filter((r) => r.status === "converted_to_booking").length})
        </button>
        <button
          className={filter === "cancelled" ? "active" : ""}
          onClick={() => setFilter("cancelled")}
        >
          Cancelled ({requests.filter((r) => r.status === "cancelled").length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading your custom requests…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>
            {requests.length === 0
              ? "You haven't submitted any custom trip requests yet."
              : "No requests match this filter."}
          </p>
          <Link href="/request-a-local" className="btn primary">
            Request a Local Now
          </Link>
        </div>
      ) : (
        <div className="request-items-list">
          {filtered.map((req) => {
            const isExpanded = Boolean(expandedReqs[req.id]);
            const hasOffers = req.offers && req.offers.length > 0;

            return (
              <article className="traveler-request-card" key={req.id}>
                <div className="request-card-top">
                  <div>
                    <div className="status-stack">
                      {statusBadge(req.status)}
                      <span className="badge">{req.category}</span>
                    </div>
                    <h3>{req.title || `${req.category} in ${req.city_name}`}</h3>
                    <p className="request-meta-line">
                      <MapPin size={14} /> <strong>{req.city_name}, {req.country_code}</strong> ·{" "}
                      <Calendar size={14} /> <strong>{req.booking_date}</strong> ({req.preferred_time}) ·{" "}
                      <Users size={14} /> <strong>{req.guests} {req.guests === 1 ? "guest" : "guests"}</strong> ·{" "}
                      <Clock size={14} /> <strong>{req.duration_hours} hrs</strong>
                    </p>
                  </div>

                  <div className="request-card-budget">
                    {req.budget_amount ? (
                      <div>
                        <span>Budget</span>
                        <strong>${Number(req.budget_amount).toFixed(2)}</strong>
                      </div>
                    ) : (
                      <span className="muted">Flexible budget</span>
                    )}
                  </div>
                </div>

                <div className="request-description-box">
                  <p>{req.description}</p>
                  {req.special_requirements && (
                    <p className="request-sub-note">
                      <strong>Special requirements:</strong> {req.special_requirements}
                    </p>
                  )}
                  {req.meeting_preference && (
                    <p className="request-sub-note">
                      <strong>Meeting preference:</strong> {req.meeting_preference}
                    </p>
                  )}
                </div>

                {req.status === "converted_to_booking" && req.converted_booking_id && (
                  <div className="converted-booking-banner">
                    <CheckCircle2 size={20} />
                    <div>
                      <strong>Quote Accepted & Booking Created!</strong>
                      <p>Your custom trip has been converted to Booking #{req.converted_booking_id}.</p>
                    </div>
                    <Link
                      href={`/dashboard/bookings/${req.converted_booking_id}`}
                      className="btn primary mini-btn"
                    >
                      View Booking & Safepay Payment &rarr;
                    </Link>
                  </div>
                )}

                <div className="request-card-footer">
                  <div className="quotes-count-pill">
                    <Sparkles size={16} />
                    <strong>{req.offers.length} {req.offers.length === 1 ? "Quote Received" : "Quotes Received"}</strong>
                  </div>

                  <div className="request-actions-row">
                    {req.status !== "converted_to_booking" && req.status !== "cancelled" && (
                      <button
                        type="button"
                        className="mini-btn secondary-mini"
                        disabled={actionBusy === req.id}
                        onClick={() => handleCancelRequest(req.id)}
                      >
                        <XCircle size={14} /> Cancel request
                      </button>
                    )}

                    {hasOffers && (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => toggleExpand(req.id)}
                      >
                        {isExpanded ? (
                          <>Hide Quotes <ChevronUp size={14} /></>
                        ) : (
                          <>Compare {req.offers.length} Quotes <ChevronDown size={14} /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Received Quotes Section */}
                {isExpanded && hasOffers && (
                  <div className="received-offers-drawer">
                    <h4 className="offers-drawer-title">
                      Proposals from Verified Local Partners ({req.offers.length})
                    </h4>

                    <div className="offers-comparison-grid">
                      {req.offers.map((offer) => {
                        const isAccepted = offer.status === "accepted";
                        const isDeclined = offer.status === "declined";
                        const isWithdrawn = offer.status === "withdrawn";

                        return (
                          <div
                            className={`quote-proposal-card ${isAccepted ? "quote-accepted" : isDeclined ? "quote-declined" : ""}`}
                            key={offer.id}
                          >
                            <div className="quote-local-header">
                              <Link href={`/locals/${offer.local_slug}`} className="quote-local-avatar">
                                <img src={offer.local_image || "/placeholder.jpg"} alt={offer.local_name} />
                              </Link>
                              <div>
                                <div className="quote-local-name-row">
                                  <Link href={`/locals/${offer.local_slug}`}>
                                    <strong>{offer.local_name}</strong>
                                  </Link>
                                  {offer.local_verified && (
                                    <span className="verified-badge-inline" title="Verified Local Partner">
                                      <ShieldCheck size={14} /> Verified
                                    </span>
                                  )}
                                </div>
                                <div className="quote-local-stats">
                                  <span><Star size={12} fill="currentColor" /> {offer.local_rating > 0 ? offer.local_rating.toFixed(1) : "New"}</span>
                                  <span>{offer.local_city}</span>
                                  <span>Standard rate: ${offer.local_hourly_rate}/hr</span>
                                </div>
                              </div>
                            </div>

                            <div className="quote-pricing-block">
                              <div className="quote-price-tag">
                                <strong>${Number(offer.offered_price).toFixed(2)}</strong>
                                <span>total all-inclusive</span>
                              </div>
                              <div className="quote-timing-tag">
                                <span>Proposed: <strong>{offer.proposed_start_time}</strong> ({offer.duration_hours} hrs)</span>
                              </div>
                            </div>

                            <div className="quote-proposal-text">
                              <p>{offer.proposal_message}</p>
                              {offer.inclusions && (
                                <div className="quote-inclusions">
                                  <strong>What&apos;s included:</strong> {offer.inclusions}
                                </div>
                              )}
                            </div>

                            <div className="quote-card-action">
                              {isAccepted ? (
                                <span className="quote-status-badge badge-accepted">
                                  <CheckCircle2 size={16} /> Quote Accepted
                                </span>
                              ) : isDeclined ? (
                                <span className="quote-status-badge badge-declined">
                                  Declined
                                </span>
                              ) : isWithdrawn ? (
                                <span className="quote-status-badge badge-declined">
                                  Quote Withdrawn
                                </span>
                              ) : req.status === "converted_to_booking" ? (
                                <span className="quote-status-badge badge-declined">
                                  Another quote selected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn primary btn-full"
                                  disabled={actionBusy === offer.id}
                                  onClick={() => handleAcceptOffer(req.id, offer.id)}
                                >
                                  {actionBusy === offer.id ? "Accepting…" : `Accept Quote & Book ($${Number(offer.offered_price).toFixed(2)})`}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
