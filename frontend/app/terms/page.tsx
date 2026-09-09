import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | HireALocals",
  description:
    "Read the HireALocals marketplace terms for travelers and independent local service providers.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <section className="section">
      <div className="container legal">
        <span className="eyebrow">Platform Terms</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 20 }}>
          Terms of Use
        </h1>

        <h2>1. Marketplace Role</h2>
        <p>
          HireALocals operates an online marketplace connecting travelers seeking private,
          guided experiences with independent local resident hosts. Local hosts are independent
          contractors and service providers, not employees, partners, or agents of HireALocals.
        </p>

        <h2>2. User Responsibilities</h2>
        <p>
          Travelers and visitors agree to provide accurate registration information, use the
          platform in compliance with all applicable local laws, adhere to agreed-upon safety
          and cancellation guidelines, and maintain communication within the platform. Users
          must not solicit or complete transactions outside HireALocals to bypass marketplace
          safeguards or platform fees.
        </p>

        <h2>3. Host &amp; Local Provider Responsibilities</h2>
        <p>
          Independent hosts are solely responsible for the truthfulness and accuracy of their
          profile information, obtaining any required local permits or licenses, maintaining
          appropriate insurance where applicable, and safely providing the agreed experience.
        </p>

        <h2>4. Payments, Cancellations &amp; Refunds</h2>
        <p>
          Online payments are processed securely through our authorized payment processor
          (Safepay). Booking payments, cancellation timelines, and refund eligibility are
          governed by our published <Link href="/cancellation">Cancellation Policy</Link> and{" "}
          <Link href="/refund">Refund Policy</Link>, which are incorporated by reference into
          these Terms.
        </p>

        <h2>5. Legal Entity &amp; Governing Law</h2>
        <p>
          <em>
            [Pending Business/Legal Completion: Official registered entity name, company
            registration number, registered office address, and governing law / dispute
            resolution jurisdiction are to be finalized prior to public launch.]
          </em>
        </p>

        <h2>6. Contact &amp; Inquiries</h2>
        <p>
          For questions regarding these Terms of Use, please contact:
          <br />
          Email: <a href="mailto:support@hirealocals.com">support@hirealocals.com</a>
          <br />
          Contact Form: <Link href="/contact">hirealocals.com/contact</Link>
        </p>
      </div>
    </section>
  );
}

