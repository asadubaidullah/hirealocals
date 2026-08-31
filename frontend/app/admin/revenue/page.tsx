"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  MapPin,
  Users,
  Tag,
  ShieldCheck,
  Clock,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";

import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type RevenueKPIOverview = {
  period: string;
  start_date: string | null;
  end_date: string | null;
  gbv: number;
  total_local_payable: number;
  total_platform_fee: number;
  total_discount_spent: number;
  total_referral_cost: number;
  net_platform_revenue: number;
  effective_take_rate: number;
  paid_bookings_count: number;
  total_refund_volume: number;
  refund_count: number;
  payout_held: number;
  payout_unpaid: number;
  payout_paid: number;
  gbv_delta_pct: number;
  net_revenue_delta_pct: number;
  paid_bookings_delta_pct: number;
  currency: string;
};

type RevenueTrendPoint = {
  date: string;
  label: string;
  gbv: number;
  net_revenue: number;
  platform_fee: number;
  discounts: number;
  refunds: number;
  local_payable: number;
  bookings_count: number;
};

type CityRevenueItem = {
  city_name: string;
  country_code: string;
  paid_bookings_count: number;
  gbv: number;
  local_payable: number;
  platform_revenue: number;
  effective_take_rate: number;
};

type CategoryRevenueItem = {
  category_name: string;
  paid_bookings_count: number;
  gbv: number;
  local_payable: number;
  platform_revenue: number;
};

type LocalRevenueItem = {
  local_id: number;
  local_name: string;
  city_name: string;
  paid_bookings_count: number;
  gross_earnings: number;
  platform_revenue_generated: number;
};

type PromoRevenueItem = {
  code: string;
  discount_type: string;
  redemptions_count: number;
  total_discount_burn: number;
  associated_gbv: number;
  net_platform_revenue: number;
};

type ReferralRevenueItem = {
  code: string;
  referrer_name: string;
  total_referred_users: number;
  qualified_bookings_count: number;
  total_credits_earned: number;
  generated_booking_value: number;
};

type PayoutAgingBucket = {
  bucket_label: string;
  count: number;
  total_amount: number;
};

type ReconciliationSummary = {
  matched_count: number;
  discrepancy_count: number;
  pending_capture_count: number;
  refunded_count: number;
  total_discrepancy_amount: number;
};

type RevenueAnalyticsResponse = {
  kpis: RevenueKPIOverview;
  trends: RevenueTrendPoint[];
  by_city: CityRevenueItem[];
  by_category: CategoryRevenueItem[];
  by_local: LocalRevenueItem[];
  by_promo: PromoRevenueItem[];
  by_referral: ReferralRevenueItem[];
  aging_buckets: PayoutAgingBucket[];
  reconciliation_summary: ReconciliationSummary;
};

type ReconciliationAuditRow = {
  booking_id: number;
  booking_status: string;
  booking_total: number;
  payment_status: string;
  safepay_tracker: string;
  charged_amount: number;
  local_payable: number;
  platform_fee: number;
  payout_status: string;
  reconciliation_status: "MATCHED" | "DISCREPANCY" | "PENDING_CAPTURE" | "REFUNDED";
  discrepancy_note: string;
  traveler_name: string;
  local_name: string;
  created_at: string;
};

type SettlementLedgerItem = {
  id: number;
  booking_id: number;
  local_profile_id: number;
  total_booking_amount: number;
  platform_commission_pct: number;
  platform_commission_amount: number;
  local_amount: number;
  payout_status: "held" | "unpaid" | "scheduled" | "paid" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
};

export default function RevenuePage() {
  const [period, setPeriod] = useState<string>("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "destinations" | "categories" | "locals" | "marketing" | "reconciliation" | "settlements">("overview");

  const [analytics, setAnalytics] = useState<RevenueAnalyticsResponse | null>(null);
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationAuditRow[]>([]);
  const [settlements, setSettlements] = useState<SettlementLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  const [reconFilter, setReconFilter] = useState<string>("all");
  const [reconSearch, setReconSearch] = useState("");

  const [selectedLedgerIds, setSelectedLedgerIds] = useState<number[]>([]);
  const [batchTargetStatus, setBatchTargetStatus] = useState<"scheduled" | "paid">("scheduled");
  const [batchNote, setBatchNote] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setActionStatus("");

    let url = `/api/admin/revenue/analytics?period=${period}`;
    if (period === "custom" && fromDate && toDate) {
      url += `&from_date=${fromDate}&to_date=${toDate}`;
    }

    try {
      const [resAnalytics, resRecon, resSettlements] = await Promise.all([
        authedFetch(url),
        authedFetch(`/api/admin/revenue/reconciliation?period=${period}${period === "custom" && fromDate && toDate ? `&from_date=${fromDate}&to_date=${toDate}` : ""}`),
        authedFetch("/api/admin/commission"),
      ]);

      if (resAnalytics.ok) {
        const dataAnalytics = await resAnalytics.json();
        setAnalytics(dataAnalytics);
      }
      if (resRecon.ok) {
        const dataRecon = await resRecon.json();
        setReconciliationRows(Array.isArray(dataRecon) ? dataRecon : []);
      }
      if (resSettlements.ok) {
        const dataSettlements = await resSettlements.json();
        setSettlements(Array.isArray(dataSettlements) ? dataSettlements : []);
      }
    } catch {
      setActionStatus("Failed to load revenue command center data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [period]);

  async function handleBatchPayout() {
    if (selectedLedgerIds.length === 0) return;
    if (!confirm(`Are you sure you want to transition ${selectedLedgerIds.length} settlement(s) to "${batchTargetStatus.toUpperCase()}"?`)) {
      return;
    }

    setBatchSubmitting(true);
    setActionStatus("");
    try {
      const res = await authedFetch("/api/admin/commission/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledger_ids: selectedLedgerIds,
          target_status: batchTargetStatus,
          reference_note: batchNote.trim(),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setActionStatus(`Successfully updated ${result.updated_count} settlements ($${result.total_amount}) to ${result.target_status}.`);
        setSelectedLedgerIds([]);
        setBatchNote("");
        await loadData();
      } else {
        const err = await res.json();
        setActionStatus(`Batch update failed: ${err.detail || "Unknown error"}`);
      }
    } catch {
      setActionStatus("Network error during batch update.");
    } finally {
      setBatchSubmitting(false);
    }
  }

  function handleExport(type: "summary" | "settlements" | "reconciliation" | "marketing") {
    let url = `/api/admin/revenue/export/${type}?period=${period}`;
    if (period === "custom" && fromDate && toDate) {
      url += `&from_date=${fromDate}&to_date=${toDate}`;
    }
    window.open(url, "_blank");
  }

  const kpis = analytics?.kpis;
  const filteredReconRows = reconciliationRows.filter((r) => {
    if (reconFilter !== "all" && r.reconciliation_status !== reconFilter) return false;
    if (reconSearch.trim()) {
      const q = reconSearch.toLowerCase();
      return (
        r.booking_id.toString().includes(q) ||
        r.traveler_name.toLowerCase().includes(q) ||
        r.local_name.toLowerCase().includes(q) ||
        r.safepay_tracker.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminShell
      eyebrow="Financial Operations"
      title="Revenue Command Center"
    >
      <div className="rev-cc-container">
        {/* Top Controls & Time Horizon */}
        <div className="rev-cc-horizon-bar">
          <div className="rev-cc-horizon-pills">
            <span className="rev-cc-horizon-label">
              <Calendar size={13} /> Horizon:
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "mtd", label: "MTD" },
              { id: "qtd", label: "QTD" },
              { id: "all_time", label: "All Time" },
              { id: "custom", label: "Custom" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPeriod(btn.id)}
                className={
                  period === btn.id
                    ? "rev-cc-pill active"
                    : "rev-cc-pill"
                }
              >
                {btn.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="rev-cc-custom-dates">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span>to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <button
                type="button"
                onClick={loadData}
                className="rev-cc-export-btn"
              >
                <RefreshCw size={13} /> Apply
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleExport("summary")}
              className="rev-cc-export-btn"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {actionStatus && (
          <div className="notice mb-0">
            <CheckCircle2 size={16} />
            <span>{actionStatus}</span>
          </div>
        )}

        {/* Executive KPI Grid */}
        <div className="rev-cc-kpi-grid">
          <div className="rev-cc-kpi-card">
            <div className="rev-cc-kpi-head">
              <span className="rev-cc-kpi-title">Gross Booking Value</span>
              <span className="rev-cc-kpi-icon"><DollarSign size={16} /></span>
            </div>
            <div className="rev-cc-kpi-value">
              ${kpis ? kpis.gbv.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
            </div>
            <div className="rev-cc-kpi-foot">
              {kpis && kpis.gbv_delta_pct >= 0 ? (
                <span className="rev-cc-delta-up">
                  <ArrowUpRight size={13} /> +{kpis.gbv_delta_pct}%
                </span>
              ) : (
                <span className="rev-cc-delta-down">
                  <ArrowDownRight size={13} /> {kpis?.gbv_delta_pct}%
                </span>
              )}
              <span>vs prior period</span>
            </div>
          </div>

          <div className="rev-cc-kpi-card">
            <div className="rev-cc-kpi-head">
              <span className="rev-cc-kpi-title">Net Platform Revenue</span>
              <span className="rev-cc-kpi-icon"><TrendingUp size={16} /></span>
            </div>
            <div className="rev-cc-kpi-value" style={{ color: "#059669" }}>
              ${kpis ? kpis.net_platform_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
            </div>
            <div className="rev-cc-kpi-foot">
              {kpis && kpis.net_revenue_delta_pct >= 0 ? (
                <span className="rev-cc-delta-up">
                  <ArrowUpRight size={13} /> +{kpis.net_revenue_delta_pct}%
                </span>
              ) : (
                <span className="rev-cc-delta-down">
                  <ArrowDownRight size={13} /> {kpis?.net_revenue_delta_pct}%
                </span>
              )}
              <span>vs prior period</span>
            </div>
          </div>

          <div className="rev-cc-kpi-card">
            <div className="rev-cc-kpi-head">
              <span className="rev-cc-kpi-title">Effective Take Rate</span>
              <span className="rev-cc-kpi-icon"><Tag size={16} /></span>
            </div>
            <div className="rev-cc-kpi-value">
              {kpis ? kpis.effective_take_rate : "12.0"}%
            </div>
            <div className="rev-cc-kpi-foot">
              <span>${kpis?.total_platform_fee.toFixed(2) || "0.00"} fee / ${kpis?.total_discount_spent.toFixed(2) || "0.00"} promo</span>
            </div>
          </div>

          <div className="rev-cc-kpi-card">
            <div className="rev-cc-kpi-head">
              <span className="rev-cc-kpi-title">Paid Bookings</span>
              <span className="rev-cc-kpi-icon"><Users size={16} /></span>
            </div>
            <div className="rev-cc-kpi-value">
              {kpis ? kpis.paid_bookings_count : 0}
            </div>
            <div className="rev-cc-kpi-foot">
              {kpis && kpis.paid_bookings_delta_pct >= 0 ? (
                <span className="rev-cc-delta-up">
                  <ArrowUpRight size={13} /> +{kpis.paid_bookings_delta_pct}%
                </span>
              ) : (
                <span className="rev-cc-delta-down">
                  <ArrowDownRight size={13} /> {kpis?.paid_bookings_delta_pct}%
                </span>
              )}
              <span>completed</span>
            </div>
          </div>
        </div>

        {/* Secondary Metric Strip */}
        <div className="rev-cc-subkpi-grid">
          <div className="rev-cc-subkpi-card">
            <div className="rev-cc-subkpi-label">Local Payables (Escrow)</div>
            <div className="rev-cc-subkpi-val">${kpis?.total_local_payable.toFixed(2) || "0.00"}</div>
          </div>
          <div className="rev-cc-subkpi-card">
            <div className="rev-cc-subkpi-label">Promo Subsidies</div>
            <div className="rev-cc-subkpi-val" style={{ color: "#d97706" }}>${kpis?.total_discount_spent.toFixed(2) || "0.00"}</div>
          </div>
          <div className="rev-cc-subkpi-card">
            <div className="rev-cc-subkpi-label">Referral Liabilities</div>
            <div className="rev-cc-subkpi-val" style={{ color: "#6366f1" }}>${kpis?.total_referral_cost.toFixed(2) || "0.00"}</div>
          </div>
          <div className="rev-cc-subkpi-card">
            <div className="rev-cc-subkpi-label">Refunds & Chargebacks</div>
            <div className="rev-cc-subkpi-val" style={{ color: "#e11d48" }}>${kpis?.total_refund_volume.toFixed(2) || "0.00"}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="rev-cc-tabs-bar">
          {[
            { id: "overview", label: "Trends & Unit Economics", icon: TrendingUp },
            { id: "destinations", label: "Geographic Breakdown", icon: MapPin },
            { id: "categories", label: "Experience Categories", icon: Layers },
            { id: "locals", label: "Host Performance", icon: Users },
            { id: "marketing", label: "Campaigns & Referrals", icon: Tag },
            { id: "reconciliation", label: "Reconciliation Ledger", icon: ShieldCheck },
            { id: "settlements", label: "Settlement Operations", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={
                  activeTab === tab.id
                    ? "rev-cc-tab-btn active"
                    : "rev-cc-tab-btn"
                }
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & Trends */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="rev-cc-panel">
              <div className="rev-cc-panel-head">
                <div>
                  <h3 className="rev-cc-panel-title">Revenue Trajectory & Daily Volume</h3>
                  <div className="rev-cc-panel-desc">Daily progression of Gross Booking Value and Net Yield.</div>
                </div>
                <div style={{ fontSize: "11px", color: "#6b8076", fontWeight: 700 }}>
                  Green = Net Revenue • Light = Local Payouts
                </div>
              </div>

              {analytics?.trends && analytics.trends.length > 0 ? (
                <div className="rev-cc-chart-container">
                  {analytics.trends.map((t, idx) => {
                    const maxGbv = Math.max(...analytics.trends.map((x) => x.gbv), 100);
                    const heightPct = Math.max((t.gbv / maxGbv) * 100, 4);
                    return (
                      <div key={idx} className="rev-cc-chart-col">
                        <div className="rev-cc-chart-bar-wrap">
                          <div
                            className="rev-cc-chart-bar-fill"
                            style={{ height: `${heightPct}%` }}
                            title={`${t.label}: GBV $${t.gbv.toFixed(2)}, Net $${t.net_revenue.toFixed(2)} (${t.bookings_count} bookings)`}
                          />
                        </div>
                        <span className="rev-cc-chart-label">{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">No trend points available for this period.</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <div className="rev-cc-panel">
                <h4 className="rev-cc-panel-title" style={{ fontSize: "14px", marginBottom: "12px" }}>Platform Take-Rate Health</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Standard Take Rate</span>
                    <strong>12.00%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Effective Realized Rate</span>
                    <strong style={{ color: "#059669" }}>{kpis?.effective_take_rate || 12.00}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Discount Drag</span>
                    <span style={{ color: "#d97706" }}>-${kpis?.total_discount_spent.toFixed(2) || "0.00"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Referral Reward Cost</span>
                    <span style={{ color: "#6366f1" }}>-${kpis?.total_referral_cost.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              <div className="rev-cc-panel">
                <h4 className="rev-cc-panel-title" style={{ fontSize: "14px", marginBottom: "12px" }}>Escrow & Liquidity Position</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Disbursed Local Payouts</span>
                    <strong style={{ color: "#059669" }}>${kpis?.payout_paid.toFixed(2) || "0.00"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Held Escrow (In-Trip)</span>
                    <strong style={{ color: "#d97706" }}>${kpis?.payout_held.toFixed(2) || "0.00"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b8076" }}>Unpaid Settlement Backlog</span>
                    <strong style={{ color: "#e11d48" }}>${kpis?.payout_unpaid.toFixed(2) || "0.00"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Destinations */}
        {activeTab === "destinations" && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Country</th>
                  <th>Paid Bookings</th>
                  <th>Gross Booking Value</th>
                  <th>Local Payouts</th>
                  <th>Platform Revenue</th>
                  <th>Effective Take Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.by_city && analytics.by_city.length > 0 ? (
                  analytics.by_city.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.city_name}</strong></td>
                      <td>{c.country_code}</td>
                      <td>{c.paid_bookings_count}</td>
                      <td>${c.gbv.toFixed(2)}</td>
                      <td>${c.local_payable.toFixed(2)}</td>
                      <td><strong style={{ color: "#059669" }}>${c.platform_revenue.toFixed(2)}</strong></td>
                      <td>{c.effective_take_rate}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400">No destination revenue records in this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Categories */}
        {activeTab === "categories" && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Service Category</th>
                  <th>Paid Bookings</th>
                  <th>Gross Booking Value</th>
                  <th>Local Payouts</th>
                  <th>Platform Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.by_category && analytics.by_category.length > 0 ? (
                  analytics.by_category.map((cat, i) => (
                    <tr key={i}>
                      <td><strong>{cat.category_name}</strong></td>
                      <td>{cat.paid_bookings_count}</td>
                      <td>${cat.gbv.toFixed(2)}</td>
                      <td>${cat.local_payable.toFixed(2)}</td>
                      <td><strong style={{ color: "#059669" }}>${cat.platform_revenue.toFixed(2)}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">No category revenue records in this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Local Hosts */}
        {activeTab === "locals" && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Host ID</th>
                  <th>Host Name</th>
                  <th>Primary City</th>
                  <th>Bookings Count</th>
                  <th>Host Gross Earnings</th>
                  <th>Platform Fee Generated</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.by_local && analytics.by_local.length > 0 ? (
                  analytics.by_local.map((l, i) => (
                    <tr key={i}>
                      <td>#{l.local_id}</td>
                      <td><strong>{l.local_name}</strong></td>
                      <td>{l.city_name}</td>
                      <td>{l.paid_bookings_count}</td>
                      <td>${l.gross_earnings.toFixed(2)}</td>
                      <td><strong style={{ color: "#059669" }}>${l.platform_revenue_generated.toFixed(2)}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">No host earnings records in this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Marketing & Campaigns */}
        {activeTab === "marketing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="table-wrap">
              <h4 style={{ padding: "14px 18px 0", margin: 0, fontSize: "14px" }}>Promotional Discount ROI</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Promo Code</th>
                    <th>Type</th>
                    <th>Redemptions</th>
                    <th>Total Subsidy Burn</th>
                    <th>Associated GBV</th>
                    <th>Net Revenue Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.by_promo && analytics.by_promo.length > 0 ? (
                    analytics.by_promo.map((p, i) => (
                      <tr key={i}>
                        <td><strong>{p.code}</strong></td>
                        <td>{p.discount_type}</td>
                        <td>{p.redemptions_count}</td>
                        <td style={{ color: "#d97706" }}>-${p.total_discount_burn.toFixed(2)}</td>
                        <td>${p.associated_gbv.toFixed(2)}</td>
                        <td><strong style={{ color: "#059669" }}>${p.net_platform_revenue.toFixed(2)}</strong></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">No promotional campaign redemptions recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <h4 style={{ padding: "14px 18px 0", margin: 0, fontSize: "14px" }}>Referral Attribution Channel Performance</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Referral Code</th>
                    <th>Referrer Name</th>
                    <th>Referred Users</th>
                    <th>Completed Bookings</th>
                    <th>Credits Earned</th>
                    <th>Generated GBV</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.by_referral && analytics.by_referral.length > 0 ? (
                    analytics.by_referral.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.code}</strong></td>
                        <td>{r.referrer_name}</td>
                        <td>{r.total_referred_users}</td>
                        <td>{r.qualified_bookings_count}</td>
                        <td style={{ color: "#6366f1" }}>${r.total_credits_earned.toFixed(2)}</td>
                        <td><strong>${r.generated_booking_value.toFixed(2)}</strong></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">No referral campaign activities recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Reconciliation Ledger */}
        {activeTab === "reconciliation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="rev-cc-horizon-bar">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="rev-cc-horizon-label"><Filter size={13} /> Filter:</span>
                {[
                  { id: "all", label: "All Audit Rows" },
                  { id: "MATCHED", label: "100% Matched" },
                  { id: "DISCREPANCY", label: "Discrepancies" },
                  { id: "PENDING_CAPTURE", label: "Pending Capture" },
                  { id: "REFUNDED", label: "Refunded" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReconFilter(f.id)}
                    className={
                      reconFilter === f.id
                        ? "rev-cc-pill active"
                        : "rev-cc-pill"
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="Search ID, traveler, host..."
                    value={reconSearch}
                    onChange={(e) => setReconSearch(e.target.value)}
                    style={{ paddingLeft: "32px", fontSize: "12px", borderRadius: "8px", border: "1px solid #dce5e0", height: "34px" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("reconciliation")}
                  className="rev-cc-export-btn"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Traveler</th>
                    <th>Host Partner</th>
                    <th>Booking Total</th>
                    <th>Payment Status</th>
                    <th>Safepay Tracker</th>
                    <th>Charged Total</th>
                    <th>Local Payout</th>
                    <th>Platform Fee</th>
                    <th>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReconRows.length > 0 ? (
                    filteredReconRows.map((r) => (
                      <tr key={r.booking_id}>
                        <td><strong>#{r.booking_id}</strong></td>
                        <td>{r.traveler_name}</td>
                        <td>{r.local_name}</td>
                        <td>${r.booking_total.toFixed(2)}</td>
                        <td>
                          <span className={r.payment_status === "paid" ? "badge badge-success" : "badge badge-warning"}>
                            {r.payment_status}
                          </span>
                        </td>
                        <td><code>{r.safepay_tracker || "N/A"}</code></td>
                        <td>${r.charged_amount.toFixed(2)}</td>
                        <td>${r.local_payable.toFixed(2)}</td>
                        <td><strong style={{ color: "#059669" }}>${r.platform_fee.toFixed(2)}</strong></td>
                        <td>
                          <span
                            className={
                              r.reconciliation_status === "MATCHED"
                                ? "badge badge-success"
                                : r.reconciliation_status === "DISCREPANCY"
                                ? "badge badge-danger"
                                : "badge badge-neutral"
                            }
                          >
                            {r.reconciliation_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-slate-400">No reconciliation records match current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 7: Settlement Operations */}
        {activeTab === "settlements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Aging buckets */}
            <div className="rev-cc-aging-grid">
              {analytics?.aging_buckets?.map((b) => (
                <div
                  key={b.bucket_label}
                  className={b.bucket_label.includes("30+") ? "rev-cc-aging-card urgent" : "rev-cc-aging-card"}
                >
                  <div className="rev-cc-aging-title">{b.bucket_label} Aging</div>
                  <div className="rev-cc-aging-amount">${b.total_amount.toFixed(2)}</div>
                  <div className="rev-cc-aging-count">{b.count} pending items</div>
                </div>
              ))}
            </div>

            {/* Batch action toolbar */}
            <div className="rev-cc-horizon-bar">
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <span className="rev-cc-horizon-label">Batch Action:</span>
                <select
                  value={batchTargetStatus}
                  onChange={(e) => setBatchTargetStatus(e.target.value as any)}
                  style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "8px", border: "1px solid #dce5e0" }}
                >
                  <option value="scheduled">Mark Selected as SCHEDULED</option>
                  <option value="paid">Mark Selected as PAID</option>
                </select>

                <input
                  type="text"
                  placeholder="Optional reference note..."
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "8px", border: "1px solid #dce5e0", width: "220px" }}
                />

                <button
                  type="button"
                  disabled={selectedLedgerIds.length === 0 || batchSubmitting}
                  onClick={handleBatchPayout}
                  className="btn btn-primary"
                  style={{ padding: "6px 14px", fontSize: "12px" }}
                >
                  {batchSubmitting ? "Processing..." : `Execute Batch (${selectedLedgerIds.length})`}
                </button>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleExport("settlements")}
                  className="rev-cc-export-btn"
                >
                  <Download size={13} /> Export Payout Manifest
                </button>
              </div>
            </div>

            {/* Settlements table */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "36px" }}>
                      <input
                        type="checkbox"
                        checked={selectedLedgerIds.length > 0 && selectedLedgerIds.length === settlements.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLedgerIds(settlements.map((s) => s.id));
                          else setSelectedLedgerIds([]);
                        }}
                      />
                    </th>
                    <th>Ledger ID</th>
                    <th>Booking ID</th>
                    <th>Booking Amount</th>
                    <th>Fee %</th>
                    <th>Platform Fee</th>
                    <th>Local Payout</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.length > 0 ? (
                    settlements.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedLedgerIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedLedgerIds([...selectedLedgerIds, s.id]);
                              else setSelectedLedgerIds(selectedLedgerIds.filter((id) => id !== s.id));
                            }}
                          />
                        </td>
                        <td>#{s.id}</td>
                        <td><strong>#{s.booking_id}</strong></td>
                        <td>${s.total_booking_amount.toFixed(2)}</td>
                        <td>{s.platform_commission_pct}%</td>
                        <td><strong style={{ color: "#059669" }}>${s.platform_commission_amount.toFixed(2)}</strong></td>
                        <td><strong>${s.local_amount.toFixed(2)}</strong></td>
                        <td>
                          <span
                            className={
                              s.payout_status === "paid"
                                ? "badge badge-success"
                                : s.payout_status === "scheduled"
                                ? "badge badge-warning"
                                : "badge badge-neutral"
                            }
                          >
                            {s.payout_status}
                          </span>
                        </td>
                        <td style={{ fontSize: "11px", color: "#6b8076" }}>{s.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-slate-400">No settlement records available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
