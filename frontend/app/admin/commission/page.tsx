"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type Item = {
  id: number;
  booking_id: number;
  booking_status: string;
  local_name: string;
  tourist_name: string;
  gross_amount: number;
  local_amount: number;
  platform_fee: number;
  payout_status: string;
  notes: string;
  payment?: {
    status?: string;
  } | null;
};

const manualStatuses = new Set([
  "pending",
  "held",
  "unpaid",
  "scheduled",
  "paid",
  "void",
]);

function payoutLabel(value: string) {
  if (manualStatuses.has(value)) {
    return value.replaceAll("_", " ");
  }

  return "gateway managed";
}

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("Loading settlement ledger…");

  async function load() {
    const response = await authedFetch("/api/admin/commission");
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.detail || "Could not load settlement ledger.");
      return;
    }

    setItems(Array.isArray(data) ? data : data.items || []);
    setStatus("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(item: Item, next: string) {
    if (!manualStatuses.has(item.payout_status)) {
      setStatus(
        "This settlement is controlled by the verified payment state."
      );
      return;
    }

    const notes =
      next === "paid" ?
         window.prompt(
            "Optional payout/reference note",
            item.notes || ""
          ) ?? item.notes
        : item.notes;

    setStatus("Updating settlement…");

    const response = await authedFetch(
      `/api/admin/commission/${item.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          payout_status: next,
          notes,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data.detail || "Update failed.");
      return;
    }

    await load();
  }

  const active = items.filter((item) => item.payout_status !== "void");

  const gross = active.reduce(
    (sum, item) => sum + item.gross_amount,
    0
  );

  const fees = active.reduce(
    (sum, item) => sum + item.platform_fee,
    0
  );

  const due = items
    .filter((item) =>
      ["unpaid", "scheduled"].includes(item.payout_status)
    )
    .reduce((sum, item) => sum + item.local_amount, 0);

  const paid = items
    .filter((item) => item.payout_status === "paid")
    .reduce((sum, item) => sum + item.local_amount, 0);

  return (
    <AdminShell eyebrow="Finance operations" title="Settlement ledger">

      {status ? <div className="notice">{status}</div> : null}

      <div className="kpis">
        <div className="kpi">
          <strong>${gross.toFixed(2)}</strong>
          <span className="muted">Gross booking value</span>
        </div>

        <div className="kpi">
          <strong>${fees.toFixed(2)}</strong>
          <span className="muted">Platform fees</span>
        </div>

        <div className="kpi">
          <strong>${due.toFixed(2)}</strong>
          <span className="muted">Payouts due</span>
        </div>

        <div className="kpi">
          <strong>${paid.toFixed(2)}</strong>
          <span className="muted">Paid to Locals</span>
        </div>
      </div>

      <h3 style={{ marginTop: 28 }}>Booking settlements</h3>

      {items.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Parties</th>
                <th>Customer total</th>
                <th>Local amount</th>
                <th>Fee</th>
                <th>Payment</th>
                <th>Payout</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const paymentStatus =
                  item.payment?.status || "manual";

                const manual =
                  manualStatuses.has(item.payout_status);

                return (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="admin-text-link"
                        href={`/admin/bookings/${item.booking_id}`}
                      >
                        #{item.booking_id}
                      </Link>
                    </td>

                    <td>
                      <strong>{item.local_name}</strong>
                      <div className="muted admin-cell-note">
                        Traveler: {item.tourist_name}
                      </div>
                    </td>

                    <td>${item.gross_amount.toFixed(2)}</td>
                    <td>${item.local_amount.toFixed(2)}</td>
                    <td>${item.platform_fee.toFixed(2)}</td>

                    <td>
                      <span className={`badge payment-${paymentStatus}`}>
                        {paymentStatus.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td>
                      <span className="badge">
                        {payoutLabel(item.payout_status)}
                      </span>
                    </td>

                    <td>
                      {manual ? (
                        <div className="action-row">
                          <button
                            className="mini-btn secondary-mini"
                            onClick={() => update(item, "held")}
                          >
                            Hold
                          </button>

                          <button
                            className="mini-btn"
                            onClick={() => update(item, "scheduled")}
                          >
                            Schedule
                          </button>

                          <button
                            className="mini-btn"
                            onClick={() => update(item, "paid")}
                          >
                            Paid
                          </button>
                        </div>
                      ) : (
                        <Link
                          className="mini-btn secondary-mini"
                          href="/admin/payments"
                        >
                          Payment record
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          Settlement entries will appear when bookings exist.
        </div>
      )}

    </AdminShell>
  );
}

