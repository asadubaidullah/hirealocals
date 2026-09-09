import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | HireALocals",
  description:
    "Read the HireALocals privacy policy and learn how marketplace account, booking, payment, and support data is handled.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="container legal">
        <span className="eyebrow">Privacy Notice</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 20 }}>
          Privacy Policy
        </h1>

        <h2>1. Information We Collect</h2>
        <p>
          We collect personal information necessary to deliver marketplace services, including:
        </p>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            <strong>Account &amp; Profile Details:</strong> Name, email address, profile photo,
            and authentication credentials provided upon registration.
          </li>
          <li>
            <strong>Host Applications:</strong> Experience descriptions, qualifications, languages,
            pricing, and verification information submitted by prospective local hosts.
          </li>
          <li>
            <strong>Booking Records:</strong> Destination city, scheduled date and time, duration,
            special instructions, and status history.
          </li>
          <li>
            <strong>Communications:</strong> Messages exchanged between travelers and hosts via
            our on-platform messaging system, and correspondence with customer support.
          </li>
        </ul>

        <h2>2. Payment Information</h2>
        <p>
          Online payments are processed securely through our authorized payment gateway (Safepay).
          HireALocals does not store sensitive payment card details or card security codes directly
          on its application servers.
        </p>

        <h2>3. Identity Verification &amp; Documents</h2>
        <p>
          Where identity verification is required for local host onboarding, verification records
          and identity documentation are handled with strict access controls and security safeguards.
          Identity documents are never published or made accessible to other users or travelers.
        </p>

        <h2>4. Data Retention &amp; Security</h2>
        <p>
          We retain account and transaction records for the duration necessary to provide marketplace
          services, prevent fraudulent activities, comply with legal and financial accounting
          obligations, and resolve booking disputes.
        </p>

        <h2>5. Your Privacy Rights &amp; Requests</h2>
        <p>
          Users may request access to, correction of, or deletion of their personal information
          by reaching out to our support team:
          <br />
          Email: <a href="mailto:support@hirealocals.com">support@hirealocals.com</a>
          <br />
          Contact Form: <Link href="/contact">hirealocals.com/contact</Link>
          <br />
          Requests are subject to legitimate operational and legal retention requirements.
        </p>

        <h2>6. Data Controller &amp; Regulatory Jurisdiction</h2>
        <p>
          <em>
            [Pending Business/Legal Completion: Designated legal data controller identity,
            registered company address, and regulatory jurisdiction / supervisory authority
            disclosures (such as UK/EU GDPR representatives) are to be inserted upon final legal
            confirmation.]
          </em>
        </p>
      </div>
    </section>
  );
}

