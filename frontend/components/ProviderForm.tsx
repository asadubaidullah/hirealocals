"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Languages,
  Layers,
  FileText
} from "lucide-react";
import { apiUrl } from "@/lib/site";

const DEFAULT_CATEGORIES = [
  "Tour Guide",
  "Local Guide",
  "Photographer",
  "Food Expert",
  "Trip Planner",
  "Interpreter",
  "Shopping Companion",
  "Airport Assistance",
];

export default function ProviderForm() {
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "",
  });

  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Tour Guide",
    "Local Guide",
  ]);

  useEffect(() => {
    fetch(`${apiUrl}/api/content/service-categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          const names = d.map((x: any) => x.name).filter(Boolean);
          if (names.length) setCategories(names);
        }
      })
      .catch(() => {});
  }, []);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedCategories.length) {
      setStatus({
        type: "error",
        message: "Please select at least one service category you can offer.",
      });
      return;
    }

    setStatus({
      type: "loading",
      message: "Submitting your application…",
    });

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      country_code: String(fd.get("country_code") || "GB"),
      city: String(fd.get("city") || "").trim(),
      languages: String(fd.get("languages") || "").trim(),
      categories: selectedCategories.join(", "),
      experience: String(fd.get("experience") || "").trim(),
    };

    try {
      const res = await fetch(`${apiUrl}/api/provider-applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.detail || "Submission failed. Please check your information."
        );
      }

      setStatus({
        type: "success",
        message:
          "Thank you! Your application has been submitted successfully. Our team will review your application and email you with the next onboarding steps.",
      });
      form.reset();
      setSelectedCategories(["Tour Guide", "Local Guide"]);
    } catch (err: any) {
      setStatus({
        type: "error",
        message:
          err.message ||
          "We could not submit your application right now. Please try again.",
      });
    }
  }

  return (
    <form className="bal-form-card" onSubmit={handleSubmit} noValidate={false}>
      <div className="bal-form-header">
        <div className="bal-form-badge">
          <Sparkles size={14} />
          <span>Local Partner Application</span>
        </div>
        <h3>Apply to Become a HireALocals Host</h3>
        <p>
          Fill out your details below. Once reviewed, you can build your public profile, configure your hourly rate, and manage your availability.
        </p>
      </div>

      {status.type === "success" && (
        <div className="bal-alert bal-alert-success" role="alert">
          <CheckCircle2 size={20} />
          <div>
            <strong>Application Received!</strong>
            <p>{status.message}</p>
          </div>
        </div>
      )}

      {status.type === "error" && (
        <div className="bal-alert bal-alert-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Submission Error</strong>
            <p>{status.message}</p>
          </div>
        </div>
      )}

      <div className="bal-form-sections">
        {/* Section 1: Contact Information */}
        <fieldset className="bal-form-fieldset">
          <legend className="bal-legend">
            <User size={16} />
            <span>1. Contact Information</span>
          </legend>

          <div className="bal-field-row bal-field-row-2">
            <div className="bal-field">
              <label htmlFor="bal-name">
                Full Name <span className="req">*</span>
              </label>
              <div className="bal-input-wrap">
                <input
                  id="bal-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Maya Carter"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="bal-field">
              <label htmlFor="bal-email">
                Email Address <span className="req">*</span>
              </label>
              <div className="bal-input-wrap">
                <input
                  id="bal-email"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. maya@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div className="bal-field-row">
            <div className="bal-field">
              <label htmlFor="bal-phone">
                Phone Number / WhatsApp <span className="req">*</span>
              </label>
              <div className="bal-input-wrap">
                <input
                  id="bal-phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="e.g. +1 555 019 2834"
                  autoComplete="tel"
                />
              </div>
              <span className="bal-field-hint">
                Used solely for application communication and verification.
              </span>
            </div>
          </div>
        </fieldset>

        {/* Section 2: Location & Languages */}
        <fieldset className="bal-form-fieldset">
          <legend className="bal-legend">
            <Globe size={16} />
            <span>2. Your Location & Languages</span>
          </legend>

          <div className="bal-field-row bal-field-row-2">
            <div className="bal-field">
              <label htmlFor="bal-country">
                Country <span className="req">*</span>
              </label>
              <div className="bal-input-wrap">
                <select id="bal-country" name="country_code" required defaultValue="US">
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>
            </div>

            <div className="bal-field">
              <label htmlFor="bal-city">
                City / Metropolitan Area <span className="req">*</span>
              </label>
              <div className="bal-input-wrap">
                <input
                  id="bal-city"
                  name="city"
                  type="text"
                  required
                  placeholder="e.g. New York, London, Miami"
                />
              </div>
            </div>
          </div>

          <div className="bal-field-row">
            <div className="bal-field">
              <label htmlFor="bal-languages">
                Languages You Speak <span className="req">*</span>
              </label>
              <div className="bal-input-wrap">
                <input
                  id="bal-languages"
                  name="languages"
                  type="text"
                  required
                  placeholder="e.g. English (Fluent), Spanish (Conversational)"
                />
              </div>
              <span className="bal-field-hint">
                List the primary languages you can comfortably host travelers in.
              </span>
            </div>
          </div>
        </fieldset>

        {/* Section 3: Services Offered */}
        <fieldset className="bal-form-fieldset">
          <legend className="bal-legend">
            <Layers size={16} />
            <span>3. Services You Want to Offer</span>
          </legend>

          <div className="bal-field">
            <label>
              Select Service Categories <span className="req">*</span>
            </label>
            <span className="bal-field-hint" style={{ marginBottom: 12, display: "block" }}>
              Choose the types of private experiences you are interested in hosting.
            </span>

            <div className="bal-category-pill-grid">
              {categories.map((cat) => {
                const isChecked = selectedCategories.includes(cat);
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`bal-cat-pill ${isChecked ? "selected" : ""}`}
                    aria-pressed={isChecked}
                  >
                    <CheckCircle2 size={15} className="bal-cat-check" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        {/* Section 4: Local Background & Bio */}
        <fieldset className="bal-form-fieldset">
          <legend className="bal-legend">
            <FileText size={16} />
            <span>4. Tell Us About Your Local Experience</span>
          </legend>

          <div className="bal-field">
            <label htmlFor="bal-experience">
              Your Local Story & Knowledge <span className="req">*</span>
            </label>
            <div className="bal-input-wrap">
              <textarea
                id="bal-experience"
                name="experience"
                required
                rows={5}
                placeholder="How long have you lived in your city? What neighborhoods, food spots, or cultural stories are you most passionate about sharing with visitors?"
              />
            </div>
            <span className="bal-field-hint">
              This helps our team understand your background and review your application promptly.
            </span>
          </div>
        </fieldset>
      </div>

      <div className="bal-form-footer">
        <div className="bal-form-privacy-note">
          <ShieldCheck size={16} />
          <span>
            We respect your privacy. Your information is securely handled per our Privacy Policy.
          </span>
        </div>

        <button
          type="submit"
          className="btn bal-submit-btn"
          disabled={status.type === "loading"}
        >
          {status.type === "loading" ? (
            <>
              <Loader2 size={18} className="spinner" />
              Submitting Application…
            </>
          ) : (
            <>
              Submit Application
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
