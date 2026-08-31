"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  Flag,
  X,
  MessageSquare,
  Calendar,
  Sparkles
} from "lucide-react";
import { authedFetch } from "@/lib/api";
import { apiUrl } from "@/lib/site";

type ReviewItem = {
  id: number;
  booking_id: number;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  tourist_name: string;
  service_title: string;
  booking_date: string;
  moderation_status: string;
  reports_count: number;
  verified_booking: boolean;
};

type ReviewsData = {
  rating: number;
  review_count: number;
  distribution: Record<string | number, number>;
  completed_count: number;
  five_star_percentage: number;
  reviews: ReviewItem[];
};

export default function LocalReviewsPage() {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading reviews…");

  // Report modal state
  const [reportingReview, setReportingReview] = useState<ReviewItem | null>(null);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  async function loadReviews() {
    setLoading(true);
    setStatus("Loading reviews…");
    try {
      const res = await authedFetch(`${apiUrl}/api/local/reviews`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Could not load reviews");
      }
      const json = await res.json();
      setData(json);
      setStatus("");
    } catch (err: any) {
      setStatus(err.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reportingReview) return;
    setSubmittingReport(true);
    try {
      const res = await authedFetch(`${apiUrl}/api/reviews/${reportingReview.id}/report`, {
        method: "POST",
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.detail || "Could not submit report");
      }
      alert("Review report submitted to marketplace administrators for investigation.");
      setReportingReview(null);
      setReportDetails("");
      await loadReviews();
    } catch (err: any) {
      alert(err.message || "Could not submit report.");
    } finally {
      setSubmittingReport(false);
    }
  }

  const reviews = data?.reviews || [];
  const distribution = data?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalReviews = data?.review_count || 0;

  return (
    <div className="local-reviews-hub-container">
      <span className="eyebrow">Local Partner Workspace</span>
      <h2>Reviews & Trust Hub</h2>
      <p className="muted">
        Review real traveler feedback from completed experiences. Ratings update your public profile and marketplace rank.
      </p>

      {status && <div className="notice">{status}</div>}

      {/* KPI Cards */}
      <div className="kpis">
        <div className="kpi">
          <strong>{data?.rating ? `${data.rating.toFixed(1)} ★` : "New"}</strong>
          <span className="muted">Overall Rating</span>
        </div>
        <div className="kpi">
          <strong>{totalReviews}</strong>
          <span className="muted">Verified Reviews</span>
        </div>
        <div className="kpi">
          <strong>{data?.five_star_percentage ?? 0}%</strong>
          <span className="muted">5-Star Satisfaction</span>
        </div>
        <div className="kpi">
          <strong>{data?.completed_count ?? 0}</strong>
          <span className="muted">Completed Experiences</span>
        </div>
      </div>

      {/* Rating Breakdown Visualizer */}
      {totalReviews > 0 && (
        <div className="rating-breakdown-box" style={{ margin: "24px 0" }}>
          <div className="breakdown-score-col">
            <strong className="big-score">{data?.rating ? data.rating.toFixed(1) : "0.0"}</strong>
            <div className="stars-row">
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
              <Star size={18} fill="#f59e0b" color="#f59e0b" />
            </div>
            <span className="muted score-count-label">Based on {totalReviews} verified reviews</span>
          </div>

          <div className="breakdown-bars-col">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = (distribution as any)[stars] || 0;
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={stars} className="rating-bar-row">
                  <span className="bar-label">{stars} ★</span>
                  <div className="rating-bar-track">
                    <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="bar-count-label">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <h3 style={{ marginTop: "32px", marginBottom: "16px" }}>Traveler Feedback</h3>

      {loading ? (
        <div className="loading-state">Loading traveler feedback…</div>
      ) : reviews.length === 0 ? (
        <div className="empty" style={{ padding: "40px 20px", textAlign: "center" }}>
          <Sparkles size={32} style={{ margin: "0 auto 12px auto", opacity: 0.7 }} />
          <h4>No traveler reviews yet</h4>
          <p className="muted" style={{ maxWidth: "480px", margin: "8px auto 0 auto" }}>
            When travelers complete experiences with you and make payments, they will be invited to leave verified reviews that appear here.
          </p>
        </div>
      ) : (
        <div className="local-reviews-list" style={{ display: "grid", gap: "16px" }}>
          {reviews.map((r) => (
            <article className="detail-card local-review-card" key={r.id}>
              <div className="local-review-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong>{r.tourist_name}</strong>
                    <span className="verified-experience-badge">
                      <BadgeCheck size={13} />
                      Verified Experience
                    </span>
                    {r.moderation_status === "hidden" && (
                      <span className="badge badge-neutral">Hidden by Admin</span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
                    {r.service_title} · Booking #{r.booking_id} {r.booking_date ? `· ${r.booking_date}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="review-stars">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </div>
                  <button
                    type="button"
                    className="mini-btn secondary-mini"
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px" }}
                    onClick={() => setReportingReview(r)}
                  >
                    <Flag size={12} />
                    Report
                  </button>
                </div>
              </div>

              {r.title && <h4 style={{ margin: "12px 0 6px 0", fontSize: "16px" }}>{r.title}</h4>}
              <p style={{ margin: "6px 0 12px 0", lineHeight: "1.5" }}>{r.comment}</p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                <span>Submitted on {new Date(r.created_at).toLocaleDateString()}</span>
                {r.reports_count > 0 && (
                  <span style={{ color: "#d97706" }}>Report under admin review</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {reportingReview && (
        <div className="modal-backdrop" onClick={() => setReportingReview(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-head">
              <div>
                <h3>Report Review #{reportingReview.id}</h3>
                <p className="muted">Submit this review to marketplace administrators for moderation.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setReportingReview(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReportSubmit}>
              <div className="modal-body">
                <div style={{ background: "var(--bg-muted, #f8fafc)", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                  <strong>{reportingReview.tourist_name}:</strong> &ldquo;{reportingReview.comment.slice(0, 140)}...&rdquo;
                </div>

                <div className="field-group" style={{ marginBottom: "14px" }}>
                  <label>Reason for report</label>
                  <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} required>
                    <option value="harassment">Harassment / Hate speech</option>
                    <option value="fraud">Fraud / Extortion / Fake review</option>
                    <option value="spam">Spam / Advertising / Irrelevant</option>
                    <option value="privacy">Contains private personal information</option>
                    <option value="other">Other policy violation</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Additional details (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details for the administration team..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    maxLength={1000}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn secondary" onClick={() => setReportingReview(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={submittingReport}>
                  {submittingReport ? "Submitting…" : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
