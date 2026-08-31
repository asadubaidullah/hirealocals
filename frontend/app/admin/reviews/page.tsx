"use client";

import { useEffect, useState, useMemo } from "react";
import { Flag, Star, ShieldAlert, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { authedFetch } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

type ReportItem = {
  id: number;
  reason: string;
  details: string;
  status: string;
  reporter_name: string;
  created_at: string;
};

type ReviewItem = {
  id: number;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  local_name: string;
  tourist_name: string;
  booking_id: number;
  moderation_status: string;
  report_count: number;
  reports?: ReportItem[];
};

export default function AdminReviewsPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [status, setStatus] = useState("Loading reviews…");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await authedFetch("/api/admin/reviews");
      if (!r.ok) throw new Error("Could not load reviews");
      setItems(await r.json());
      setStatus("");
    } catch (e: any) {
      setStatus(e.message || "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function moderate(id: number, next: string) {
    setStatus("Updating review moderation…");
    try {
      const r = await authedFetch(`/api/admin/reviews/${id}/moderation`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus(d.detail || "Could not update review");
      } else {
        await load();
        setStatus(`Review #${id} set to ${next}. Local rating recalculated.`);
      }
    } catch (err: any) {
      setStatus(err.message || "Failed to update review.");
    }
  }

  const shown = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "reported") return items.filter((x) => x.report_count > 0);
    return items.filter((x) => x.moderation_status === filter);
  }, [items, filter]);

  const avg = items.length
    ? items.filter((x) => x.moderation_status !== "hidden").reduce((n, x) => n + x.rating, 0) /
      Math.max(1, items.filter((x) => x.moderation_status !== "hidden").length)
    : 0;

  const visibleCount = items.filter((x) => x.moderation_status === "visible").length;
  const flaggedCount = items.filter((x) => x.moderation_status === "flagged").length;
  const hiddenCount = items.filter((x) => x.moderation_status === "hidden").length;
  const reportedCount = items.filter((x) => x.report_count > 0).length;

  return (
    <AdminShell eyebrow="Admin control center" title="Reviews & Trust Moderation">
      {status && <div className="notice">{status}</div>}

      <div className="kpis">
        <div className="kpi">
          <strong>{items.length}</strong>
          <span className="muted">Total Reviews</span>
        </div>
        <div className="kpi">
          <strong>{avg.toFixed(1)} ★</strong>
          <span className="muted">Active Avg Rating</span>
        </div>
        <div className="kpi">
          <strong>{visibleCount}</strong>
          <span className="muted">Visible</span>
        </div>
        <div className="kpi">
          <strong>{reportedCount}</strong>
          <span className="muted">Reported by Users</span>
        </div>
        <div className="kpi">
          <strong>{hiddenCount}</strong>
          <span className="muted">Hidden from Profile</span>
        </div>
      </div>

      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 16px 0" }}>
        <h3>Customer Reviews & Reports</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All reviews ({items.length})</option>
          <option value="reported">Reported only ({reportedCount})</option>
          <option value="visible">Visible only ({visibleCount})</option>
          <option value="flagged">Flagged only ({flaggedCount})</option>
          <option value="hidden">Hidden only ({hiddenCount})</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading reviews…</div>
      ) : shown.length === 0 ? (
        <div className="empty">No reviews match this filter.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Traveler</th>
                <th>Local Partner</th>
                <th>Review Content</th>
                <th>Reports</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>★ {x.rating}/5</strong>
                    <div className="muted admin-cell-note">Booking #{x.booking_id}</div>
                  </td>
                  <td>
                    <strong>{x.tourist_name}</strong>
                  </td>
                  <td>
                    <strong>{x.local_name}</strong>
                  </td>
                  <td>
                    <strong>{x.title || "Experience Review"}</strong>
                    <div className="muted admin-cell-note admin-review-text" style={{ maxWidth: "340px", lineHeight: "1.4" }}>
                      {x.comment}
                    </div>
                  </td>
                  <td>
                    {x.report_count > 0 ? (
                      <div>
                        <span className="badge" style={{ background: "#fef3c7", color: "#92400e", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Flag size={11} />
                          {x.report_count} report(s)
                        </span>
                        {x.reports && x.reports.length > 0 && (
                          <div className="muted admin-cell-note" style={{ fontSize: "11px", color: "#b45309", marginTop: "2px" }}>
                            {x.reports[0].reason}: {x.reports[0].details || "No details"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="muted admin-cell-note">None</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${x.moderation_status === "visible" ? "status-completed" : x.moderation_status === "hidden" ? "badge-neutral" : "status-pending"}`}>
                      {x.moderation_status}
                    </span>
                  </td>
                  <td>
                    <div className="action-row">
                      {x.moderation_status !== "visible" && (
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => moderate(x.id, "visible")}
                          title="Restore review to public profile"
                        >
                          Show
                        </button>
                      )}
                      {x.moderation_status !== "flagged" && (
                        <button
                          type="button"
                          className="mini-btn secondary-mini"
                          onClick={() => moderate(x.id, "flagged")}
                          title="Flag review for investigation"
                        >
                          Flag
                        </button>
                      )}
                      {x.moderation_status !== "hidden" && (
                        <button
                          type="button"
                          className="mini-btn danger-mini"
                          onClick={() => moderate(x.id, "hidden")}
                          title="Hide review from public profile & rating"
                        >
                          Hide
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
