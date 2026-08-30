"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type SystemData = {
  payment_mode?: string;
  safepay_configured?: boolean;
  safepay_webhook_configured?: boolean;
  counts?: Record<string, number>;
};

export default function Page() {
  const [data, setData] = useState<SystemData | null>(null);
  const [status, setStatus] = useState("Loading dashboard…");

  useEffect(() => {
    (async () => {
      const response = await authedFetch("/api/admin/system-status");

      if (!response.ok) {
        setStatus("Could not load dashboard overview.");
        return;
      }

      setData(await response.json());
      setStatus("");
    })();
  }, []);

  const counts = data?.counts || {};

  return (
    <AdminShell eyebrow="Overview" title="Dashboard">

      <p className="muted">
        Monitor marketplace activity, bookings, payments and platform readiness.
      </p>

      {status ? <div className="notice">{status}</div> : null}

      <div className="kpis">
        <div className="kpi">
          <strong>{counts.users || 0}</strong>
          <span className="muted">Users</span>
        </div>

        <div className="kpi">
          <strong>{counts.locals || 0}</strong>
          <span className="muted">Locals</span>
        </div>

        <div className="kpi">
          <strong>{counts.bookings || 0}</strong>
          <span className="muted">Bookings</span>
        </div>

        <div className="kpi">
          <strong>{counts.reviews || 0}</strong>
          <span className="muted">Reviews</span>
        </div>
      </div>

      <div className="dashboard-grid-2">

        <section className="form-box">
          <h3>Operations</h3>

          <div className="quick-link-list">
            <Link href="/admin/bookings">
              <strong>Bookings</strong>
              <span>Review and manage marketplace bookings</span>
            </Link>

            <Link href="/admin/payments">
              <strong>Payments</strong>
              <span>View verified Safepay payment records</span>
            </Link>

            <Link href="/admin/commission">
              <strong>Settlements</strong>
              <span>Manage platform fees and local settlements</span>
            </Link>

            <Link href="/admin/travelers">
              <strong>Travelers</strong>
              <span>Review traveler accounts</span>
            </Link>

            <Link href="/admin/locals">
              <strong>Locals</strong>
              <span>Manage Local accounts and verification</span>
            </Link>

            <Link href="/admin/system">
              <strong>System status</strong>
              <span>Review launch and infrastructure readiness</span>
            </Link>
          </div>
        </section>

        <section className="form-box">
          <h3>Payment gateway</h3>

          <div className="admin-credential-box">
            <strong>Safepay</strong>

            <span>
              Mode:{" "}
              <b>
                {String(data?.payment_mode || "manual").replaceAll("_", " ")}
              </b>
            </span>

            <span>
              Credentials:{" "}
              <b>
                {data?.safepay_configured ?
                   "Configured"
                  : "Not configured"}
              </b>
            </span>

            <span>
              Webhook:{" "}
              <b>
                {data?.safepay_webhook_configured ?
                   "Configured"
                  : "Not configured"}
              </b>
            </span>
          </div>

          <p className="muted">
            Safepay is the payment gateway used by HireALocals.
          </p>
        </section>

      </div>

    </AdminShell>
  );
}

