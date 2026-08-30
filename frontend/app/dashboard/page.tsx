"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { authedFetch } from "@/lib/api";

type Profile = {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  home_city: string;
  bio: string;
  image_url: string;
};

type Payment = {
  status: string;
  required: boolean;
};

type Booking = {
  id: number;
  booking_date: string;
  start_time: string;
  hours: number;
  total: number;
  status: string;
  local_name: string;
  local_slug: string;
  local_city: string;
  local_image: string;
  service_title: string;
  message_count: number;
  payment: Payment;
};

type SavedRow = {
  favorite_id: number;
  profile: {
    id: number;
    slug: string;
    display_name: string;
    city_name: string;
    image_url: string;
    hourly_rate: number;
  };
};

type Review = {
  id: number;
};

function displayDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState("Loading your travel overview…");

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const [profileResponse, bookingsResponse, savedResponse, reviewsResponse] =
          await Promise.all([
            authedFetch("/api/traveler/profile"),
            authedFetch("/api/traveler/bookings"),
            authedFetch("/api/traveler/saved"),
            authedFetch("/api/traveler/reviews"),
          ]);

        if (
          !profileResponse.ok ||
          !bookingsResponse.ok ||
          !savedResponse.ok ||
          !reviewsResponse.ok
        ) {
          throw new Error("Could not load your complete traveler overview.");
        }

        const [profileData, bookingData, savedData, reviewData] =
          await Promise.all([
            profileResponse.json(),
            bookingsResponse.json(),
            savedResponse.json(),
            reviewsResponse.json(),
          ]);

        if (!live) return;

        setProfile(profileData);
        setBookings(bookingData);
        setSaved(savedData);
        setReviews(reviewData);
        setStatus("");
      } catch (error: any) {
        if (live) {
          setStatus(
            error?.message || "Could not load your traveler overview."
          );
        }
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  const openBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        ["pending", "confirmed"].includes(booking.status)
      ),
    [bookings]
  );

  const pendingCount = bookings.filter(
    (booking) => booking.status === "pending"
  ).length;

  const upcoming = openBookings.slice(0, 3);

  const profileScore = profile
    ? [
        profile.full_name,
        profile.phone,
        profile.country,
        profile.home_city,
        profile.bio,
        profile.image_url,
      ].filter((value) => String(value || "").trim()).length
    : 0;

  const profilePercent = Math.round((profileScore / 6) * 100);

  return (
    <>
      <div className="workspace-page-head">

        <div>
          <span className="eyebrow">Traveler overview</span>
          <h1>
            {profile?.full_name
              ? `Welcome back, ${profile.full_name.split(" ")[0]}.`
              : "Welcome back."}
          </h1>
          <p>
            Keep your bookings, conversations and favourite locals together
            while you plan your next experience.
          </p>
        </div>

        <Link href="/explore" className="btn">
          <Search size={17} />
          Find a Local
        </Link>

      </div>

      {status ? <div className="notice">{status}</div> : null}

      <section className="workspace-kpi-grid">

        <Link href="/dashboard/bookings" className="workspace-kpi-card">
          <div className="workspace-kpi-icon">
            <CalendarDays size={20} />
          </div>
          <span>Open bookings</span>
          <strong>{openBookings.length}</strong>
          <small>{pendingCount} awaiting confirmation</small>
        </Link>

        <Link href="/dashboard/saved" className="workspace-kpi-card">
          <div className="workspace-kpi-icon">
            <Heart size={20} />
          </div>
          <span>Saved locals</span>
          <strong>{saved.length}</strong>
          <small>Your current shortlist</small>
        </Link>

        <Link href="/dashboard/reviews" className="workspace-kpi-card">
          <div className="workspace-kpi-icon">
            <Star size={20} />
          </div>
          <span>Reviews</span>
          <strong>{reviews.length}</strong>
          <small>Published experiences</small>
        </Link>

        <Link href="/dashboard/profile" className="workspace-kpi-card">
          <div className="workspace-kpi-icon">
            <UserRound size={20} />
          </div>
          <span>Profile</span>
          <strong>{profilePercent}%</strong>
          <small>Profile completeness</small>
        </Link>

      </section>

      <div className="workspace-overview-grid">

        <section className="workspace-panel">

          <div className="workspace-panel-head">
            <div>
              <span className="eyebrow">Your trips</span>
              <h2>Upcoming & pending</h2>
            </div>

            <Link href="/dashboard/bookings">
              View all
              <ArrowRight size={15} />
            </Link>
          </div>

          {upcoming.length ? (
            <div className="workspace-trip-list">
              {upcoming.map((booking) => (
                <article className="workspace-trip-card" key={booking.id}>

                  <img
                    src={booking.local_image}
                    alt={booking.local_name}
                  />

                  <div className="workspace-trip-main">
                    <div className="status-stack">
                      <span className={`badge status-${booking.status}`}>
                        {booking.status}
                      </span>

                      {booking.payment?.status ? (
                        <span
                          className={`badge payment-${booking.payment.status}`}
                        >
                          {booking.payment.status.replaceAll("_", " ")}
                        </span>
                      ) : null}
                    </div>

                    <h3>{booking.service_title}</h3>

                    <p>
                      <MapPin size={14} />
                      {booking.local_name} · {booking.local_city}
                    </p>

                    <small>
                      {displayDate(booking.booking_date)}
                      {" · "}
                      {booking.start_time}
                      {" · "}
                      {booking.hours} hr
                    </small>
                  </div>

                  <div className="workspace-trip-side">
                    <strong>${booking.total.toFixed(2)}</strong>

                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="mini-btn"
                    >
                      View
                    </Link>
                  </div>

                </article>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <CalendarDays size={28} />
              <h3>No active trips yet</h3>
              <p>
                Browse locals and send your first private booking request.
              </p>
              <Link href="/explore" className="btn">
                Explore locals
              </Link>
            </div>
          )}

        </section>

        <aside className="workspace-side-stack">

          <section className="workspace-panel">

            <div className="workspace-panel-head compact">
              <div>
                <span className="eyebrow">Quick actions</span>
                <h2>Plan faster</h2>
              </div>
            </div>

            <div className="workspace-action-list">

              <Link href="/explore">
                <Search size={19} />
                <div>
                  <strong>Find a Local</strong>
                  <span>Search by city and experience</span>
                </div>
                <ArrowRight size={16} />
              </Link>

              <Link href="/dashboard/messages">
                <MessageCircle size={19} />
                <div>
                  <strong>Messages</strong>
                  <span>Continue booking conversations</span>
                </div>
                <ArrowRight size={16} />
              </Link>

              <Link href="/dashboard/saved">
                <Heart size={19} />
                <div>
                  <strong>Saved locals</strong>
                  <span>Return to your shortlist</span>
                </div>
                <ArrowRight size={16} />
              </Link>

            </div>

          </section>

          <section className="workspace-panel workspace-profile-health">

            <div>
              <span className="eyebrow">Account readiness</span>
              <h2>Traveler profile</h2>
            </div>

            <div className="workspace-progress">
              <span style={{ width: `${profilePercent}%` }} />
            </div>

            <div className="workspace-progress-copy">
              <strong>{profilePercent}% complete</strong>
              <span>
                A complete profile helps booking communication stay clear.
              </span>
            </div>

            <Link
              href="/dashboard/profile"
              className="btn secondary"
            >
              Update profile
            </Link>

          </section>

        </aside>

      </div>
    </>
  );
}
