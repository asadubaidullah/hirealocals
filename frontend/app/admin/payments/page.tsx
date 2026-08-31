"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type Payment = {
  id: number;
  booking_id: number;
  booking_status: string;
  traveler_name: string;
  local_name: string;
  mode: string;
  status: string;
  currency: string;
  amount_total: number | null;
  platform_fee: number | null;
  refunded_amount: number;
  paid_at: string | null;
  refunded_at: string | null;
  updated_at: string;
};

type RevenueSummary = {
  period: string;
  gbv: number;
  total_local_payable: number;
  total_platform_fee: number;
  total_discount_spent: number;
  net_platform_revenue: number;
  effective_take_rate: number;
  paid_bookings_count: number;
  total_refund_volume: number;
  refund_count: number;
  payouts: { held: number; unpaid: number; paid: number };
  currency: string;
};

export default function Page() {
  const [items, setItems] = useState<Payment[]>([]);
  const [status, setStatus] = useState("Loading Safepay payments…");
  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("all_time");
  const [summary, setSummary] = useState<RevenueSummary | null>(null);

  async function load() {
    const response = await authedFetch("/api/admin/payments");
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      setStatus(data.detail || "Could not load payments.");
      return;
    }

    setItems(Array.isArray(data) ? data : data.items || []);
    setStatus("");
  }

  async function loadSummary(p: string) {
    try {
      const res = await authedFetch(`/api/admin/revenue/summary?period=${p}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json);
      }
    } catch {}
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadSummary(period);
  }, [period]);

  const shown =
    filter === "all"
      ? items
      : items.filter((item) => item.status === filter);

  return (
    <AdminShell eyebrow="Payment operations" title="Safepay payments">

      {summary && (
        <div className="admin-revenue-kpi-banner" style={{ marginBottom: 24 }}>
          <div className="kpi-banner-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16 }}>Revenue Intelligence</h4>
              <span className="muted" style={{ fontSize: 12 }}>Authoritative platform financials & take-rate</span>
            </div>
            <div className="period-pill-group" style={{ display: "flex", gap: 6 }}>
              {["today", "7d", "30d", "all_time"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`mini-pill-btn ${period === p ? "active" : ""}`}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: period === p ? "#0f172a" : "#fff",
                    color: period === p ? "#fff" : "#475569",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {p === "today" ? "Today" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "All Time"}
                </button>
              ))}
            </div>
          </div>

          <div className="revenue-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="revenue-kpi-box" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Gross Booking Value (GBV)</span>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>${summary.gbv.toFixed(2)}</div>
              <span className="muted" style={{ fontSize: 11 }}>{summary.paid_bookings_count} paid bookings</span>
            </div>

            <div className="revenue-kpi-box" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Net Platform Revenue</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>${summary.net_platform_revenue.toFixed(2)}</div>
              <span className="muted" style={{ fontSize: 11 }}>After ${summary.total_discount_spent.toFixed(2)} promo subsidies</span>
            </div>

            <div className="revenue-kpi-box" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Take Rate</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb", marginTop: 4 }}>{summary.effective_take_rate.toFixed(1)}%</div>
              <span className="muted" style={{ fontSize: 11 }}>12% base buyer fee</span>
            </div>

            <div className="revenue-kpi-box" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Local Payables</span>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>${summary.total_local_payable.toFixed(2)}</div>
              <span className="muted" style={{ fontSize: 11 }}>100% subtotal protected</span>
            </div>

            <div className="revenue-kpi-box" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>Refunds</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: summary.total_refund_volume > 0 ? "#dc2626" : "#64748b", marginTop: 4 }}>
                ${summary.total_refund_volume.toFixed(2)}
              </div>
              <span className="muted" style={{ fontSize: 11 }}>{summary.refund_count} refunds processed</span>
            </div>
          </div>
        </div>
      )}

      {status ? <div className="notice">{status}</div> : null}

      <div className="admin-toolbar">
        <div>
          <h3>Payment records</h3>
          <p className="muted small-text">
            Verified Safepay status is the authoritative payment state.
          </p>
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All payment states</option>
          <option value="checkout_open">Checkout open</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refund_pending">Refund pending</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {shown.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Parties</th>
                <th>Amount</th>
                <th>Gateway</th>
                <th>Payment status</th>
                <th>Updated</th>
              </tr>
            </thead>

            <tbody>
              {shown.map((item) => (
                <tr key={item.id}>

                  <td>
                    <Link
                      className="admin-text-link"
                      href={`/admin/bookings/${item.booking_id}`}
                    >
                      #{item.booking_id}
                    </Link>

                    <div className="muted admin-cell-note">
                      Booking: {item.booking_status}
                    </div>
                  </td>

                  <td>
                    <strong>{item.local_name}</strong>

                    <div className="muted admin-cell-note">
                      Traveler: {item.traveler_name}
                    </div>
                  </td>

                  <td>
                    <strong>
                      {item.currency} {(item.amount_total ?? 0).toFixed(2)}
                    </strong>

                    <div className="muted admin-cell-note">
                      Platform fee {(item.platform_fee ?? 0).toFixed(2)}
                      {" · "}
                      Refunded {(item.refunded_amount || 0).toFixed(2)}
                    </div>
                  </td>

                  <td>
                    <strong>Safepay</strong>
                    <div className="muted admin-cell-note">
                      {String(item.mode || "").replaceAll("_", " ")}
                    </div>
                  </td>

                  <td>
                    <span className={`badge payment-${item.status}`}>
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td>
                    {item.updated_at ?
                       new Date(item.updated_at).toLocaleString()
                      : "—"}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          No Safepay payment records match this filter.
        </div>
      )}

      <div className="notice" style={{ marginTop: 16 }}>
        Refunds are initiated from the Safepay merchant dashboard.
        Verified Safepay webhook events synchronize the payment record
        back to HireALocals.
      </div>

    </AdminShell>
  );
}

