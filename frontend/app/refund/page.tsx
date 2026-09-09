import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy | HireALocals",
  description:
    "Learn about HireALocals refund eligibility, cancellation coordination, secure payment protection, and resolution procedures.",
  alternates: {
    canonical: "/refund",
  },
};

export default function RefundPage() {
  return (
    <section className="section">
      <div className="container legal">
        <span className="eyebrow">Customer Protection</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 20 }}>
          Refund Policy
        </h1>

        <div className="notice" style={{ marginBottom: 28 }}>
          HireALocals operates a verified host marketplace. Online booking payments
          are processed securely through Safepay, and local host payouts are eligible
          only after the booked experience has been completed.
        </div>

        <h2>1. Overview &amp; Payment Protection</h2>
        <p>
          HireALocals connects travelers with independent local hosts for private
          guided experiences. To protect both travelers and local hosts, when online
          payment is completed through our authorized payment processor (Safepay),
          payments are processed securely. Local host payout occurs only after the
          booked experience has been completed and the booking and settlement are eligible
          for payout under HireALocals operations.
        </p>

        <h2>2. Refund Eligibility</h2>
        <p>A traveler may be eligible for a refund under the following circumstances:</p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Host Cancellation or Non-Attendance:</strong> If a confirmed Local host cancels
            the booking prior to the scheduled start time or fails to provide the booked experience
            at the designated meeting point without prior mutual agreement, the traveler is entitled
            to a 100% refund of all amounts paid (including service price and HireALocals 12% platform fee).
            Where practical and mutually agreed between traveler and host, a free reschedule option
            may also be coordinated instead of a refund.
          </li>
          <li>
            <strong>Pending or Declined Booking Requests:</strong> When a traveler sends a booking
            request, no payment is processed until the local host explicitly reviews and confirms
            the booking. If a request is declined, cancelled before confirmation, or expires without
            host response, no charge is levied.
          </li>
          <li>
            <strong>Unpaid Booking Cancellation:</strong> Any booking that has not yet been paid
            can be cancelled at any time by the traveler directly from the booking dashboard without
            any cancellation charge or refund required.
          </li>
          <li>
            <strong>Mutual Cancellation Coordination:</strong> If the traveler and host mutually agree
            in writing (via in-app messages) to cancel a paid booking before the experience commences,
            the cancellation must be submitted to HireALocals Support for coordination. The refundable
            amount is reviewed and determined for that specific case, and any approved refund is then
            processed through the approved Safepay refund workflow.
          </li>
        </ul>

        <h2>3. Cancellation and Refund Coordination</h2>
        <p>
          Because local hosts allocate their personal time and decline other traveler inquiries
          once a booking is confirmed and paid, paid bookings cannot be cancelled via silent
          one-click self-service. All cancellations of paid bookings must be submitted through
          HireALocals Support (<Link href="/contact">Contact &amp; Support</Link> or email{" "}
          <a href="mailto:support@hirealocals.com">support@hirealocals.com</a>) with the booking
          reference number. This ensures that:
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>The local host is promptly notified so they can unblock their schedule.</li>
          <li>Platform booking ledgers and payment records remain strictly synchronized.</li>
          <li>Refunds are initiated through the official payment processor merchant channel.</li>
        </ul>
        <p>
          Please review our complete <Link href="/cancellation">Cancellation Policy</Link> for
          additional details on notice periods and host communications.
        </p>

        <h2>4. Payment Processing &amp; Refund Method</h2>
        <p>
          All approved refunds are credited back directly to the original payment method utilized
          during checkout (via Safepay). For security and anti-fraud compliance, HireALocals does
          not issue cash refunds or redirect refunds to alternative third-party cards or accounts.
        </p>

        <h2>5. Refund Posting Time</h2>
        <p>
          Once an approved refund is submitted through Safepay, the time for the funds to
          appear in the traveler&apos;s account depends on the payment method, card issuer,
          bank, and applicable payment-network processing times. HireALocals does not promise
          a fixed number of days or guaranteed posting schedule.
        </p>

        <h2>6. Service Issues &amp; Dispute Resolution</h2>
        <p>
          If a traveler encounters a substantial issue during an experience (such as material
          deviation from the confirmed itinerary, safety concerns, or unprofessional conduct),
          travelers are encouraged to notify HireALocals Support within 48 hours of the scheduled
          completion time. Reporting an issue within 48 hours helps HireALocals investigate and
          resolve the matter promptly while communication records and availability details are fresh.
          This 48-hour window serves as recommended guidance to enable timely investigation, rather
          than an automatic forfeiture of customer rights. Our support team will review the timeline,
          messaging history, and host feedback to reach a fair and objective resolution.
        </p>

        <h2>7. Exclusions</h2>
        <p>
          Refunds will not be issued for:
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>Experiences successfully completed where no material issue was reported.</li>
          <li>Traveler failure to arrive at the agreed meeting point without notifying the host.</li>
          <li>Circumstances outside the control of the host (such as personal travel delays or weather conditions, unless mutually agreed to reschedule).</li>
        </ul>

        <h2>8. Contacting Support for a Refund</h2>
        <p>
          To request assistance or inquire about an existing refund, please contact:
        </p>
        <p>
          <strong>HireALocals Support</strong>
          <br />
          Email: <a href="mailto:support@hirealocals.com">support@hirealocals.com</a>
          <br />
          Contact Form: <Link href="/contact">hirealocals.com/contact</Link>
          <br />
          Include your Booking Reference ID (e.g. <code>Booking #123</code>) in all correspondence.
        </p>
      </div>
    </section>
  );
}

