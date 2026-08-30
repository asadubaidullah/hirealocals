"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "@/components/PasswordField";
import { apiUrl } from "@/lib/site";
import { dashboardFor, saveSession } from "@/lib/auth";

export default function Login() {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* HIREALOCALS 2FA LOGIN R1 */
  const [twoFactorChallenge, setTwoFactorChallenge] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [
    twoFactorMethod,
    setTwoFactorMethod,
  ] = useState<
    "authenticator" |
    "email" |
    "recovery"
  >("authenticator");

  const [
    emailAvailable,
    setEmailAvailable,
  ] = useState(false);

  const [
    authenticatorAvailable,
    setAuthenticatorAvailable,
  ] = useState(true);

  const [
    twoFactorMaskedEmail,
    setTwoFactorMaskedEmail,
  ] = useState("");

  const [
    emailCodeSent,
    setEmailCodeSent,
  ] = useState(false);

  const [
    emailCanResend,
    setEmailCanResend,
  ] = useState(true);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setStatus("");
    setIsError(false);

    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      const r = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        const detail = String(data?.detail || "");
        throw new Error(
          detail === "Internal Server Error"
            ? "We couldn't sign you in right now. Please try again."
            : detail || "Login failed"
        );
      }

      if (data.two_factor_required) {
        const challengeToken = String(
          data.challenge_token || ""
        );

        if (!challengeToken) {
          throw new Error(
            "Two-factor login challenge was not returned."
          );
        }

        setTwoFactorChallenge(
          challengeToken
        );

        setTwoFactorMethod(
          "authenticator"
        );

        setEmailCodeSent(false);
        setEmailCanResend(true);

        await loadEmailMethod(
          challengeToken
        );

        setTwoFactorCode("");

        setStatus(
          "Password verified. Choose a verification method."
        );

        return;
      }

      saveSession(data);
      setStatus("Signed in. Opening your dashboard…");

      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;

      router.replace(
        data.role === "tourist" && safeNext ? safeNext : dashboardFor(data.role)
      );
      router.refresh();
    } catch (err: any) {
      setIsError(true);
      setStatus(
        err?.message === "Failed to fetch"
          ? "We couldn't reach HireALocals securely. Please try again in a moment."
          : err?.message || "Could not sign in"
      );
    } finally {
      setSubmitting(false);
    }
  }



  async function loadEmailMethod(
    challengeToken:string
  ){

    setEmailAvailable(false);
    setTwoFactorMaskedEmail("");

    try{

      const response =
        await fetch(
          `${apiUrl}/api/auth/2fa/email/method`,
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json",
            },
            body:JSON.stringify({
              challenge_token:
                challengeToken,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(()=>({}));

      if(response.ok){

        setEmailAvailable(
          Boolean(
            data.email_available
            ?? data.available
          )
        );

        const authAvailable =
          Boolean(
            data.authenticator_available
          );

        setAuthenticatorAvailable(
          authAvailable
        );

        if(
          !authAvailable
          && Boolean(
            data.email_available
            ?? data.available
          )
        ){
          setTwoFactorMethod(
            "email"
          );
        }

        setTwoFactorMaskedEmail(
          String(
            data.masked_email
            || ""
          )
        );
      }

    }
    catch{

      setEmailAvailable(false);
    }
  }


  async function sendEmailOtp(){

    if(
      submitting
      || !twoFactorChallenge
      || !emailAvailable
      || (
        emailCodeSent
        && !emailCanResend
      )
    ){
      return;
    }

    setSubmitting(true);
    setStatus("");
    setIsError(false);

    try{

      const response =
        await fetch(
          `${apiUrl}/api/auth/2fa/email/send-login`,
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json",
            },
            body:JSON.stringify({
              challenge_token:
                twoFactorChallenge,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(()=>({}));

      if(!response.ok){

        throw new Error(
          data.detail
          || "Could not send Email OTP."
        );
      }

      setEmailCodeSent(true);
      setEmailCanResend(false);

      setTwoFactorMaskedEmail(
        String(
          data.masked_email
          || twoFactorMaskedEmail
        )
      );

      if(
        data.delivery_status
        === "dev_queued"
      ){

        setStatus(
          "Development mode: the code is available in Admin > Email outbox because SMTP is not configured."
        );

      }else{

        setStatus(
          `A 6-digit code was sent to ${
            data.masked_email
            || twoFactorMaskedEmail
          }.`
        );
      }

      window.setTimeout(
        ()=>{
          setEmailCanResend(true);
        },
        60000
      );

    }
    catch(error:any){

      setIsError(true);

      setStatus(
        error?.message
        || "Could not send Email OTP."
      );

    }
    finally{

      setSubmitting(false);
    }
  }


  async function verifyTwoFactor(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      submitting
      || !twoFactorChallenge
    ) {
      return;
    }

    setSubmitting(true);
    setStatus("");
    setIsError(false);

    try {
      const response = await fetch(
        `${apiUrl}${
          twoFactorMethod === "email"
            ? "/api/auth/2fa/email/verify-login"
            : "/api/auth/2fa/verify-login"
        }`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            challenge_token:
              twoFactorChallenge,
            code:
              twoFactorCode.trim(),
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail
          || "Invalid two-factor code."
        );
      }

      saveSession(data);

      setStatus(
        "Verified. Opening your dashboard..."
      );

      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(
              window.location.search
            ).get("next")
          : null;

      const safeNext =
        next
        && next.startsWith("/")
        && !next.startsWith("//")
          ? next
          : null;

      router.replace(
        data.role === "tourist"
        && safeNext
          ? safeNext
          : dashboardFor(
              data.role
            )
      );

      router.refresh();

    } catch (err: any) {

      setIsError(true);

      setStatus(
        err?.message
        || "Could not verify two-factor authentication."
      );

    } finally {

      setSubmitting(false);
    }
  }


  if (twoFactorChallenge) {

    return (
      <section className="section">

        <div className="container auth-page hal-login-2fa-page">

          <span className="eyebrow">
            Account security
          </span>

          <h1>
            Two-factor verification
          </h1>

          <form
            className="form-box hal-login-2fa"
            onSubmit={verifyTwoFactor}
          >

            <div className="hal-login-2fa-icon">
              2FA
            </div>

            <h2>
              Verify it's you
            </h2>

            <p className="muted">
              Enter the 6-digit code from your
              authenticator app. You may also
              enter one unused recovery code.
            </p>

            
            <div className="hal-login-2fa-methods">

              {authenticatorAvailable && (


              <button
                type="button"
                className={
                  twoFactorMethod === "authenticator"
                    ? "active"
                    : ""
                }
                onClick={()=>{
                  setTwoFactorMethod(
                    "authenticator"
                  );
                  setTwoFactorCode("");
                  setStatus("");
                  setIsError(false);
                }}
              >
                Authenticator
                <span>Recommended</span>
              </button>


              )}


              {emailAvailable && (

                <button
                  type="button"
                  className={
                    twoFactorMethod === "email"
                      ? "active"
                      : ""
                  }
                  onClick={()=>{
                    setTwoFactorMethod(
                      "email"
                    );
                    setTwoFactorCode("");
                    setStatus("");
                    setIsError(false);
                  }}
                >
                  Email code
                  <span>Backup</span>
                </button>

              )}

            </div>


            {twoFactorMethod === "email" && (

              <div className="hal-login-email-otp">

                <div>

                  <strong>
                    Email verification
                  </strong>

                  <span>
                    Send a one-time code to{" "}
                    {twoFactorMaskedEmail}
                  </span>

                </div>

                <button
                  type="button"
                  className="btn secondary"
                  disabled={
                    submitting
                    || (
                      emailCodeSent
                      && !emailCanResend
                    )
                  }
                  onClick={sendEmailOtp}
                >
                  {emailCodeSent
                    ? emailCanResend
                      ? "Resend code"
                      : "Sent ? wait 60s"
                    : "Send code"
                  }
                </button>

              </div>

            )}


<div className="form-group">

              <label>
                {twoFactorMethod === "email"
                  ? "Email verification code"
                  : "Authenticator code"
                }
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={
                  event =>
                    setTwoFactorCode(
                      event.target.value
                    )
                }
                placeholder="123456"
                maxLength={40}
                autoFocus
                required
              />

            </div>

            <button
              className="btn"
              disabled={
                submitting
                || twoFactorCode.trim().length < 6
                || (
                  twoFactorMethod === "email"
                  && !emailCodeSent
                )
              }
            >
              {submitting
                ? "Verifying..."
                : "Verify & sign in"
              }
            </button>

            <button
              type="button"
              className="btn secondary"
              disabled={submitting}
              onClick={() => {
                setTwoFactorChallenge("");
                setTwoFactorCode("");
                setStatus("");
                setIsError(false);
              }}
            >
              Back to login
            </button>

          </form>

          {status && (
            <div
              className={
                `notice ${
                  isError
                    ? "error"
                    : ""
                }`
              }
            >
              {status}
            </div>
          )}

        </div>

      </section>
    );
  }

  return (
    <section className="section">
      <div className="container auth-page">
        <span className="eyebrow">Welcome back</span>
        <h1>Log in</h1>

        <form className="form-box" method="post" action="/login" onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="btn"
            style={{ width: "100%", marginTop: 20 }}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Log in"
            )}
          </button>

          {status ? (
            <div
              className={`notice ${isError ? "error" : ""}`}
              style={{ marginTop: 14 }}
            >
              {status}
            </div>
          ) : null}

          <div className="auth-links">
            <p className="muted" style={{ fontSize: 13 }}>
              New traveler?{" "}
              <Link
                href="/register"
                style={{ color: "var(--green)", fontWeight: 800 }}
              >
                Create an account
              </Link>
            </p>
            <Link href="/forgot-password" className="admin-text-link">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

