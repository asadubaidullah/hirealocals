"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authedFetch } from "@/lib/api";


type Profile = {
  slug: string;
  display_name: string;
  headline: string;
  city_name: string;
  languages: string;
  hourly_rate: number;
  image_url: string;
  verified: boolean;
};


type UploadItem = {
  id: number;
  kind: string;
  original_name: string;
  status: string;
  created_at: string;
};


type Booking = {
  id: number;
  booking_date: string;
  start_time: string;
  tourist_name: string;
  service_title: string;
  subtotal: number;
  platform_fee: number;
  status: string;
  message_count: number;
};


type Earnings = {
  completed_earnings: number;
  confirmed_value: number;
  pending_value: number;
  completed_count: number;
  confirmed_count: number;
  pending_count: number;
  platform_fees_paid_by_travelers: number;
  payment_currency: string;
};


function money(
  currency: string,
  amount: number | undefined
) {

  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}


function prettyStatus(value: string) {

  return String(value || "")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );
}


export default function Page() {

  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(null);


  const [
    bookings,
    setBookings,
  ] = useState<Booking[]>([]);


  const [
    earnings,
    setEarnings,
  ] = useState<Earnings | null>(null);


  const [
    uploads,
    setUploads,
  ] = useState<UploadItem[]>([]);


  const [
    status,
    setStatus,
  ] = useState("Loading dashboard...");


  const [
    uploadingKyc,
    setUploadingKyc,
  ] = useState(false);


  async function load() {

    try {

      const [
        profileResponse,
        bookingsResponse,
        earningsResponse,
        uploadsResponse,
      ] = await Promise.all([
        authedFetch("/api/local/profile"),
        authedFetch("/api/local/bookings"),
        authedFetch("/api/local/earnings"),
        authedFetch("/api/local/uploads"),
      ]);


      const profileData =
        await profileResponse
          .json()
          .catch(() => ({}));


      const bookingsData =
        await bookingsResponse
          .json()
          .catch(() => []);


      const earningsData =
        await earningsResponse
          .json()
          .catch(() => ({}));


      const uploadsData =
        await uploadsResponse
          .json()
          .catch(() => []);


      if (!profileResponse.ok) {

        throw new Error(
          profileData.detail ||
          "Could not load profile."
        );
      }


      if (!bookingsResponse.ok) {

        throw new Error(
          "Could not load orders."
        );
      }


      if (!earningsResponse.ok) {

        throw new Error(
          earningsData.detail ||
          "Could not load earnings."
        );
      }


      setProfile(
        profileData.profile ||
        profileData
      );


      setBookings(
        Array.isArray(bookingsData)
          ? bookingsData
          : []
      );


      setEarnings(
        earningsData
      );


      if (
        uploadsResponse.ok &&
        Array.isArray(uploadsData)
      ) {

        setUploads(
          uploadsData
        );
      }


      setStatus("");

    }
    catch (error: any) {

      setStatus(
        error?.message ||
        "Could not load dashboard."
      );
    }
  }


  useEffect(() => {

    load();

  }, []);


  const currency =
    String(
      earnings?.payment_currency ||
      "USD"
    ).toUpperCase();


  const pending =
    useMemo(
      () =>
        bookings.filter(
          booking =>
            booking.status === "pending"
        ),
      [bookings]
    );


  const confirmed =
    useMemo(
      () =>
        bookings.filter(
          booking =>
            booking.status === "confirmed"
        ),
      [bookings]
    );


  const completed =
    useMemo(
      () =>
        bookings.filter(
          booking =>
            booking.status === "completed"
        ),
      [bookings]
    );


  const closed =
    useMemo(
      () =>
        bookings.filter(
          booking =>
            [
              "cancelled",
              "rejected",
            ].includes(
              booking.status
            )
        ),
      [bookings]
    );


  const totalBookingValue =
    useMemo(
      () =>
        bookings
          .filter(
            booking =>
              [
                "pending",
                "confirmed",
                "completed",
              ].includes(
                booking.status
              )
          )
          .reduce(
            (
              sum,
              booking
            ) =>
              sum +
              Number(
                booking.subtotal ||
                0
              ),
            0
          ),
      [bookings]
    );


  const kycDocuments =
    useMemo(
      () =>
        uploads
          .filter(
            item =>
              item.kind ===
              "verification_document"
          )
          .slice()
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.created_at
              ).getTime()
              -
              new Date(
                first.created_at
              ).getTime()
          ),
      [uploads]
    );


  const latestKyc =
    kycDocuments[0];


  const kycState =
    profile?.verified
      ? "verified"

      : latestKyc?.status === "pending"
        ? "pending"

        : latestKyc?.status === "rejected"
          ? "rejected"

          : "required";


  const kycLabel =
    kycState === "verified"
      ? "Verified Local"

      : kycState === "pending"
        ? "Under review"

        : kycState === "rejected"
          ? "Resubmit KYC"

          : "KYC required";


  const recentBookings =
    bookings.slice(
      0,
      5
    );


  async function uploadKyc(
    event:
      ChangeEvent<HTMLInputElement>
  ) {

    const input =
      event.currentTarget;


    const file =
      input.files?.[0];


    if (!file) {
      return;
    }


    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      setStatus(
        "KYC document must be PDF, JPG, PNG or WebP."
      );

      input.value = "";

      return;
    }


    if (
      file.size >
      10 * 1024 * 1024
    ) {

      setStatus(
        "KYC document cannot exceed 10 MB."
      );

      input.value = "";

      return;
    }


    setUploadingKyc(true);

    setStatus(
      "Uploading identity document..."
    );


    try {

      const form =
        new FormData();


      form.append(
        "file",
        file
      );


      const response =
        await authedFetch(
          "/api/local/verification-document",
          {
            method: "POST",
            body: form,
          }
        );


      const data =
        await response
          .json()
          .catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "KYC upload failed."
        );
      }


      await load();


      setStatus(
        "KYC submitted successfully. Your verification remains under review until admin approval."
      );

    }
    catch (error: any) {

      setStatus(
        error?.message ||
        "KYC upload failed."
      );
    }
    finally {

      input.value = "";

      setUploadingKyc(false);
    }
  }


  return (

    <div className="local-overview-pro">


      <header className="local-overview-head">

        <div>

          <span className="eyebrow">
            Local workspace
          </span>


          <div className="local-overview-title">

            <h1>
              Overview
            </h1>


            {profile?.verified && (

              <span className="local-verified-edge">
                ✓ Verified Local
              </span>

            )}

          </div>


          <p>
            Orders, earnings,
            commission and account
            verification at a glance.
          </p>

        </div>


        <div className="local-overview-actions">

          <Link
            href="/local-dashboard/bookings"
          >
            View orders
          </Link>


          <Link
            className="primary"
            href="/local-dashboard/availability"
          >
            Availability
          </Link>

        </div>

      </header>


      {!profile?.verified && (

        <section
          className={
            `local-overview-kyc-alert ${kycState}`
          }
        >

          <span className="kyc-alert-icon">
            !
          </span>


          <div>

            <strong>
              {kycLabel}
            </strong>


            <p>

              {kycState === "pending"
                ? "Your identity document is under review. Booking access remains restricted until approval."

                : kycState === "rejected"
                  ? "Your previous identity document was not approved. Please submit a valid document again."

                  : "KYC is required before your Local profile can receive traveler bookings."
              }

            </p>

          </div>


          <Link
            href="/local-dashboard/profile"
          >
            Manage KYC
          </Link>

        </section>

      )}


      {status && (

        <div className="local-overview-status">
          {status}
        </div>

      )}


      <section className="local-overview-kpis">


        <article>

          <span>
            Total orders
          </span>

          <strong>
            {bookings.length}
          </strong>

          <small>
            {
              pending.length +
              confirmed.length
            } active
          </small>

        </article>


        <article>

          <span>
            Completed earnings
          </span>

          <strong>
            {
              money(
                currency,
                earnings
                  ?.completed_earnings
              )
            }
          </strong>

          <small>
            {completed.length}
            {" "}completed
          </small>

        </article>


        <article>

          <span>
            Upcoming value
          </span>

          <strong>
            {
              money(
                currency,
                earnings
                  ?.confirmed_value
              )
            }
          </strong>

          <small>
            {confirmed.length}
            {" "}confirmed
          </small>

        </article>


        <article>

          <span>
            Marketplace fees
          </span>

          <strong>
            {
              money(
                currency,
                earnings
                  ?.platform_fees_paid_by_travelers
              )
            }
          </strong>

          <small>
            Platform commission
          </small>

        </article>


      </section>


      <div className="local-overview-grid">


        <main>


          <section className="local-pro-card">

            <div className="local-pro-card-head">

              <div>

                <span>
                  ORDERS
                </span>

                <h2>
                  Order summary
                </h2>

              </div>


              <Link
                href="/local-dashboard/bookings"
              >
                View all
              </Link>

            </div>


            <div className="local-order-summary">


              <div>
                <i className="pending"/>
                <strong>{pending.length}</strong>
                <span>Pending</span>
              </div>


              <div>
                <i className="confirmed"/>
                <strong>{confirmed.length}</strong>
                <span>Confirmed</span>
              </div>


              <div>
                <i className="completed"/>
                <strong>{completed.length}</strong>
                <span>Completed</span>
              </div>


              <div>
                <i className="closed"/>
                <strong>{closed.length}</strong>
                <span>Closed</span>
              </div>


            </div>


            <div className="local-total-value">

              <span>
                Total booking value
              </span>

              <strong>
                {
                  money(
                    currency,
                    totalBookingValue
                  )
                }
              </strong>

            </div>

          </section>


          <section className="local-pro-card">

            <div className="local-pro-card-head">

              <div>

                <span>
                  RECENT
                </span>

                <h2>
                  Latest orders
                </h2>

              </div>


              <Link
                href="/local-dashboard/bookings"
              >
                All orders
              </Link>

            </div>


            {recentBookings.length ? (

              <div className="local-recent-orders">

                {
                  recentBookings.map(
                    booking => (

                      <Link
                        key={booking.id}
                        href="/local-dashboard/bookings"
                        className="local-recent-order"
                      >

                        <div className="recent-order-avatar">

                          {
                            String(
                              booking
                                .tourist_name ||
                              "T"
                            )
                              .charAt(0)
                              .toUpperCase()
                          }

                        </div>


                        <div className="recent-order-person">

                          <strong>
                            {
                              booking
                                .tourist_name ||
                              "Traveler"
                            }
                          </strong>

                          <span>
                            {
                              booking
                                .service_title
                            }
                          </span>

                        </div>


                        <span
                          className={
                            `recent-order-status ${booking.status}`
                          }
                        >
                          {
                            prettyStatus(
                              booking.status
                            )
                          }
                        </span>


                        <strong className="recent-order-price">

                          {
                            money(
                              currency,
                              booking.subtotal
                            )
                          }

                        </strong>

                      </Link>

                    )
                  )
                }

              </div>

            ) : (

              <div className="local-dashboard-empty">
                No orders yet.
              </div>

            )}

          </section>


        </main>


        <aside>


          <section className="local-pro-card local-dashboard-kyc">


            <div className="local-pro-card-head">

              <div>

                <span>
                  TRUST & SAFETY
                </span>

                <h2>
                  Identity verification
                </h2>

              </div>


              <small
                className={
                  `dashboard-kyc-badge ${kycState}`
                }
              >
                {kycLabel}
              </small>

            </div>


            {profile?.verified ? (

              <div className="dashboard-verified-box">

                <b>
                  ✓
                </b>

                <div>

                  <strong>
                    Identity approved
                  </strong>

                  <p>
                    Your account now
                    carries the Verified
                    Local badge.
                  </p>

                </div>

              </div>

            ) : (

              <>

                <p className="dashboard-kyc-copy">
                  Upload a government-issued
                  identity document. Your
                  document stays private and
                  is reviewed only by
                  authorized administrators.
                </p>


                <label className="dashboard-kyc-upload">

                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={uploadingKyc}
                    onChange={uploadKyc}
                  />


                  {
                    uploadingKyc
                      ? "Uploading..."
                      : latestKyc
                        ? "Submit new document"
                        : "Upload identity document"
                  }

                </label>


                <small className="dashboard-kyc-help">
                  PDF, JPG, PNG or WebP
                  {" · "}
                  Max 10 MB
                </small>


                {latestKyc && (

                  <div className="dashboard-latest-kyc">

                    <div>

                      <span>
                        Latest submission
                      </span>

                      <strong>
                        {
                          latestKyc
                            .original_name
                        }
                      </strong>

                    </div>


                    <small
                      className={
                        `kyc-doc-status ${latestKyc.status}`
                      }
                    >
                      {
                        prettyStatus(
                          latestKyc.status
                        )
                      }
                    </small>

                  </div>

                )}

              </>

            )}


            <Link
              className="dashboard-text-link"
              href="/local-dashboard/profile"
            >
              Profile & KYC settings →
            </Link>

          </section>


          <section className="local-pro-card">

            <div className="local-pro-card-head">

              <div>

                <span>
                  FINANCE
                </span>

                <h2>
                  Earnings snapshot
                </h2>

              </div>

            </div>


            <div className="dashboard-finance-lines">


              <div>

                <span>
                  Earnings
                </span>

                <strong>
                  {
                    money(
                      currency,
                      earnings
                        ?.completed_earnings
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Upcoming
                </span>

                <strong>
                  {
                    money(
                      currency,
                      earnings
                        ?.confirmed_value
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Pending
                </span>

                <strong>
                  {
                    money(
                      currency,
                      earnings
                        ?.pending_value
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Commission
                </span>

                <strong>
                  {
                    money(
                      currency,
                      earnings
                        ?.platform_fees_paid_by_travelers
                    )
                  }
                </strong>

              </div>


            </div>


            <Link
              className="dashboard-text-link"
              href="/local-dashboard/earnings"
            >
              View earnings →
            </Link>

          </section>


          <section className="local-pro-card">

            <div className="local-pro-card-head">

              <div>

                <span>
                  QUICK ACCESS
                </span>

                <h2>
                  Manage business
                </h2>

              </div>

            </div>


            <div className="dashboard-quick-links">

              <Link href="/local-dashboard/bookings">
                Orders
              </Link>

              <Link href="/local-dashboard/messages">
                Messages
              </Link>

              <Link href="/local-dashboard/services">
                Services
              </Link>

              <Link href="/local-dashboard/profile">
                Profile & KYC
              </Link>

            </div>

          </section>


        </aside>


      </div>


    </div>

  );
}