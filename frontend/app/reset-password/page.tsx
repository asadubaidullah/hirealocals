"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import PasswordField from "@/components/PasswordField";
import { apiUrl } from "@/lib/site";

export default function Page() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
    setReady(true);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !token) return;

    const f = new FormData(e.currentTarget);
    const a = String(f.get("password") || "");
    const b = String(f.get("confirm") || "");

    if (a !== b) {
      setOk(false);
      setMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setOk(false);
    setMsg("");

    try {
      const r = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: a }),
      });
      const d = await r.json().catch(() => ({}));
      setOk(r.ok);
      setMsg(
        r.ok
          ? d.message || "Password updated successfully."
          : d.detail === "Internal Server Error"
            ? "We couldn't update your password right now. Please try again."
            : d.detail || "Unable to reset password."
      );
    } catch {
      setOk(false);
      setMsg("We couldn't reach HireALocals securely. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="container auth-page">
        <span className="eyebrow">Secure reset</span>
        <h1>Choose a new password</h1>

        {ready && !token ? (
          <div className="notice error">Reset token is missing.</div>
        ) : (
          <form className="form-box" onSubmit={submit}>
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              hint="Use at least 10 characters."
            />

            <div style={{ marginTop: 14 }}>
              <PasswordField
                label="Confirm password"
                name="confirm"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </div>

            <button
              className="btn"
              style={{ width: "100%", marginTop: 18 }}
              disabled={!token || submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Updating…
                </>
              ) : (
                "Reset password"
              )}
            </button>

            {msg ? (
              <div
                className={`notice ${ok ? "" : "error"}`}
                style={{ marginTop: 14 }}
              >
                {msg}
              </div>
            ) : null}

            {ok ? (
              <p>
                <Link href="/login" className="admin-text-link">
                  Log in now
                </Link>
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}

