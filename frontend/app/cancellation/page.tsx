import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cancellation Policy | HireALocals",
  description:
    "Review HireALocals cancellation rules for travelers and local hosts, including paid booking procedures and schedule adjustments.",
  alternates: {
    canonical: "/cancellation",
  },
};

export default function CancellationPage() {
  return (
    <section className="section">
      <div className="container legal">
        <span className="eyebrow">Booking Terms</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 20 }}>
          Cancellation Policy
        </h1>

        <div className="notice" style={{ marginBottom: 28 }}>
          HireALocals prioritizes mutual respect between travelers and local hosts.
          Hosts block dedicated personal time for confirmed experiences.
        </div>

        <h2>1. Cancellation Before Payment (Unpaid Bookings)</h2>
        <p>
          When a booking request is submitted, it begins in <code>pending</code> status while
          the local host evaluates their schedule. No payment is collected during this stage.
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Instant Self-Service Cancellation:</strong> Travelers may cancel any unpaid
            booking (whether <code>pending</code> or newly <code>confirmed</code>) at any time
            directly from their booking dashboard (<Link href="/dashboard/bookings">My Bookings</Link>)
            by clicking &quot;Cancel booking&quot;.
          </li>
          <li>
            <strong>Zero Fees:</strong> Unpaid cancellations incur no platform fee or cancellation
            charge.
          </li>
        </ul>

        <h2>2. Cancellation of Paid &amp; Confirmed Bookings</h2>
        <p>
          Once a local host has confirmed a booking and the traveler has completed secure checkout
          via Safepay, the booking enters <code>paid</code> status, and the host reserves that
          specific date and time window exclusively for the traveler.
        </p>
        <p>
          To ensure platform booking records, host compensation, and payment gateway transactions
          remain accurately synchronized:
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Coordinated Cancellation:</strong> Paid bookings cannot be cancelled by
            unilateral automated click. Travelers must contact{" "}
            <Link href="/contact">HireALocals Support</Link> or email{" "}
            <a href="mailto:support@hirealocals.com">support@hirealocals.com</a> with the booking
            reference number.
          </li>
          <li>
            <strong>Advance Notice Guidance:</strong> As an operational courtesy, travelers are
            encouraged to provide as much advance notice as possible (ideally 24 to 48 hours prior
            to the scheduled start time where practical) if their itinerary changes. This is an
            operational recommendation to allow the host an opportunity to adjust their calendar,
            not a mandatory cancellation condition or automatic refund eligibility rule.
          </li>
          <li>
            <strong>Refund Evaluation:</strong> When a paid cancellation is requested, our support
            team liaises between the traveler and host. If the cancellation is approved, a refund
            is issued to the original payment card in accordance with our{" "}
            <Link href="/refund">Refund Policy</Link>.
          </li>
        </ul>

        <h2>3. Host / Local Initiated Cancellation</h2>
        <p>
          We expect our verified hosts to honor all confirmed bookings. However, unforeseen
          emergencies or safety hazards (such as severe weather disruptions or illness) may
          occasionally require a host to cancel.
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Prompt Traveler Notification:</strong> If a host must cancel, they are
            expected to notify the traveler and platform support promptly.
          </li>
          <li>
            <strong>Full 100% Refund:</strong> If a host cancels a confirmed, paid booking or fails to
            provide the booked experience, the traveler is entitled to a 100% refund of all amounts paid
            (including service price and HireALocals 12% platform fee). Refunds are submitted promptly
            to the payment processor; posting times to your account depend on payment provider and banking
            processing cycles (see our <Link href="/refund">Refund Policy</Link>).
          </li>
          <li>
            <strong>Free Reschedule Option:</strong> Where practical and mutually agreed between traveler
            and host, a free reschedule to an alternative date or time may be offered instead of a cancellation.
            A reschedule is an optional coordination arrangement and not an automatic entitlement, guaranteed
            software feature, or host availability guarantee.
          </li>
        </ul>

        <h2>4. Schedule Modifications &amp; Meeting Adjustments</h2>
        <p>
          When plans shift slightly, full cancellation may not be necessary:
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Meeting Point Coordination:</strong> Travelers can update their meeting point,
            pickup address, or special instructions on the booking details page or via messaging prior to the trip.
          </li>
          <li>
            <strong>Same-Day Timing Adjustments:</strong> Adjustments to meeting times or locations
            on the day of the trip can be coordinated directly between traveler and host via our secure in-app
            messaging system (<Link href="/dashboard/messages">Messages</Link>) where both parties mutually
            agree. Same-day coordination is an available option subject to host availability and does
            not constitute an unconditional refund or cancellation guarantee.
          </li>
        </ul>

        <h2>5. Weather &amp; Unforeseen Circumstances</h2>
        <p>
          Walking tours and outdoor food experiences often continue in mild rain or seasonal
          weather. In the event of severe weather warnings or official local travel restrictions,
          travelers and hosts are encouraged to reschedule. If rescheduling is impossible,
          platform support will assist in processing a fair resolution or full refund.
        </p>

        <h2>6. How to Submit a Cancellation Request</h2>
        <p>
          If you need to cancel a paid booking, please reach out to our support team as soon as
          possible:
        </p>
        <p>
          <strong>HireALocals Support</strong>
          <br />
          Email: <a href="mailto:support@hirealocals.com">support@hirealocals.com</a>
          <br />
          Online Request: <Link href="/contact">hirealocals.com/contact</Link>
          <br />
          Please state your <code>Booking #{'{id}'}</code> and the reason for cancellation.
        </p>
      </div>
    </section>
  );
}
