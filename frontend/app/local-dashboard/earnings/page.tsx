"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  authedFetch,
} from "@/lib/api";


type Earnings = {
  completed_earnings: number;
  confirmed_value: number;
  pending_value: number;

  completed_count: number;
  confirmed_count: number;
  pending_count: number;

  platform_fees_paid_by_travelers: number;

  payment_mode: string;
  payment_currency: string;
};


export default function Page() {

  const [
    earnings,
    setEarnings,
  ] = useState<Earnings | null>(
    null
  );


  const [
    status,
    setStatus,
  ] = useState(
    "Loading earnings..."
  );


  useEffect(() => {

    (async () => {

      const response =
        await authedFetch(
          "/api/local/earnings"
        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (!response.ok) {

        setStatus(
          data.detail ||
          "Could not load earnings."
        );

        return;
      }


      setEarnings(data);

      setStatus("");

    })();

  }, []);


  const currency =
    String(
      earnings?.payment_currency ||
      "USD"
    ).toUpperCase();


  const rawMode =
    String(
      earnings?.payment_mode ||
      "manual"
    );


  const paymentMode =
    rawMode
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );


  const sandbox =
    rawMode
      .toLowerCase()
      .includes("sandbox");


  function money(
    value:number | undefined
  ) {

    return (
      `${currency} ${
        Number(
          value || 0
        ).toFixed(2)
      }`
    );
  }


  return (

    <div className="earnings-pro-page">


      <header className="earnings-pro-head">

        <div>

          <span className="eyebrow">
            Local workspace
          </span>

          <h1>
            Earnings
          </h1>

          <p>
            Track booking value,
            completed earnings and
            payment settlements.
          </p>

        </div>


        <div
          className={
            `earnings-payment-status ${
              sandbox
                ? "sandbox"
                : "live"
            }`
          }
        >

          <span
            aria-hidden="true"
          />

          <div>

            <small>
              Payment gateway
            </small>

            <strong>
              Safepay
            </strong>

          </div>

        </div>

      </header>


      {status && (

        <div className="notice earnings-load-status">
          {status}
        </div>

      )}


      <section
        className="earnings-pro-stats"
        aria-label="Earnings summary"
      >


        <article className="earnings-stat-card primary">

          <span className="earnings-stat-label">
            Completed earnings
          </span>

          <strong>
            {money(
              earnings
                ?.completed_earnings
            )}
          </strong>

          <small>
            From completed bookings
          </small>

        </article>


        <article className="earnings-stat-card">

          <span className="earnings-stat-label">
            Upcoming value
          </span>

          <strong>
            {money(
              earnings
                ?.confirmed_value
            )}
          </strong>

          <small>
            Confirmed bookings
          </small>

        </article>


        <article className="earnings-stat-card">

          <span className="earnings-stat-label">
            Pending value
          </span>

          <strong>
            {money(
              earnings
                ?.pending_value
            )}
          </strong>

          <small>
            Awaiting confirmation
          </small>

        </article>


        <article className="earnings-stat-card">

          <span className="earnings-stat-label">
            Completed
          </span>

          <strong>
            {
              earnings
                ?.completed_count ||
              0
            }
          </strong>

          <small>
            Total bookings
          </small>

        </article>


      </section>


      <div className="earnings-pro-grid">


        <section className="earnings-pro-card">

          <div className="earnings-card-head">

            <div>

              <span className="eyebrow">
                Payments
              </span>

              <h2>
                Payment & settlement
              </h2>

            </div>


            <span
              className={
                `earnings-env-badge ${
                  sandbox
                    ? "sandbox"
                    : "live"
                }`
              }
            >
              {
                sandbox
                  ? "Sandbox"
                  : "Live"
              }
            </span>

          </div>


          <div className="earnings-payment-facts">


            <div>

              <span>
                Gateway
              </span>

              <strong>
                Safepay
              </strong>

            </div>


            <div>

              <span>
                Mode
              </span>

              <strong>
                {paymentMode}
              </strong>

            </div>


            <div>

              <span>
                Currency
              </span>

              <strong>
                {currency}
              </strong>

            </div>


            <div>

              <span>
                Confirmed bookings
              </span>

              <strong>
                {
                  earnings
                    ?.confirmed_count ||
                  0
                }
              </strong>

            </div>


          </div>


          <div className="earnings-security-note">

            <span
              className="earnings-security-icon"
              aria-hidden="true"
            >
              ✓
            </span>


            <div>

              <strong>
                Secure payment tracking
              </strong>

              <p>
                HireALocals records
                verified Safepay payment
                and settlement status
                against each booking.
              </p>

            </div>

          </div>


        </section>


        <section className="earnings-pro-card earnings-summary-card">

          <div className="earnings-card-head">

            <div>

              <span className="eyebrow">
                Summary
              </span>

              <h2>
                Marketplace activity
              </h2>

            </div>

          </div>


          <div className="earnings-summary-list">


            <div>

              <span>
                Completed bookings
              </span>

              <strong>
                {
                  earnings
                    ?.completed_count ||
                  0
                }
              </strong>

            </div>


            <div>

              <span>
                Confirmed upcoming
              </span>

              <strong>
                {
                  earnings
                    ?.confirmed_count ||
                  0
                }
              </strong>

            </div>


            <div>

              <span>
                Pending bookings
              </span>

              <strong>
                {
                  earnings
                    ?.pending_count ||
                  0
                }
              </strong>

            </div>


            <div>

              <span>
                Traveler platform fees
              </span>

              <strong>
                {money(
                  earnings
                    ?.platform_fees_paid_by_travelers
                )}
              </strong>

            </div>


          </div>

        </section>


      </div>


      <p className="earnings-footnote">
        Earnings shown here are based on
        the current verified booking and
        payment records.
      </p>


    </div>

  );
}