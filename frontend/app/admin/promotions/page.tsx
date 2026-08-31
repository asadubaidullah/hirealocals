"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type Promo = {
  id: number;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_subtotal: number;
  max_uses_total: number | null;
  max_uses_per_user: number;
  current_uses: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  total_redemptions_count: number;
  total_discount_spent: number;
};

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form State
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("0");
  const [maxUsesTotal, setMaxUsesTotal] = useState("");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");

  async function loadPromos() {
    try {
      const res = await authedFetch("/api/admin/promotions");
      if (res.ok) {
        const json = await res.json();
        setPromos(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromos();
  }, []);

  async function handleToggleActive(promo: Promo) {
    try {
      const res = await authedFetch(`/api/admin/promotions/${promo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !promo.is_active }),
      });
      if (res.ok) {
        await loadPromos();
      }
    } catch {
      // ignore
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !discountValue) return;
    setBusy(true);
    setStatus("");
    try {
      const payload: any = {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_subtotal: parseFloat(minSubtotal || "0"),
        max_uses_per_user: parseInt(maxUsesPerUser || "1", 10),
      };
      if (maxDiscount) payload.max_discount = parseFloat(maxDiscount);
      if (maxUsesTotal) payload.max_uses_total = parseInt(maxUsesTotal, 10);
      if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();

      const res = await authedFetch("/api/admin/promotions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create promo code");
      }
      setShowCreate(false);
      setCode("");
      setDescription("");
      setDiscountValue("");
      setMaxDiscount("");
      setMinSubtotal("0");
      setMaxUsesTotal("");
      setExpiresAt("");
      await loadPromos();
      setStatus(`✓ Promo code ${data.code} created successfully.`);
    } catch (err: any) {
      setStatus(err.message || "Failed to create promo code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell eyebrow="Financial operations" title="Promotions & Coupons">
      {status ? <div className={`notice ${status.startsWith("✓") ? "ok" : "err"}`}>{status}</div> : null}

      <div className="admin-toolbar">
        <div>
          <h3>Active & Scheduled Promotions</h3>
          <p className="muted small-text">
            Promotional discounts are absorbed by the marketplace platform fee. Local earnings remain 100% protected.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => setShowCreate(!showCreate)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={16} />
          <span>New Promo Code</span>
        </button>
      </div>

      {showCreate && (
        <div className="admin-card create-promo-panel" style={{ marginBottom: 24 }}>
          <h3>Create New Promotion</h3>
          <form onSubmit={handleCreate} className="admin-form-grid" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Promo Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. SUMMER2026"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase", fontWeight: 700 }}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 10% off summer campaign"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Discount Type</label>
              <select
                className="form-control"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Discount Value *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                placeholder={discountType === "percent" ? "10 (for 10%)" : "15.00"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>

            {discountType === "percent" && (
              <div className="form-group">
                <label>Max Cap ($) (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="e.g. 30.00"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Min Booking Subtotal ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={minSubtotal}
                onChange={(e) => setMinSubtotal(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Max Uses Total (Optional)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Unlimited if blank"
                value={maxUsesTotal}
                onChange={(e) => setMaxUsesTotal(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Max Uses Per User</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={maxUsesPerUser}
                onChange={(e) => setMaxUsesPerUser(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Expiration Date (Optional)</label>
              <input
                type="date"
                className="form-control"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 10 }}>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "Creating..." : "Save Promo Code"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading promotion codes...</p>
      ) : promos.length === 0 ? (
        <div className="admin-empty-state">
          <Tag size={32} className="muted" />
          <p>No promo codes created yet. Click "New Promo Code" above to create one.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Conditions</th>
                <th>Usage / Limit</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong style={{ letterSpacing: "0.05em" }}>{p.code}</strong>
                    {p.description && <div className="muted admin-cell-note">{p.description}</div>}
                  </td>
                  <td>
                    <strong>
                      {p.discount_type === "percent"
                        ? `${p.discount_value}%`
                        : `$${p.discount_value.toFixed(2)}`}
                    </strong>
                    {p.max_discount !== null && (
                      <div className="muted admin-cell-note">Capped at ${p.max_discount.toFixed(2)}</div>
                    )}
                  </td>
                  <td>
                    <div className="admin-cell-note">
                      Min subtotal: ${p.min_subtotal.toFixed(2)}
                    </div>
                    {p.expires_at ? (
                      <div className="muted admin-cell-note">
                        Expires: {new Date(p.expires_at).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="muted admin-cell-note">No expiration</div>
                    )}
                  </td>
                  <td>
                    <strong>{p.current_uses}</strong> / {p.max_uses_total || "∞"} uses
                    <div className="muted admin-cell-note">
                      Max {p.max_uses_per_user}/user
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: "#2563eb" }}>
                      ${p.total_discount_spent.toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? "status-confirmed" : "status-cancelled"}`}>
                      {p.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => handleToggleActive(p)}
                    >
                      {p.is_active ? "Pause" : "Activate"}
                    </button>
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
