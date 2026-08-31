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
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Star
} from "lucide-react";
import { authedFetch } from "@/lib/api";
import { apiUrl } from "@/lib/site";
import AdminShell from "@/components/AdminShell";

type OfferItem = {
  id: number;
  local_name: string;
  local_slug: string;
  local_city: string;
  local_rating: number;
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

type RequestItem = {
  id: number;
  tourist_user_id: number;
  traveler_name: string;
  traveler_email: string;
  country_code: string;
  city_name: string;
  city_slug: string;
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
  selected_offer_id?: number | null;
  converted_booking_id?: number | null;
  offer_count: number;
  offers: OfferItem[];
  created_at: string;
};

export default function AdminRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading custom requests…");
  const [filter, setFilter] = useState("all");
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(null);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  async function loadRequests() {
    setLoading(true);
    setStatus("Loading custom requests…");
    try {
      const res = await authedFetch(`${apiUrl}/api/admin/requests?limit=100`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Could not load requests");
      }
      const data = await res.json();
      setItems(data.items || []);
      setStatus("");
    } catch (err: any) {
      setStatus(err.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleNotifyLocals(requestId: number) {
    setDispatchingId(requestId);
    try {
      const res = await authedFetch(`${apiUrl}/api/admin/requests/${requestId}/notify-locals`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to notify locals");
      }
      alert(`Dispatched alerts to ${data.dispatched_count} eligible verified locals!`);
      await loadRequests();
      if (selectedReq && selectedReq.id === requestId) {
        setSelectedReq((prev) => prev ? { ...prev, status: data.status } : null);
      }
    } catch (err: any) {
      alert(err.message || "Could not dispatch notifications.");
    } finally {
      setDispatchingId(null);
    }
  }

  const shown = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((x) => x.status === filter);
  }, [items, filter]);

  const kpiSubmitted = items.filter((x) => x.status === "submitted").length;
  const kpiMatching = items.filter((x) => x.status === "matching" || x.status === "offers_received").length;
  const kpiConverted = items.filter((x) => x.status === "converted_to_booking").length;

  return (
    <AdminShell eyebrow="Admin control center" title="Custom Requests & Demand">
      {status && <div className="notice">{status}</div>}

      <div className="kpis">
        <div className="kpi">
          <strong>{items.length}</strong>
          <span className="muted">Total Requests</span>
        </div>
        <div className="kpi">
          <strong>{kpiSubmitted}</strong>
          <span className="muted">New Submitted</span>
        </div>
        <div className="kpi">
          <strong>{kpiMatching}</strong>
          <span className="muted">Matching / Quoted</span>
        </div>
        <div className="kpi">
          <strong>{kpiConverted}</strong>
          <span className="muted">Converted to Bookings</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <h3>Custom Traveler Requests</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="matching">Matching</option>
          <option value="offers_received">Quotes received</option>
          <option value="converted_to_booking">Converted to booking</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading custom requests…</div>
      ) : shown.length === 0 ? (
        <div className="empty">No requests match this filter.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Traveler</th>
                <th>Destination & Category</th>
                <th>Schedule</th>
                <th>Budget</th>
                <th>Quotes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((req) => (
                <tr key={req.id}>
                  <td>
                    <strong>#{req.id}</strong>
                  </td>
                  <td>
                    <strong>{req.traveler_name}</strong>
                    <div className="muted admin-cell-note">{req.traveler_email}</div>
                  </td>
                  <td>
                    <strong>{req.city_name}, {req.country_code}</strong>
                    <div className="muted admin-cell-note">{req.category}</div>
                  </td>
                  <td>
                    {req.booking_date} ({req.preferred_time})
                    <div className="muted admin-cell-note">
                      {req.duration_hours} hr · {req.guests} guest(s)
                    </div>
                  </td>
                  <td>
                    {req.budget_amount ? `$${Number(req.budget_amount).toFixed(2)}` : "Flexible"}
                  </td>
                  <td>
                    <span className="badge">{req.offers?.length || 0} quotes</span>
                  </td>
                  <td>
                    <span className={`badge status-${req.status === 'converted_to_booking' ? 'completed' : req.status === 'offers_received' ? 'confirmed' : 'pending'}`}>
                      {req.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        type="button"
                        className="mini-btn secondary-mini"
                        onClick={() => setSelectedReq(req)}
                      >
                        Inspect
                      </button>
                      {req.status === "submitted" && (
                        <button
                          type="button"
                          className="mini-btn"
                          disabled={dispatchingId === req.id}
                          onClick={() => handleNotifyLocals(req.id)}
                        >
                          {dispatchingId === req.id ? "Notifying…" : "Notify Locals"}
                        </button>
                      )}
                      {req.converted_booking_id && (
                        <Link
                          className="mini-btn"
                          href={`/admin/bookings/${req.converted_booking_id}`}
                        >
                          Booking #{req.converted_booking_id}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect Modal Drawer */}
      {selectedReq && (
        <div className="modal-backdrop" onClick={() => setSelectedReq(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "750px" }}>
            <div className="modal-head">
              <div>
                <h3>Request #{selectedReq.id} — {selectedReq.title || selectedReq.category}</h3>
                <p className="muted">
                  Submitted by {selectedReq.traveler_name} ({selectedReq.traveler_email})
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedReq(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="admin-inspect-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div><strong>Destination:</strong> {selectedReq.city_name}, {selectedReq.country_code}</div>
                <div><strong>Date:</strong> {selectedReq.booking_date} ({selectedReq.preferred_time})</div>
                <div><strong>Duration:</strong> {selectedReq.duration_hours} hours</div>
                <div><strong>Group:</strong> {selectedReq.guests} guests</div>
                <div><strong>Category:</strong> {selectedReq.category}</div>
                <div><strong>Budget:</strong> {selectedReq.budget_amount ? `$${Number(selectedReq.budget_amount).toFixed(2)}` : "Flexible"}</div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <strong>Traveler Requirements:</strong>
                <p style={{ marginTop: "4px", background: "var(--bg-muted, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
                  {selectedReq.description}
                </p>
              </div>

              {selectedReq.special_requirements && (
                <div style={{ marginBottom: "16px" }}>
                  <strong>Special Requirements:</strong>
                  <p>{selectedReq.special_requirements}</p>
                </div>
              )}

              {selectedReq.meeting_preference && (
                <div style={{ marginBottom: "16px" }}>
                  <strong>Meeting Point Preference:</strong>
                  <p>{selectedReq.meeting_preference}</p>
                </div>
              )}

              <div style={{ marginTop: "24px" }}>
                <h4>Submitted Quotes ({selectedReq.offers?.length || 0})</h4>
                {selectedReq.offers && selectedReq.offers.length > 0 ? (
                  <div style={{ display: "grid", gap: "12px", marginTop: "8px" }}>
                    {selectedReq.offers.map((o) => (
                      <div key={o.id} style={{ border: "1px solid var(--border-color, #e2e8f0)", padding: "12px", borderRadius: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong>{o.local_name} ({o.local_city})</strong>
                          <span className={`badge ${o.status === 'accepted' ? 'status-completed' : ''}`}>{o.status}</span>
                        </div>
                        <p style={{ margin: "6px 0", fontSize: "14px" }}>
                          <strong>Quote:</strong> ${Number(o.offered_price).toFixed(2)} · Start: {o.proposed_start_time} · Duration: {o.duration_hours} hr
                        </p>
                        <p style={{ margin: "4px 0", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
                          {o.proposal_message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: "8px" }}>No quotes submitted yet for this request.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={() => setSelectedReq(null)}>
                Close
              </button>
              {selectedReq.status === "submitted" && (
                <button
                  type="button"
                  className="btn primary"
                  disabled={dispatchingId === selectedReq.id}
                  onClick={() => handleNotifyLocals(selectedReq.id)}
                >
                  {dispatchingId === selectedReq.id ? "Dispatching…" : "Dispatch / Notify Candidate Locals"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
