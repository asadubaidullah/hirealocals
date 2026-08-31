"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  XCircle,
  FileText
} from "lucide-react";
import { authedFetch } from "@/lib/api";
import { apiUrl } from "@/lib/site";

type MyOffer = {
  id: number;
  offered_price: number;
  currency: string;
  duration_hours: number;
  proposed_start_time: string;
  proposal_message: string;
  inclusions: string;
  status: string;
  created_at: string;
};

type Opportunity = {
  id: number;
  tourist_user_id: number;
  traveler_name: string;
  country_code: string;
  city_name: string;
  booking_date: string;
  flexible_dates: boolean;
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
  offer_count: number;
  my_offer?: MyOffer | null;
  created_at: string;
};

export default function LocalOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUnverified, setIsUnverified] = useState(false);

  // Quote modal state
  const [quotingOpp, setQuotingOpp] = useState<Opportunity | null>(null);
  const [offeredPrice, setOfferedPrice] = useState("");
  const [proposedStartTime, setProposedStartTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState("3");
  const [proposalMessage, setProposalMessage] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  async function loadOpportunities() {
    setLoading(true);
    setError("");
    setIsUnverified(false);
    try {
      const res = await authedFetch(`${apiUrl}/api/local/requests`);
      if (res.status === 403) {
        setIsUnverified(true);
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Could not load marketplace opportunities");
      }
      const data = await res.json();
      setOpportunities(data);
    } catch (err: any) {
      setError(err.message || "Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOpportunities();
  }, []);

  function openQuoteModal(opp: Opportunity) {
    setQuotingOpp(opp);
    setOfferedPrice(opp.budget_amount ? String(opp.budget_amount) : "");
    setProposedStartTime(opp.preferred_time === "afternoon" ? "14:00" : opp.preferred_time === "evening" ? "18:00" : "10:00");
    setDurationHours(String(opp.duration_hours || 3));
    setProposalMessage(`Hi ${opp.traveler_name}, I would love to host your ${opp.category} in ${opp.city_name}! I will personalize this experience to your exact interests.`);
    setInclusions("");
    setModalError("");
  }

  function closeQuoteModal() {
    setQuotingOpp(null);
    setModalError("");
  }

  async function handleSendQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!quotingOpp) return;
    setModalError("");

    const price = Number(offeredPrice);
    if (!price || price <= 0) {
      setModalError("Please enter a valid quote price.");
      return;
    }
    if (!proposalMessage.trim() || proposalMessage.trim().length < 10) {
      setModalError("Please write a proposal message (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        offered_price: price,
        currency: quotingOpp.budget_currency || "USD",
        duration_hours: Number(durationHours) || 3.0,
        proposed_start_time: proposedStartTime.trim() || "10:00",
        proposal_message: proposalMessage.trim(),
        inclusions: inclusions.trim(),
      };

      const res = await authedFetch(`${apiUrl}/api/local/requests/${quotingOpp.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to submit quote");
      }

      closeQuoteModal();
      await loadOpportunities();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit quote.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdrawQuote(offerId: number) {
    if (!confirm("Are you sure you want to withdraw this quote?")) return;
    setWithdrawingId(offerId);
    try {
      const res = await authedFetch(`${apiUrl}/api/local/offers/${offerId}/withdraw`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to withdraw quote");
      }
      await loadOpportunities();
    } catch (err: any) {
      alert(err.message || "Could not withdraw quote.");
    } finally {
      setWithdrawingId(null);
    }
  }

  if (isUnverified) {
    return (
      <div className="local-opportunities-container">
        <span className="eyebrow">Local Partner Workspace</span>
        <h2>Marketplace Opportunities</h2>
        <div className="notice" style={{ marginTop: "16px" }}>
          <strong>Identity Verification Required</strong>
          <p>
            You must complete identity verification to browse and submit custom quotes on marketplace opportunities.
          </p>
          <div style={{ marginTop: "12px" }}>
            <Link href="/local-dashboard/profile" className="btn primary mini-btn">
              Complete Identity Verification &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="local-opportunities-container">
      <div className="local-opportunities-head">
        <div>
          <span className="eyebrow">Local Partner Workspace</span>
          <h2>Marketplace Opportunities</h2>
          <p className="muted">
            Browse traveler trip requests in your city, submit tailored price quotes, and win custom bookings.
          </p>
        </div>
        <button
          type="button"
          className="mini-btn secondary-mini"
          onClick={loadOpportunities}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh Opportunities"}
        </button>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading open opportunities in your city…</div>
      ) : opportunities.length === 0 ? (
        <div className="empty">
          <p>There are no open custom requests in your city right now.</p>
          <small className="muted">We notify you automatically whenever a new traveler request is submitted.</small>
        </div>
      ) : (
        <div className="opportunities-grid">
          {opportunities.map((opp) => {
            const hasSubmittedQuote = Boolean(opp.my_offer && opp.my_offer.status === "submitted");
            const isAccepted = Boolean(opp.my_offer && opp.my_offer.status === "accepted");
            const isDeclined = Boolean(opp.my_offer && opp.my_offer.status === "declined");
            const isWithdrawn = Boolean(opp.my_offer && opp.my_offer.status === "withdrawn");

            return (
              <article className="opportunity-card" key={opp.id}>
                <div className="opportunity-card-top">
                  <div>
                    <div className="status-stack">
                      <span className="badge status-pending">Opportunity</span>
                      <span className="badge">{opp.category}</span>
                    </div>
                    <h3>{opp.title || `${opp.category} in ${opp.city_name}`}</h3>
                    <p className="opportunity-traveler-line">
                      Requested by <strong>{opp.traveler_name}</strong>
                    </p>
                  </div>

                  <div className="opportunity-budget-box">
                    {opp.budget_amount ? (
                      <div>
                        <span>Traveler Budget</span>
                        <strong>${Number(opp.budget_amount).toFixed(2)}</strong>
                      </div>
                    ) : (
                      <span className="muted">Flexible Budget</span>
                    )}
                  </div>
                </div>

                <div className="opportunity-facts-row">
                  <span><MapPin size={14} /> <strong>{opp.city_name}, {opp.country_code}</strong></span>
                  <span><Calendar size={14} /> <strong>{opp.booking_date}</strong> ({opp.preferred_time})</span>
                  <span><Clock size={14} /> <strong>{opp.duration_hours} hrs</strong></span>
                  <span><Users size={14} /> <strong>{opp.guests} {opp.guests === 1 ? "guest" : "guests"}</strong></span>
                  {opp.language_preference && <span>Language: <strong>{opp.language_preference}</strong></span>}
                </div>

                <div className="opportunity-desc-box">
                  <strong>Traveler Requirements & Wishlist:</strong>
                  <p>{opp.description}</p>
                  {opp.special_requirements && (
                    <small className="opp-special-req">
                      <strong>Special notes:</strong> {opp.special_requirements}
                    </small>
                  )}
                  {opp.meeting_preference && (
                    <small className="opp-special-req">
                      <strong>Meeting preference:</strong> {opp.meeting_preference}
                    </small>
                  )}
                </div>

                {/* My Quote Status Banner */}
                {opp.my_offer && (
                  <div className={`my-quote-status-banner ${isAccepted ? "banner-accepted" : isDeclined ? "banner-declined" : "banner-submitted"}`}>
                    <div className="quote-status-icon">
                      {isAccepted ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                    </div>
                    <div className="quote-status-info">
                      <strong>
                        {isAccepted ? "Quote Accepted! Booking Confirmed" : isDeclined ? "Quote Declined" : isWithdrawn ? "Quote Withdrawn" : "Your Quote is Active"}
                      </strong>
                      <p>
                        You quoted <strong>${Number(opp.my_offer.offered_price).toFixed(2)}</strong> for {opp.my_offer.duration_hours} hrs ({opp.my_offer.proposed_start_time}).
                      </p>
                    </div>

                    {hasSubmittedQuote && (
                      <button
                        type="button"
                        className="mini-btn danger-mini"
                        disabled={withdrawingId === opp.my_offer.id}
                        onClick={() => handleWithdrawQuote(opp.my_offer!.id)}
                      >
                        {withdrawingId === opp.my_offer.id ? "Withdrawing…" : "Withdraw Quote"}
                      </button>
                    )}
                  </div>
                )}

                <div className="opportunity-card-footer">
                  <span className="muted-small">
                    {opp.offer_count} {opp.offer_count === 1 ? "quote submitted so far" : "quotes submitted so far"}
                  </span>

                  {!opp.my_offer && (
                    <button
                      type="button"
                      className="btn primary mini-btn"
                      onClick={() => openQuoteModal(opp)}
                    >
                      <Send size={14} /> Send Custom Quote
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Quote Submission Modal */}
      {quotingOpp && (
        <div className="modal-backdrop" onClick={closeQuoteModal}>
          <div className="modal-dialog quote-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>Submit Custom Quote</h3>
                <p className="muted">
                  For {quotingOpp.traveler_name}&apos;s trip in {quotingOpp.city_name} ({quotingOpp.booking_date})
                </p>
              </div>
              <button type="button" className="modal-close" onClick={closeQuoteModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendQuote} className="modal-body quote-form">
              {modalError && (
                <div className="form-error-banner" role="alert">
                  <AlertCircle size={18} />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="form-grid-2">
                <div className="field-group">
                  <label htmlFor="quote-price">Your All-Inclusive Quote ($ USD) *</label>
                  <input
                    id="quote-price"
                    type="number"
                    min="1"
                    max="10000"
                    step="0.01"
                    placeholder="e.g. 150.00"
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                    required
                  />
                  <span className="field-hint">Your gross price for this entire experience.</span>
                </div>

                <div className="field-group">
                  <label htmlFor="quote-time">Proposed Start Time *</label>
                  <input
                    id="quote-time"
                    type="text"
                    placeholder="e.g. 10:00 or 14:30"
                    value={proposedStartTime}
                    onChange={(e) => setProposedStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field-group" style={{ marginTop: "12px" }}>
                <label htmlFor="quote-duration">Duration (hours)</label>
                <select
                  id="quote-duration"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                >
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                  <option value="4">4 hours</option>
                  <option value="6">6 hours</option>
                  <option value="8">8 hours</option>
                </select>
              </div>

              <div className="field-group" style={{ marginTop: "12px" }}>
                <label htmlFor="quote-msg">Proposal Message & Personalized Highlights *</label>
                <textarea
                  id="quote-msg"
                  rows={4}
                  placeholder="Introduce yourself, explain how you will customize this itinerary, and why you are the ideal local expert for this trip..."
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  required
                />
                <span className="field-hint">Minimum 10 characters.</span>
              </div>

              <div className="field-group" style={{ marginTop: "12px" }}>
                <label htmlFor="quote-inc">What&apos;s Included (Optional)</label>
                <input
                  id="quote-inc"
                  type="text"
                  placeholder="e.g. Personalized itinerary, walking guide, 1 coffee stop included"
                  value={inclusions}
                  onChange={(e) => setInclusions(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={closeQuoteModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting}
                >
                  {submitting ? "Sending Quote…" : "Submit Quote to Traveler"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
