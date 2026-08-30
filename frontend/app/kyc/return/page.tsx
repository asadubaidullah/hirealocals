"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";

type Result = {
  status?: string;
  provider_status?: string;
  verified?: boolean;
  detail?: string;
};

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<Result>({});

  useEffect(() => {
    let live = true;

    (async () => {
      const params = new URLSearchParams(
        window.location.search
      );

      // We intentionally ignore the callback's status
      // parameter. Our backend asks Didit directly.
      const sessionId =
        params.get("verificationSessionId") || "";

      if (!sessionId) {
        if (live) {
          setResult({
            status: "error",
            detail:
              "Verification session information is missing.",
          });
          setLoading(false);
        }
        return;
      }

      const response = await authedFetch(
        `/api/local/kyc/didit/status?session_id=${encodeURIComponent(
          sessionId
        )}`
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!live) return;

      if (!response.ok) {
        setResult({
          status: "error",
          detail:
            data.detail ||
            "Could not confirm verification result.",
        });
      } else {
        setResult(data);
      }

      setLoading(false);
    })();

    return () => {
      live = false;
    };
  }, []);

  let title = "Checking verification";
  let copy =
    "We are securely confirming the result with the identity provider.";

  if (!loading) {
    if (result.verified) {
      title = "Identity verified";
      copy =
        "Your identity verification was approved. Your Local profile can now use the platform's verified identity status.";
    } else if (result.status === "in_review") {
      title = "Verification under review";
      copy =
        "Your verification was submitted successfully and needs additional review. No action is required right now.";
    } else if (result.status === "declined") {
      title = "Verification needs attention";
      copy =
        "The automatic verification could not be approved. You can retry or use manual review from your Local profile.";
    } else if (
      result.status === "retry_required"
    ) {
      title = "Verification not completed";
      copy =
        "The verification session expired or was not completed. Start a new verification from your profile.";
    } else if (result.status === "in_progress") {
      title = "Verification still in progress";
      copy =
        "The identity provider has not returned a final decision yet.";
    } else if (result.status === "error") {
      title = "Could not confirm verification";
      copy =
        result.detail ||
        "Please return to your profile and try again.";
    }
  }

  return (
    <section className="section kyc-return-page">
      <div className="container">
        <div className="form-box kyc-return-card">
          <span className="eyebrow">
            HireALocals identity verification
          </span>

          <h1>{title}</h1>

          <p className="muted">{copy}</p>

          {loading ? (
            <div className="notice">
              Confirming verification result...
            </div>
          ) : null}

          {!loading && result.provider_status ? (
            <div className="kyc-provider-result">
              Provider status
              <strong>{result.provider_status}</strong>
            </div>
          ) : null}

          <div className="action-row">
            <Link
              className="btn"
              href="/local-dashboard/profile"
            >
              Back to profile
            </Link>

            <Link
              className="btn secondary"
              href="/local-dashboard"
            >
              Local dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
