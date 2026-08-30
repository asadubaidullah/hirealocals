"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type AuditItem = {
  id: number;
  actor_name: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  request_id: string;
  created_at: string;
};

export default function Page() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("Loading audit trail…");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    (async () => {
      setStatus("Loading audit trail…");

      const params = new URLSearchParams({
        page: String(page),
        page_size: "50",
      });

      if (query) {
        params.set("q", query);
      }

      const response = await authedFetch(`/api/admin/audit?${params}`);

      if (!response.ok) {
        setStatus("Could not load audit log");
        return;
      }

      const data = await response.json();

      setItems(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setStatus("");
    })();
  }, [page, query]);

  return (
    <AdminShell eyebrow="Security & operations" title="Audit log">
      <p className="muted">
        Append-only history of important account, booking, moderation,
        content and admin actions.
      </p>

      <div className="admin-toolbar">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search action, entity or summary…"
        />
        <span className="muted">{total} events</span>
      </div>

      {status ? <div className="notice">{status}</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.created_at).toLocaleString()}</td>

                <td>
                  <strong>{item.actor_name}</strong>
                  {item.actor_email ? (
                    <div className="muted small-text">
                      {item.actor_email}
                    </div>
                  ) : null}
                </td>

                <td>
                  <code>{item.action}</code>
                </td>

                <td>
                  {item.entity_type}
                  {item.entity_id ? (
                    <div className="muted">#{item.entity_id}</div>
                  ) : null}
                </td>

                <td>
                  {item.summary || "—"}
                  {item.request_id ? (
                    <div className="muted small-text">
                      Request {item.request_id.slice(0, 12)}…
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!status && !items.length ? (
        <div className="empty">No matching audit events yet.</div>
      ) : null}

      {pages > 1 ? (
        <div className="pagination">
          <button
            className="mini-btn secondary-mini"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <span>
            Page <strong>{page}</strong> of {pages}
          </span>

          <button
            className="mini-btn secondary-mini"
            disabled={page >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}

