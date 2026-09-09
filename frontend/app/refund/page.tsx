import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy | HireALocals",
  description:
    "Learn about HireALocals refund eligibility, cancellation coordination, escrow payment protection, and resolution procedures.",
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
          are held securely in escrow until the scheduled experience is delivered.
        </div>

        <h2>1. Overview & Escrow Protection</h2>
        <p>
          HireALocals connects travelers with independent local hosts for private
          guided experiences. To protect both travelers and local hosts, when online
          payment is completed through our authorized payment processor (Safepay),
          funds are held securely in platform escrow. Local host payouts remain
          held until the booking has concluded and service delivery is confirmed.
        </p>

        <h2>2. Refund Eligibility</h2>
        <p>A traveler may be eligible for a refund under the following circumstances:</p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Host Cancellation or Non-Attendance:</strong> If a confirmed Local host cancels
            the booking prior to the scheduled start time or fails to appear at the designated
            meeting point without prior mutual agreement, the traveler is entitled to a full (100%)
            refund of all amounts paid.
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
            <strong>Mutual Cancellation Agreement:</strong> If the traveler and host mutually agree
            in writing (via in-app messages) to cancel a paid booking before the experience commences,
            a refund will be processed in accordance with the terms mutually agreed upon and confirmed
            with platform support.
          </li>
        </ul>

        <h2>3. Cancellation and Refund Coordination</h2>
        <p>
          Because local hosts allocate their personal time and decline other traveler inquiries
          once a booking is confirmed and paid, paid bookings cannot be cancelled via silent
          one-click self-service. All cancellations of paid bookings must be submitted through
          HireALocals Support (<Link href="/contact">Contact & Support</Link> or email{" "}
          <a href="mailto:support@hirealocals.com">support@hirealocals.com</a>) with the booking
          reference number. This ensures that:
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>The local host is promptly notified so they can unblock their schedule.</li>
          <li>Platform escrow ledgers and payment records remain strictly synchronized.</li>
          <li>Refunds are initiated through the official payment processor merchant channel.</li>
        </ul>
        <p>
          Please review our complete <Link href="/cancellation">Cancellation Policy</Link> for
          additional details on notice periods and host communications.
        </p>

        <h2>4. Payment Processing & Refund Method</h2>
        <p>
          All approved refunds are credited back directly to the original payment method utilized
          during checkout (via Safepay). For security and anti-fraud compliance, HireALocals does
          not issue cash refunds or redirect refunds to alternative third-party cards or accounts.
        </p>

        <h2>5. Refund Timeline</h2>
        <p>
          Once a refund request is authorized by HireALocals Support, the refund is submitted
          immediately to our payment gateway. The actual time required for funds to appear on the
          customer&apos;s statement depends on the customer&apos;s card-issuing financial institution and
          standard banking processing cycles (typically 5 to 10 standard business days).
        </p>

        <h2>6. Service Issues & Dispute Resolution</h2>
        <p>
          If a traveler encounters a substantial issue during an experience (such as material
          deviation from the confirmed itinerary, safety concerns, or unprofessional conduct),
          the traveler must notify HireALocals Support within 48 hours of the scheduled completion time.
          Our support team will review the timeline, communication records, and host feedback
          to reach a fair, objective resolution.
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
