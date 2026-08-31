"use client";

import Link from "next/link";
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

type PaymentLifecycleStats = {
  total_payment_attempts: number;
  paid_count: number;
  processing_count: number;
  failed_count: number;
  refunded_count: number;
  success_rate_pct: number;
  failure_rate_pct: number;
  refund_rate_pct: number;
};

type PayoutAgingBucket = {
  bucket_label: string;
  amount: number;
  count: number;
  local_count: number;
};

type PayoutAgingBreakdown = {
  total_unpaid_liability: number;
  unpaid_count: number;
  total_scheduled_liability: number;
  scheduled_count: number;
  total_held_liability: number;
  held_count: number;
  buckets: PayoutAgingBucket[];
};

type RevenueAnalyticsResponse = {
  kpis: RevenueKPIOverview;
  trends: RevenueTrendPoint[];
  by_city: CityRevenueItem[];
  by_category: CategoryRevenueItem[];
  by_local: LocalRevenueItem[];
  by_promo: PromoRevenueItem[];
  by_referral: ReferralRevenueItem[];
  payment_stats: PaymentLifecycleStats;
  payout_aging: PayoutAgingBreakdown;
};

type ReconciliationRow = {
  booking_id: number;
  booking_status: string;
  traveler_name: string;
  local_name: string;
  booking_total: number;
  payment_status: string;
  safepay_tracker: string;
  charged_amount: number;
  commission_gross: number;
  local_payable: number;
  platform_fee: number;
  payout_status: string;
  reconciliation_status: string;
  discrepancy_note: string;
};

type SettlementLedgerItem = {
  id: number;
  booking_id: number;
  gross_amount: number;
  local_amount: number;
  platform_fee: number;
  payout_status: string;
  notes: string;
  updated_at: string;
  booking_status: string;
  local_name: string;
  tourist_name: string;
};

export default function RevenueCommandCenterPage() {
  const [period, setPeriod] = useState("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "trends" | "destinations" | "categories" | "locals" | "marketing" | "reconciliation" | "payouts" | "exports"
  >("overview");

  const [analytics, setAnalytics] = useState<RevenueAnalyticsResponse | null>(null);
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationRow[]>([]);
  const [settlements, setSettlements] = useState<SettlementLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  // Reconciliation filter
  const [reconFilter, setReconFilter] = useState("all");
  const [reconSearch, setReconSearch] = useState("");

  // Batch Payout selection
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
      {/* Top Controls & Time Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Time Horizon:
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
              onClick={() => setPeriod(btn.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                period === btn.id
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
            />
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Apply
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("summary")}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {actionStatus && (
        <div className="mb-6 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* Executive KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Gross Booking Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            ${kpis ? kpis.gbv.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {kpis && kpis.gbv_delta_pct >= 0 ? (
              <span className="text-emerald-400 font-medium flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.gbv_delta_pct}%
              </span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {kpis?.gbv_delta_pct}%
              </span>
            )}
            <span className="text-slate-500">vs prior period</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Net Platform Revenue</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 mb-1">
            ${kpis ? kpis.net_platform_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {kpis && kpis.net_revenue_delta_pct >= 0 ? (
              <span className="text-emerald-400 font-medium flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.net_revenue_delta_pct}%
              </span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {kpis?.net_revenue_delta_pct}%
              </span>
            )}
            <span className="text-slate-500">vs prior period</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Effective Take Rate</span>
            <Tag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300 mb-1">
            {kpis ? kpis.effective_take_rate : "12.0"}%
          </div>
          <div className="text-[11px] text-slate-500">
            ${kpis?.total_platform_fee.toFixed(2)} collected / ${kpis?.total_discount_spent.toFixed(2)} promo
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Paid Bookings</span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {kpis ? kpis.paid_bookings_count : 0}
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {kpis && kpis.paid_bookings_delta_pct >= 0 ? (
              <span className="text-emerald-400 font-medium flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{kpis.paid_bookings_delta_pct}%
              </span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {kpis?.paid_bookings_delta_pct}%
              </span>
            )}
            <span className="text-slate-500">vs prior period</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Local Payables</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-200 mb-1">
            ${kpis ? kpis.total_local_payable.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500">100% Host Subtotal Protected</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Promo Subsidies</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mb-1">
            ${kpis ? kpis.total_discount_spent.toFixed(2) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500">Platform-funded discounts</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Referral Liabilities</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-300 mb-1">
            ${kpis ? kpis.total_referral_cost.toFixed(2) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500">Qualified referrer rewards</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 uppercase font-medium">Refund Volume</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 mb-1">
            ${kpis ? kpis.total_refund_volume.toFixed(2) : "0.00"}
          </div>
          <div className="text-[11px] text-slate-500">{kpis?.refund_count || 0} processed refunds</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto pb-2">
        {[
          { id: "overview", label: "Overview & Trends", icon: TrendingUp },
          { id: "destinations", label: "Destinations", icon: MapPin },
          { id: "categories", label: "Categories", icon: Layers },
          { id: "locals", label: "Local Partners", icon: Users },
          { id: "marketing", label: "Campaigns & Referrals", icon: Tag },
          { id: "reconciliation", label: "Reconciliation", icon: ShieldCheck },
          { id: "payouts", label: "Payout Liabilities & Aging", icon: Clock },
          { id: "exports", label: "Financial Exports", icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading authoritative revenue intelligence…</div>
      ) : (
        <>
          {/* 1. Overview & Trends Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Trend Chart */}
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                  <span>Revenue & Gross Booking Trajectory</span>
                  <span className="text-xs text-slate-500 font-normal">Aggregated chronological buckets</span>
                </h3>
                {analytics?.trends && analytics.trends.length > 0 ? (
                  <div className="h-64 flex items-end gap-2 pt-8 pb-4 px-2 border-b border-slate-800 overflow-x-auto">
                    {analytics.trends.map((t, idx) => {
                      const maxGbv = Math.max(...analytics.trends.map((p) => p.gbv), 100);
                      const heightPct = Math.max((t.gbv / maxGbv) * 100, 4);
                      const netPct = Math.max((t.net_revenue / maxGbv) * 100, 2);
                      return (
                        <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-700 text-[10px] text-slate-200 p-1.5 rounded shadow-xl pointer-events-none whitespace-nowrap z-20">
                            <div>{t.label} ({t.date})</div>
                            <div className="text-emerald-400 font-bold">GBV: ${t.gbv.toFixed(2)}</div>
                            <div className="text-cyan-400">Net: ${t.net_revenue.toFixed(2)}</div>
                          </div>
                          {/* Bars */}
                          <div className="w-full flex items-end justify-center gap-1 h-48">
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-3 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
                            />
                            <div
                              style={{ height: `${netPct}%` }}
                              className="w-2 bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 truncate w-full text-center">{t.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">No trend transactions in this window.</div>
                )}
                <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Gross Booking Value (GBV)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-cyan-500 rounded-sm" /> Net Platform Revenue
                  </div>
                </div>
              </div>

              {/* Gateway & Payment Intelligence */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment Success Rate</h4>
                  <div className="text-3xl font-bold text-emerald-400 mb-1">
                    {analytics?.payment_stats.success_rate_pct}%
                  </div>
                  <p className="text-xs text-slate-500">
                    {analytics?.payment_stats.paid_count} captured out of {analytics?.payment_stats.total_payment_attempts} attempts.
                  </p>
                </div>
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment Failure Rate</h4>
                  <div className="text-3xl font-bold text-rose-400 mb-1">
                    {analytics?.payment_stats.failure_rate_pct}%
                  </div>
                  <p className="text-xs text-slate-500">
                    {analytics?.payment_stats.failed_count} failed or abandoned transactions.
                  </p>
                </div>
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Refund Ratio</h4>
                  <div className="text-3xl font-bold text-amber-400 mb-1">
                    {analytics?.payment_stats.refund_rate_pct}%
                  </div>
                  <p className="text-xs text-slate-500">
                    {analytics?.payment_stats.refunded_count} refunds processed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Destinations Tab */}
          {activeTab === "destinations" && (
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Revenue by Destination City</h3>
                <span className="text-xs text-slate-500">{analytics?.by_city.length || 0} cities with paid activity</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">City / Destination</th>
                      <th className="py-3 px-4">Country</th>
                      <th className="py-3 px-4 text-right">Paid Bookings</th>
                      <th className="py-3 px-4 text-right">Gross Booking Value</th>
                      <th className="py-3 px-4 text-right">Local Payables</th>
                      <th className="py-3 px-4 text-right">Platform Revenue</th>
                      <th className="py-3 px-4 text-right">Take Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {analytics?.by_city.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {c.city_name}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{c.country_code}</td>
                        <td className="py-3 px-4 text-right">{c.paid_bookings_count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">${c.gbv.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">${c.local_payable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-cyan-300 font-medium">${c.platform_revenue.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">{c.effective_take_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Categories Tab */}
          {activeTab === "categories" && (
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Revenue by Service Category</h3>
                <span className="text-xs text-slate-500">{analytics?.by_category.length || 0} categories</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Service Category</th>
                      <th className="py-3 px-4 text-right">Bookings Count</th>
                      <th className="py-3 px-4 text-right">Gross Booking Value</th>
                      <th className="py-3 px-4 text-right">Local Payables</th>
                      <th className="py-3 px-4 text-right">Platform Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {analytics?.by_category.map((cat, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          {cat.category_name}
                        </td>
                        <td className="py-3 px-4 text-right">{cat.paid_bookings_count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">${cat.gbv.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">${cat.local_payable.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-cyan-300 font-medium">${cat.platform_revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Local Partners Tab */}
          {activeTab === "locals" && (
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Local Partner Performance Ranking</h3>
                <span className="text-xs text-slate-500">Sorted by gross host earnings</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Local Partner</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4 text-right">Paid Bookings</th>
                      <th className="py-3 px-4 text-right">Gross Host Earnings</th>
                      <th className="py-3 px-4 text-right">Platform Fee Contribution</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {analytics?.by_local.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-white">{l.local_name}</td>
                        <td className="py-3 px-4 text-slate-400">{l.city_name}</td>
                        <td className="py-3 px-4 text-right">{l.paid_bookings_count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">${l.gross_earnings.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-cyan-300 font-medium">${l.platform_revenue_generated.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/admin/bookings?local=${l.local_id}`}
                            className="text-xs text-emerald-400 hover:underline"
                          >
                            View Bookings
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Campaigns & Referrals Tab */}
          {activeTab === "marketing" && (
            <div className="space-y-6">
              {/* Promo Campaigns */}
              <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" /> Promo Code Campaigns & Discount Burn
                  </h3>
                  <Link href="/admin/promotions" className="text-xs text-emerald-400 hover:underline">
                    Manage Promo Codes
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Redemptions</th>
                        <th className="py-3 px-4 text-right">Discount Burn</th>
                        <th className="py-3 px-4 text-right">Associated GBV</th>
                        <th className="py-3 px-4 text-right">Net Platform Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {analytics?.by_promo.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-300">{p.code}</td>
                          <td className="py-3 px-4 text-slate-400">{p.discount_type}</td>
                          <td className="py-3 px-4 text-right">{p.redemptions_count}</td>
                          <td className="py-3 px-4 text-right font-medium text-rose-300">-${p.total_discount_burn.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-medium">${p.associated_gbv.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-cyan-300 font-semibold">${p.net_platform_revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Referral Channels */}
              <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" /> Referral Acquisition & Rewards
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Referral Code</th>
                        <th className="py-3 px-4">Referrer User</th>
                        <th className="py-3 px-4 text-right">Referred Signups</th>
                        <th className="py-3 px-4 text-right">Qualified Bookings</th>
                        <th className="py-3 px-4 text-right">Credits Earned</th>
                        <th className="py-3 px-4 text-right">Generated GBV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {analytics?.by_referral.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-sky-300">{r.code}</td>
                          <td className="py-3 px-4 text-white font-medium">{r.referrer_name}</td>
                          <td className="py-3 px-4 text-right">{r.total_referred_users}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400">{r.qualified_bookings_count}</td>
                          <td className="py-3 px-4 text-right text-sky-300 font-medium">${r.total_credits_earned.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-semibold">${r.generated_booking_value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. Reconciliation Explorer Tab */}
          {activeTab === "reconciliation" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Status Filter:</span>
                  {["all", "matched", "warning", "mismatch"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setReconFilter(st)}
                      className={`px-3 py-1 text-xs rounded-lg uppercase tracking-wider font-semibold transition-all ${
                        reconFilter === st
                          ? st === "matched"
                            ? "bg-emerald-500 text-white"
                            : st === "warning"
                            ? "bg-amber-500 text-black"
                            : st === "mismatch"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-700 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by Booking #, traveler, local, tracker..."
                    value={reconSearch}
                    onChange={(e) => setReconSearch(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-72"
                  />
                </div>
              </div>

              <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Booking</th>
                        <th className="py-3 px-4">Traveler / Local</th>
                        <th className="py-3 px-4 text-right">Expected Total</th>
                        <th className="py-3 px-4 text-right">Safepay Charged</th>
                        <th className="py-3 px-4 text-right">Local Payable</th>
                        <th className="py-3 px-4 text-right">Platform Fee</th>
                        <th className="py-3 px-4 text-center">Payout Status</th>
                        <th className="py-3 px-4 text-center">Audit Result</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredReconRows.map((r) => (
                        <tr key={r.booking_id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            <Link href={`/admin/bookings?id=${r.booking_id}`} className="hover:text-emerald-400 underline">
                              #{r.booking_id}
                            </Link>
                            <span className="block text-[10px] text-slate-500 font-normal">{r.booking_status}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-white font-medium">{r.traveler_name}</div>
                            <div className="text-slate-400 text-[11px]">→ {r.local_name}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-200">${r.booking_total.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400">
                            ${r.charged_amount.toFixed(2)}
                            <span className="block text-[10px] text-slate-500 font-mono">{r.payment_status}</span>
                          </td>
                          <td className="py-3 px-4 text-right">${r.local_payable.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-cyan-300 font-medium">${r.platform_fee.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                r.payout_status === "paid"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : r.payout_status === "unpaid"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : r.payout_status === "scheduled"
                                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {r.payout_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                r.reconciliation_status === "matched"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : r.reconciliation_status === "warning"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {r.reconciliation_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">{r.discrepancy_note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 7. Payout Liabilities & Aging Tab */}
          {activeTab === "payouts" && (
            <div className="space-y-6">
              {/* Aging Buckets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analytics?.payout_aging.buckets.map((b) => (
                  <div key={b.bucket_label} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 uppercase font-medium">Aging: {b.bucket_label}</span>
                    <div className="text-2xl font-bold text-amber-300 my-1">${b.amount.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">
                      {b.count} settlements across {b.local_count} local partners
                    </div>
                  </div>
                ))}
              </div>

              {/* Batch Action Toolbar */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-300">
                    {selectedLedgerIds.length} settlement(s) selected
                  </span>
                  <select
                    value={batchTargetStatus}
                    onChange={(e) => setBatchTargetStatus(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
                  >
                    <option value="scheduled">Set status: SCHEDULED</option>
                    <option value="paid">Set status: PAID (Disbursed)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Batch reference / wire notes..."
                    value={batchNote}
                    onChange={(e) => setBatchNote(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-64"
                  />
                </div>

                <button
                  disabled={selectedLedgerIds.length === 0 || batchSubmitting}
                  onClick={handleBatchPayout}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                >
                  {batchSubmitting ? "Updating..." : "Execute Batch Transition"}
                </button>
              </div>

              {/* Settlements Table */}
              <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              settlements.length > 0 &&
                              selectedLedgerIds.length === settlements.filter((s) => s.payout_status !== "void" && s.payout_status !== "paid").length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLedgerIds(
                                  settlements.filter((s) => s.payout_status !== "void" && s.payout_status !== "paid").map((s) => s.id)
                                );
                              } else {
                                setSelectedLedgerIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="py-3 px-4">Ledger / Booking</th>
                        <th className="py-3 px-4">Local Partner</th>
                        <th className="py-3 px-4 text-right">Host Payable</th>
                        <th className="py-3 px-4 text-right">Platform Fee</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {settlements.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              disabled={s.payout_status === "void" || s.payout_status === "paid"}
                              checked={selectedLedgerIds.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLedgerIds([...selectedLedgerIds, s.id]);
                                } else {
                                  setSelectedLedgerIds(selectedLedgerIds.filter((id) => id !== s.id));
                                }
                              }}
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            Ledger #{s.id} (Booking #{s.booking_id})
                          </td>
                          <td className="py-3 px-4 font-medium text-white">{s.local_name}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400">${s.local_amount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-cyan-300">${s.platform_fee.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                s.payout_status === "paid"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : s.payout_status === "unpaid"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : s.payout_status === "scheduled"
                                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {s.payout_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">{s.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. Financial Exports Tab */}
          {activeTab === "exports" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" /> Executive Revenue Summary CSV
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Authoritative high-level summary of Gross Booking Value, Local Payables, Platform Fees, Promo Subsidies, and Net Profit.
                  </p>
                </div>
                <button
                  onClick={() => handleExport("summary")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Summary CSV
                </button>
              </div>

              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Local Settlement & Payout Manifest CSV
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Bank-ready payout manifest containing local partner names, emails, amounts, currency, aging days, and disbursement status.
                  </p>
                </div>
                <button
                  onClick={() => handleExport("settlements")}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Payout Manifest CSV
                </button>
              </div>

              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" /> Transaction Reconciliation Ledger CSV
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Line-by-line financial audit linking every booking with Safepay tracker tokens, local payouts, and discrepancy classifications.
                  </p>
                </div>
                <button
                  onClick={() => handleExport("reconciliation")}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Reconciliation CSV
                </button>
              </div>

              <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-400" /> Promotional & Referral Marketing Audit CSV
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Comprehensive audit of promo code discount spend and referral reward disbursements against generated marketplace volume.
                  </p>
                </div>
                <button
                  onClick={() => handleExport("marketing")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Marketing Audit CSV
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
