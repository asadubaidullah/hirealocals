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

export default function Page() {
  const [items, setItems] = useState<Payment[]>([]);
  const [status, setStatus] = useState("Loading Safepay payments…");
  const [filter, setFilter] = useState("all");

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

  useEffect(() => {
    void load();
  }, []);

  const shown =
    filter === "all"
      ? items
      : items.filter((item) => item.status === filter);

  return (
    <AdminShell eyebrow="Payment operations" title="Safepay payments">

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

