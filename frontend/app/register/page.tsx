"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import { apiUrl } from "@/lib/site";
import { COUNTRIES, countryByCode } from "@/lib/countries";

export default function Register() {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [country, setCountry] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");

  function handleCountryChange(value: string) {
    setCountry(value);
    if (!phoneCountry) setPhoneCountry(value);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirm_password") || "");
    const localPhone = String(form.get("phone_number") || "").trim();
    const selectedCountry = countryByCode(country);
    const selectedPhoneCountry = countryByCode(phoneCountry);

    if (!selectedCountry || !selectedPhoneCountry) {
      setIsError(true);
      setStatus("Select your country of residence and mobile country code.");
      return;
    }
    if (password !== confirmPassword) {
      setIsError(true);
      setStatus("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setStatus("");
    setIsError(false);

    const email = String(form.get("email") || "").trim();
    const payload = {
      full_name: String(form.get("full_name") || "").trim(),
      email,
      phone: `${selectedPhoneCountry.dial} ${localPhone}`.trim(),
      country: selectedCountry.name,
      password,
      confirm_age: form.get("confirm_age") === "on",
      accept_terms: form.get("accept_terms") === "on",
    };

    try {
      const r = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        const detail = String(data?.detail || "");
        throw new Error(
          detail === "Internal Server Error"
            ? "We couldn't create your account right now. Please try again."
            : detail || "Registration failed"
        );
      }

      setCreatedEmail(email);
      setStatus("Account created. We sent an email verification link to your inbox.");
    } catch (err: any) {
      setIsError(true);
      setStatus(
        err?.message === "Failed to fetch"
          ? "We couldn't reach HireALocals securely. Please try again in a moment."
          : err?.message || "Could not register"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (createdEmail) {
    return (
      <section className="section auth-section">
        <div className="container auth-page register-page">
          <div className="form-box registration-success">
            <div className="success-icon"><CheckCircle2 size={28}/></div>
            <span className="eyebrow">One more step</span>
            <h1>Verify your email.</h1>
            <p className="lead">We sent a verification link to <strong>{createdEmail}</strong>. Open that link to confirm the address connected to your account.</p>
            <div className="verification-tip"><Mail size={18}/><span>If it is not in your inbox, check spam or junk. You can also request another verification email after signing in.</span></div>
            <Link href="/login" className="btn" style={{width:"100%"}}>Continue to log in</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section auth-section">
      <div className="container auth-page register-page">
        <span className="eyebrow">Traveler account</span>
        <h1>Create your account</h1>
        <p className="muted auth-intro">
          Travelers can join from anywhere. HireALocals currently offers bookable local services in selected UK and US cities.
        </p>

        <form className="form-box register-form" onSubmit={submit}>
          <div className="form-group">
            <label>Full legal name</label>
            <input name="full_name" autoComplete="name" minLength={2} maxLength={120} required />
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Email address</label>
            <input name="email" type="email" autoComplete="email" inputMode="email" required />
            <span className="muted small-text">We&apos;ll send a verification link to this address.</span>
          </div>

          <div className="registration-grid">
            <div className="form-group">
              <label>Country of residence</label>
              <select name="country_code" value={country} onChange={(e) => handleCountryChange(e.target.value)} autoComplete="country" required>
                <option value="" disabled>Select country</option>
                {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Mobile number</label>
              <div className="phone-input-group">
                <select aria-label="Mobile country calling code" value={phoneCountry} onChange={(e) => setPhoneCountry(e.target.value)} className="phone-code-select" required>
                  <option value="" disabled>Country code</option>
                  {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.code} {item.dial}</option>)}
                </select>
                <input name="phone_number" type="tel" autoComplete="tel-national" inputMode="tel" minLength={6} maxLength={24} placeholder="Phone number" required />
              </div>
              <span className="muted small-text">Use a mobile number you can access.</span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <PasswordField label="Password" name="password" autoComplete="new-password" minLength={10} maxLength={128} required hint="Use at least 10 characters. A mix of letters, numbers and symbols is recommended." />
          </div>

          <div style={{ marginTop: 14 }}>
            <PasswordField label="Confirm password" name="confirm_password" autoComplete="new-password" minLength={10} maxLength={128} required />
          </div>

          <div className="account-consents">
            <label className="policy-check">
              <input name="confirm_age" type="checkbox" required />
              <span>I confirm that I am at least 18 years old and legally able to create and use a HireALocals account.</span>
            </label>
            <label className="policy-check">
              <input name="accept_terms" type="checkbox" required />
              <span>I agree to the <Link href="/terms" target="_blank">Terms of Use</Link> and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>.</span>
            </label>
          </div>

          <button className="btn" style={{ width: "100%", marginTop: 20 }} disabled={submitting} aria-busy={submitting}>
            {submitting ? <><span className="btn-spinner" aria-hidden="true" />Creating account...</> : "Create account"}
          </button>
          {status && <div className={`notice ${isError ? "error" : ""}`} style={{ marginTop: 12 }}>{status}</div>}
          <p className="muted register-login-link">Already have an account <Link href="/login" className="admin-text-link">Log in</Link></p>
        </form>
      </div>
    </section>
  );
}

