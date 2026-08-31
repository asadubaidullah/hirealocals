"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Gift, Users, Award, ShieldCheck } from "lucide-react";
import { authedFetch } from "@/lib/api";

type Attribution = {
  id: number;
  referee_name: string;
  status: string;
  reward_amount: number;
  created_at: string;
  qualified_at?: string | null;
};

type ReferralData = {
  code: string;
  reward_credit: number;
  referee_discount: number;
  total_referred_count: number;
  total_credits_earned: number;
  invite_url: string;
  attributions: Attribution[];
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claimStatus, setClaimStatus] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);

  async function loadData() {
    try {
      const res = await authedFetch("/api/traveler/referrals");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function copyToClipboard() {
    if (!data?.invite_url) return;
    navigator.clipboard.writeText(data.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimCode.trim()) return;
    setClaimBusy(true);
    setClaimStatus("");
    try {
      const res = await authedFetch("/api/referrals/claim", {
        method: "POST",
        body: JSON.stringify({ code: claimCode.trim() }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.detail || "Failed to claim referral code");
      }
      setClaimStatus(resData.message || "Referral code applied successfully!");
      setClaimCode("");
      await loadData();
    } catch (err: any) {
      setClaimStatus(err.message || "Failed to claim code");
    } finally {
      setClaimBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="traveler-referrals-view">
        <p className="muted">Loading referral hub...</p>
      </div>
    );
  }

  const pendingCount = data?.attributions.filter((a) => a.status === "pending").length || 0;

  return (
    <div className="traveler-referrals-view">
      <div className="dashboard-header-block">
        <div>
          <h2>Referrals & Travel Credits</h2>
          <p className="muted">
            Invite friends to HireALocals. Give ${data?.referee_discount.toFixed(2)}, earn ${data?.reward_credit.toFixed(2)} when they complete their first experience!
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="referral-stats-grid">
        <div className="referral-kpi-card">
          <div className="kpi-icon-wrap reward-icon">
            <Award size={24} />
          </div>
          <div>
            <span className="kpi-label">Travel Credits Earned</span>
            <strong className="kpi-value">${(data?.total_credits_earned || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="referral-kpi-card">
          <div className="kpi-icon-wrap friends-icon">
            <Users size={24} />
          </div>
          <div>
            <span className="kpi-label">Completed Referrals</span>
            <strong className="kpi-value">{data?.total_referred_count || 0}</strong>
          </div>
        </div>

        <div className="referral-kpi-card">
          <div className="kpi-icon-wrap pending-icon">
            <Gift size={24} />
          </div>
          <div>
            <span className="kpi-label">Pending First Trips</span>
            <strong className="kpi-value">{pendingCount}</strong>
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div className="referral-share-card">
        <div className="share-content">
          <h3>Your Exclusive Referral Link</h3>
          <p className="muted">
            Share this link with your network. Your friends will automatically receive a ${data?.referee_discount.toFixed(2)} discount on their first completed trip.
          </p>
          <div className="referral-link-bar">
            <input type="text" readOnly value={data?.invite_url || ""} className="referral-url-input" />
            <button type="button" className="btn btn-copy" onClick={copyToClipboard}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <div className="referral-code-pill">
            <span>Referral Code: <strong>{data?.code}</strong></span>
          </div>
        </div>
      </div>

      {/* Enter a Referral Code */}
      <div className="referral-claim-card">
        <h3>Have a friend's referral code?</h3>
        <p className="muted">Enter it here before your first booking to claim your welcome discount.</p>
        <form onSubmit={handleClaim} className="referral-claim-form">
          <input
            type="text"
            className="form-control"
            placeholder="e.g. REF-SARAH-9F12"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
            style={{ textTransform: "uppercase", maxWidth: 280 }}
          />
          <button type="submit" className="btn" disabled={claimBusy || !claimCode.trim()}>
            {claimBusy ? "Applying..." : "Claim Welcome Credit"}
          </button>
        </form>
        {claimStatus && (
          <div className={`notice ${claimStatus.includes("applied") || claimStatus.includes("✓") ? "ok" : "err"}`} style={{ marginTop: 10 }}>
            {claimStatus}
          </div>
        )}
      </div>

      {/* Referral Activity Table */}
      <div className="referral-activity-card">
        <h3>Referral Activity</h3>
        {!data?.attributions || data.attributions.length === 0 ? (
          <div className="empty-referrals-state">
            <ShieldCheck size={32} className="muted" />
            <p>No referral activity yet. Start sharing your link above to earn travel credits!</p>
          </div>
        ) : (
          <div className="referrals-table-wrap">
            <table className="referrals-table">
              <thead>
                <tr>
                  <th>Referred Traveler</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {data.attributions.map((att) => (
                  <tr key={att.id}>
                    <td><strong>{att.referee_name}</strong></td>
                    <td>{new Date(att.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ref-badge-${att.status}`}>
                        {att.status === "qualified" ? "✓ Experience Completed" : "Pending First Trip"}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: att.status === "qualified" ? "#16a34a" : "#64748b" }}>
                        ${att.reward_amount.toFixed(2)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
