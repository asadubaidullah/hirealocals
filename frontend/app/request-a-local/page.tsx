"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Compass,
  ArrowRight,
  Info
} from "lucide-react";
import { apiUrl } from "@/lib/site";
import { authedFetch } from "@/lib/api";
import { getToken, getRole } from "@/lib/auth";

function RequestALocalForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const [city, setCity] = useState(sp.get("city") || "");
  const [countryCode, setCountryCode] = useState("GB");
  const [bookingDate, setBookingDate] = useState(sp.get("date") || "");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [dateEnd, setDateEnd] = useState("");
  const [preferredTime, setPreferredTime] = useState("morning");
  const [durationHours, setDurationHours] = useState("3");
  const [guests, setGuests] = useState(sp.get("guests") || "1");
  const [category, setCategory] = useState(sp.get("category") || "Custom Experience");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [interests, setInterests] = useState("");
  const [languagePreference, setLanguagePreference] = useState("English");
  const [budgetAmount, setBudgetAmount] = useState(sp.get("max_rate") || "");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [meetingPreference, setMeetingPreference] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);

  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!city.trim()) {
      setError("Please enter a destination city.");
      return;
    }
    if (!bookingDate) {
      setError("Please select your travel date.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Please describe what you want to experience (at least 10 characters).");
      return;
    }

    const token = getToken();
    if (!token) {
      // Save draft state to sessionStorage
      const draft = {
        city,
        countryCode,
        bookingDate,
        flexibleDates,
        dateEnd,
        preferredTime,
        durationHours,
        guests,
        category,
        title,
        description,
        interests,
        languagePreference,
        budgetAmount,
        budgetCurrency,
        specialRequirements,
        meetingPreference,
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("hirealocals_request_draft", JSON.stringify(draft));
      }
      router.push("/login?next=/request-a-local&prompt=request");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        city_name: city.trim(),
        country_code: countryCode.trim().toUpperCase(),
        booking_date: bookingDate,
        flexible_dates: flexibleDates,
        date_end: flexibleDates && dateEnd ? dateEnd : null,
        preferred_time: preferredTime,
        duration_hours: Number(durationHours) || 3.0,
        guests: Number(guests) || 1,
        category: category.trim() || "Custom Experience",
        title: title.trim() || `${category} in ${city}`,
        description: description.trim(),
        interests: interests.trim(),
        language_preference: languagePreference.trim() || "English",
        budget_amount: budgetAmount ? Number(budgetAmount) : null,
        budget_currency: budgetCurrency,
        special_requirements: specialRequirements.trim(),
        meeting_preference: meetingPreference.trim(),
      };

      const res = await authedFetch(`${apiUrl}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to submit request (HTTP ${res.status})`);
      }

      const created = await res.json();
      setSuccess(created);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("hirealocals_request_draft");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your request.");
    } finally {
      setBusy(false);
    }
  }

  // Restore draft if user logged in
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("hirealocals_request_draft");
      if (saved) {
        try {
          const d = JSON.parse(saved);
          if (d.city) setCity(d.city);
          if (d.countryCode) setCountryCode(d.countryCode);
          if (d.bookingDate) setBookingDate(d.bookingDate);
          if (d.flexibleDates) setFlexibleDates(d.flexibleDates);
          if (d.dateEnd) setDateEnd(d.dateEnd);
          if (d.preferredTime) setPreferredTime(d.preferredTime);
          if (d.durationHours) setDurationHours(d.durationHours);
          if (d.guests) setGuests(d.guests);
          if (d.category) setCategory(d.category);
          if (d.title) setTitle(d.title);
          if (d.description) setDescription(d.description);
          if (d.interests) setInterests(d.interests);
          if (d.languagePreference) setLanguagePreference(d.languagePreference);
          if (d.budgetAmount) setBudgetAmount(d.budgetAmount);
          if (d.budgetCurrency) setBudgetCurrency(d.budgetCurrency);
          if (d.specialRequirements) setSpecialRequirements(d.specialRequirements);
          if (d.meetingPreference) setMeetingPreference(d.meetingPreference);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  if (success) {
    return (
      <div className="request-success-card" role="status">
        <div className="request-success-icon">
          <CheckCircle2 size={48} />
        </div>
        <h2>Your Request Has Been Submitted!</h2>
        <p className="request-success-sub">
          We have broadcasted your request to verified Local Partners in <strong>{success.city_name}</strong>.
          You will receive tailored proposals directly in your dashboard.
        </p>

        <div className="request-success-details">
          <div className="detail-item">
            <span>Destination</span>
            <strong>{success.city_name}, {success.country_code}</strong>
          </div>
          <div className="detail-item">
            <span>Travel Date</span>
            <strong>{success.booking_date} ({success.preferred_time})</strong>
          </div>
          <div className="detail-item">
            <span>Group Size</span>
            <strong>{success.guests} {success.guests === 1 ? "guest" : "guests"} ({success.duration_hours} hrs)</strong>
          </div>
          {success.budget_amount && (
            <div className="detail-item">
              <span>Target Budget</span>
              <strong>${Number(success.budget_amount).toFixed(2)} {success.budget_currency}</strong>
            </div>
          )}
        </div>

        <div className="request-success-actions">
          <Link href="/dashboard/requests" className="btn primary">
            View My Requests & Received Quotes &rarr;
          </Link>
          <Link href="/explore" className="btn secondary">
            Explore More Destinations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="request-a-local-page">
      <div className="request-hero-banner">
        <div className="request-hero-badge">
          <Sparkles size={16} />
          <span>Custom Demand Capture</span>
        </div>
        <h1>Request a Custom Local Experience</h1>
        <p className="request-hero-sub">
          Can&apos;t find the exact match? Tell us what you want to experience and verified local experts in your destination will send you personalized price and itinerary proposals.
        </p>

        <div className="request-trust-grid">
          <div className="trust-pill">
            <ShieldCheck size={18} />
            <span>KYC-Verified Local Partners Only</span>
          </div>
          <div className="trust-pill">
            <DollarSign size={18} />
            <span>Transparent All-Inclusive Quotes</span>
          </div>
          <div className="trust-pill">
            <Compass size={18} />
            <span>100% Tailored to Your Schedule</span>
          </div>
        </div>
      </div>

      <div className="request-form-container">
        <form onSubmit={handleSubmit} className="request-card-form">
          {error && (
            <div className="form-error-banner" role="alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!isAuthed && (
            <div className="form-auth-notice">
              <Info size={18} />
              <span>
                You can fill out your request now. You will be prompted to log in or register before submitting.
              </span>
            </div>
          )}

          <div className="form-section">
            <h3 className="section-title">
              <MapPin size={18} /> Destination & Category
            </h3>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="req-city">Destination City *</label>
                <input
                  id="req-city"
                  type="text"
                  placeholder="e.g. London, New York, Edinburgh"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="req-category">Experience Category</label>
                <select
                  id="req-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Custom Experience">Custom Experience</option>
                  <option value="Walking Tours">Walking Tours</option>
                  <option value="Food Expert">Food & Culinary</option>
                  <option value="Nightlife">Nightlife & Bars</option>
                  <option value="Photography">Photography Spots</option>
                  <option value="History & Culture">History & Culture</option>
                  <option value="Hidden Gems">Hidden Gems & Locals Only</option>
                  <option value="Shopping">Shopping & Fashion</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <Calendar size={18} /> Timing & Group
            </h3>
            <div className="form-grid-3">
              <div className="field-group">
                <label htmlFor="req-date">Travel Date *</label>
                <input
                  id="req-date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="req-time">Preferred Time</label>
                <select
                  id="req-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                >
                  <option value="morning">Morning (9am - 12pm)</option>
                  <option value="afternoon">Afternoon (12pm - 5pm)</option>
                  <option value="evening">Evening (5pm - 9pm)</option>
                  <option value="flexible">Flexible / Any Time</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="req-duration">Estimated Hours</label>
                <select
                  id="req-duration"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                >
                  <option value="2">2 hours</option>
                  <option value="3">3 hours (Recommended)</option>
                  <option value="4">4 hours (Half Day)</option>
                  <option value="6">6 hours</option>
                  <option value="8">8 hours (Full Day)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: "16px" }}>
              <div className="field-group">
                <label htmlFor="req-guests">Number of Guests</label>
                <select
                  id="req-guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                >
                  <option value="1">1 person (Solo)</option>
                  <option value="2">2 people (Couple/Friends)</option>
                  <option value="3">3 people</option>
                  <option value="4">4 people (Small Group)</option>
                  <option value="5">5 people</option>
                  <option value="6">6+ people (Group)</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="req-lang">Preferred Language</label>
                <input
                  id="req-lang"
                  type="text"
                  placeholder="e.g. English, Spanish, French"
                  value={languagePreference}
                  onChange={(e) => setLanguagePreference(e.target.value)}
                />
              </div>
            </div>

            <div className="checkbox-row" style={{ marginTop: "12px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={flexibleDates}
                  onChange={(e) => setFlexibleDates(e.target.checked)}
                />
                <span>My dates are flexible</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <Compass size={18} /> What do you want to experience?
            </h3>
            <div className="field-group">
              <label htmlFor="req-title">Trip Title (Optional)</label>
              <input
                id="req-title"
                type="text"
                placeholder="e.g. Foodie walking tour and secret viewpoint spots in London"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginTop: "16px" }}>
              <label htmlFor="req-desc">Description & Wishlist *</label>
              <textarea
                id="req-desc"
                rows={5}
                placeholder="Describe your interests, places you'd love to see, pace of walking, dietary preferences, or anything specific you are looking for in a local partner..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <span className="field-hint">Minimum 10 characters. The more detail you share, the better matching quotes you will receive.</span>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <DollarSign size={18} /> Budget & Preferences
            </h3>
            <div className="form-grid-2">
              <div className="field-group">
                <label htmlFor="req-budget">Target Budget (USD Total, Optional)</label>
                <input
                  id="req-budget"
                  type="number"
                  placeholder="e.g. 150"
                  min="10"
                  max="10000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="req-meet">Meeting Point Preference (Optional)</label>
                <input
                  id="req-meet"
                  type="text"
                  placeholder="e.g. My hotel lobby, central tube station, landmark"
                  value={meetingPreference}
                  onChange={(e) => setMeetingPreference(e.target.value)}
                />
              </div>
            </div>

            <div className="field-group" style={{ marginTop: "16px" }}>
              <label htmlFor="req-special">Accessibility or Special Requirements (Optional)</label>
              <input
                id="req-special"
                type="text"
                placeholder="e.g. Wheelchair accessible, child-friendly, gluten-free tastings only"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
              />
            </div>
          </div>

          <div className="form-submit-row">
            <button
              type="submit"
              className="btn primary btn-large"
              disabled={busy}
            >
              {busy ? "Submitting Request…" : "Submit Request & Receive Quotes"}
              <ArrowRight size={18} />
            </button>
            <p className="submit-disclaimer">
              Free to submit. Zero payment is taken until you review quotes and accept your chosen Local Partner.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RequestALocalPage() {
  return (
    <Suspense fallback={<div className="loading-state">Loading request form…</div>}>
      <RequestALocalForm />
    </Suspense>
  );
}
