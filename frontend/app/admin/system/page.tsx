"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("Running checks…");

  useEffect(() => {
    (async () => {
      const response = await authedFetch("/api/admin/system-status");

      if (!response.ok) {
        setStatus("Could not load system status");
        return;
      }

      setData(await response.json());
      setStatus("");
    })();
  }, []);

  if (!data) {
    return (
      <AdminShell eyebrow="Launch readiness" title="System status">
        <div className="notice">{status}</div>
      </AdminShell>
    );
  }

  const issues: string[] = data.production_issues || [];

  const safepayReady = Boolean(
    data.safepay_configured &&
    data.safepay_webhook_configured
  );

  const paymentMode = String(
    data.payment_mode || "manual"
  ).replaceAll("_", " ");

  return (
    <AdminShell eyebrow="Launch readiness" title="System status">
      <p className="muted">
        Safe overview only — secrets and passwords are never displayed here.
      </p>

      <div className="stats-row system-stats">
        <div>
          <strong>V{data.version}</strong>
          <span>API version</span>
        </div>

        <div>
          <strong>{data.environment}</strong>
          <span>Environment</span>
        </div>

        <div>
          <strong>{data.database}</strong>
          <span>Database</span>
        </div>

        <div>
          <strong>{data.rate_limit_enabled ? "On" : "Off"}</strong>
          <span>Rate limiting</span>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <section className="form-box">
          <h3>Production checks</h3>

          {issues.length ? (
            <>
              <div className="notice error">
                {issues.length} production issue
                {issues.length === 1 ? "" : "s"} detected.
              </div>

              <ul>
                {issues.map((issue: string) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="notice">
              No critical configuration issues reported for the current
              environment.
            </div>
          )}

          <p className="muted">
            Strict startup guard:{" "}
            <strong>
              {data.strict_production_checks ? "Enabled" : "Disabled"}
            </strong>
          </p>

          <p className="muted">
            API docs:{" "}
            <strong>
              {data.api_docs_enabled ? "Enabled" : "Disabled"}
            </strong>
            {" · "}
            SMTP:{" "}
            <strong>
              {data.smtp_configured ? "Configured" : "Not configured"}
            </strong>
          </p>

          <div className="payment-system-box">
            <strong>Payment gateway: Safepay</strong>

            <span>
              Mode: <b>{paymentMode}</b>
            </span>

            <span>
              Safepay credentials:{" "}
              <b>
                {data.safepay_configured ?
                   "Configured"
                  : "Not configured"}
              </b>
            </span>

            <span>
              Safepay webhook:{" "}
              <b>
                {data.safepay_webhook_configured ?
                   "Configured"
                  : "Not configured"}
              </b>
            </span>

            <span>
              Gateway readiness:{" "}
              <b>
                {data.payment_mode === "manual"
                  ? "Manual mode"
                  : safepayReady
                    ? "Configured"
                    : "Needs configuration"}
              </b>
            </span>
          </div>
        </section>

        <section className="form-box">
          <h3>Data snapshot</h3>

          <div className="system-counts">
            {Object.entries(data.counts || {}).map(([key, value]) => (
              <div key={key}>
                <strong>{String(value)}</strong>
                <span>{key.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Demo accounts</h3>

          {data.demo_accounts_active?.length ? (
            <div className="notice error">
              Active demo accounts: {data.demo_accounts_active.join(", ")}
            </div>
          ) : (
            <div className="notice">
              No known demo accounts are active.
            </div>
          )}

          <p className="muted">
            Demo seeding:{" "}
            <strong>
              {data.seed_demo_data ? "Enabled" : "Disabled"}
            </strong>
          </p>
        </section>
      </div>

      <div className="notice" style={{ marginTop: 20 }}>
        Before going live, run <code>python scripts/preflight.py</code> and
        create a backup with{" "}
        <code>python scripts/backup_database.py</code>.
      </div>
    </AdminShell>
  );
}

