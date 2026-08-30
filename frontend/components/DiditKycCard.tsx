"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/api";

export default function DiditKycCard({
  verified,
}: {
  verified: boolean;
}) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function startVerification() {
    if (verified || busy) return;

    if (!consent) {
      setMessage(
        "Please confirm consent before starting identity verification."
      );
      return;
    }

    setBusy(true);
    setMessage("Preparing secure identity verification...");

    try {
      const response = await authedFetch(
        "/api/local/kyc/didit/start",
        {
          method: "POST",
          body: JSON.stringify({
            consent: true,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data.detail ||
            "Could not start identity verification."
        );
        return;
      }

      if (data.already_verified) {
        setMessage("Your identity is already verified.");
        window.location.reload();
        return;
      }

      if (!data.url) {
        setMessage(
          "Verification provider did not return a secure verification link."
        );
        return;
      }

      window.location.assign(data.url);
    } catch {
      setMessage(
        "Could not connect to identity verification."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-box didit-kyc-card">
      <div className="dash-title-row">
        <div>
          <span className="eyebrow">
            Secure verification
          </span>

          <h3>Verify your identity</h3>

          <p className="muted">
            Complete a short government-ID and live
            selfie check powered by Didit.
          </p>
        </div>

        <span
          className={`badge ${
            verified ? "" : "badge-neutral"
          }`}
        >
          {verified ? "Verified" : "Required"}
        </span>
      </div>

      {verified ? (
        <div className="didit-kyc-success">
          <strong>Identity verified</strong>
          <span>
            No further identity documents are required.
          </span>
        </div>
      ) : (
        <>
          <div className="didit-kyc-points">
            <span>✓ Usually takes only a few minutes</span>
            <span>
              ✓ Passport is not required
            </span>
            <span>
              ✓ Use a supported government photo ID
            </span>
            <span>
              ✓ Driving licence / state ID may be used
              where supported
            </span>
          </div>

          <label className="didit-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) =>
                setConsent(event.target.checked)
              }
            />

            <span>
              I agree to securely submit my identity
              document and live selfie/liveness data
              for identity verification.
            </span>
          </label>

          <button
            type="button"
            className="btn didit-start-btn"
            disabled={busy || !consent}
            onClick={startVerification}
          >
            {busy
              ? "Starting verification..."
              : "Verify identity"}
          </button>

          <p className="muted didit-manual-note">
            Having trouble with automatic verification?
            You can use the manual review option below.
          </p>
        </>
      )}

      {message ? (
        <div className="notice didit-kyc-message">
          {message}
        </div>
      ) : null}
    </div>
  );
}
