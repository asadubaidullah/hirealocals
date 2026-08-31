import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  HeartHandshake,
  HelpCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet
} from "lucide-react";

import ProviderForm from "@/components/ProviderForm";

export const metadata: Metadata = {
  title: "Become a Local Host | Turn Local Knowledge into Income | HireALocals",
  description:
    "Apply to become a verified HireALocals host. Offer private walking tours, food tastings, photography, and city orientation to travelers in top UK and US cities.",
  alternates: {
    canonical: "/become-a-local",
  },
  openGraph: {
    title: "Become a Local Host | HireALocals",
    description:
      "Join our community of verified local hosts. Share your city, set your own hourly rates, and host flexible private experiences.",
    url: "https://hirealocals.com/become-a-local",
    siteName: "HireALocals",
  },
};

const benefits = [
  {
    icon: DollarSign,
    title: "Earn on your own terms",
    text: "Set your own hourly rate and create custom experience packages. Keep the majority of every booking with transparent platform fees.",
  },
  {
    icon: Calendar,
    title: "Total schedule flexibility",
    text: "You decide when you host. Open specific days, block calendar dates, and set times that seamlessly fit around your lifestyle.",
  },
  {
    icon: Users,
    title: "100% private experiences",
    text: "Host individual travelers, couples, or small private groups. No chaotic 40-person tour buses or rigid corporate scripts.",
  },
  {
    icon: MessageCircle,
    title: "Direct traveler communication",
    text: "Chat with travelers through in-platform messaging before confirming any booking to align on start times, meeting spots, and interests.",
  },
  {
    icon: Wallet,
    title: "Guaranteed payment protection",
    text: "Traveler payments are pre-funded and held securely in platform escrow before you meet. Payouts are tracked transparently in your workspace.",
  },
  {
    icon: Star,
    title: "Build your local reputation",
    text: "Collect verified 5-star traveler reviews that build your personal profile visibility and unlock higher earnings over time.",
  },
];

const roadmapSteps = [
  {
    number: "01",
    title: "Submit your application",
    description:
      "Fill out our simple application form with your location, languages spoken, and the types of experiences you want to offer.",
  },
  {
    number: "02",
    title: "Quick verification review",
    description:
      "Our team reviews your application to ensure community quality and safety standards before activating your Local account.",
  },
  {
    number: "03",
    title: "Build your profile & services",
    description:
      "Access your Local workspace to set your hourly rate, publish custom walking experiences, and set your weekly availability calendar.",
  },
  {
    number: "04",
    title: "Host travelers & get paid",
    description:
      "Receive direct booking requests and custom traveler proposals, meet up in your city, and receive secure payouts.",
  },
];

const hostFaqs = [
  {
    q: "Do I need a commercial tour license to become a local host?",
    a: "You do not need to be a commercial tour operator to share your personal city knowledge, neighborhood walks, food discoveries, or photography experiences. However, hosts must comply with all local municipal guidelines and regulations in their respective cities.",
  },
  {
    q: "How much can I charge as a Local?",
    a: "You have complete freedom to set your hourly rate and custom service package pricing. Most verified hosts charge between $30 to $80+ per hour depending on their expertise, language skills, and experience specialization.",
  },
  {
    q: "How do payouts work?",
    a: "When a traveler books with you, their payment is pre-authorized and held safely in platform escrow. After your booking is completed, your earnings are credited directly to your Local account balance with transparent ledger tracking.",
  },
  {
    q: "What languages and services are most in demand?",
    a: "Travelers look for a wide range of help: neighborhood cultural walks, authentic food tastings, street photography, and first-day transit orientation. Multilingual hosts (English, Spanish, French, German, Japanese, etc.) are in especially high demand.",
  },
];

export default function BecomeALocalPage() {
  return (
    <>
      {/* HERO SECTION */}
      <section className="bal-hero-v2">
        <div className="container">
          <div className="bal-hero-v2-grid">
            <div className="bal-hero-v2-copy">
              <span className="eyebrow">
                <Sparkles size={14} />
                Local Partner Program
              </span>

              <h1>
                Turn your city knowledge into <span>flexible income</span>.
              </h1>

              <p className="lead">
                Join HireALocals to host private walking tours, food walks, street photography, and neighborhood orientation for travelers visiting your city.
              </p>

              <div className="bal-hero-v2-actions">
                <a href="#apply" className="btn">
                  Apply to become a Local <ArrowRight size={17} />
                </a>
                <a href="#how-it-works" className="btn secondary">
                  How it works
                </a>
              </div>

              <div className="bal-hero-v2-proof">
                <div className="bal-proof-pill">
                  <CheckCircle2 size={16} />
                  <span>Set your own rates</span>
                </div>
                <div className="bal-proof-pill">
                  <CheckCircle2 size={16} />
                  <span>Flexible schedule</span>
                </div>
                <div className="bal-proof-pill">
                  <CheckCircle2 size={16} />
                  <span>Secure escrow payouts</span>
                </div>
              </div>
            </div>

            <div className="bal-hero-v2-visual">
              <div className="bal-visual-wrapper">
                <picture>
                  <source
                    type="image/webp"
                    srcSet="/images/become-a-local/hero-guide-pexels-mobile.webp 750w, /images/become-a-local/hero-guide-pexels.webp 1600w"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <img
                    src="/images/become-a-local/hero-guide-pexels.jpg"
                    alt="HireALocals host sharing authentic city stories with visitors"
                    fetchPriority="high"
                    decoding="async"
                    width={600}
                    height={400}
                  />
                </picture>
                <div className="bal-floating-badge">
                  <BadgeCheck size={22} className="badge-icon" />
                  <div>
                    <strong>Verified Local Community</strong>
                    <span>Real residents. Real connections.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY HOST WITH US */}
      <section className="section bal-benefits-section" id="benefits">
        <div className="container">
          <div className="bal-section-head">
            <span className="eyebrow">Host Advantages</span>
            <h2>Why host private experiences on HireALocals?</h2>
            <p className="lead">
              We provide the tools, traveler reach, and payment security so you can focus on showing off the city you love.
            </p>
          </div>

          <div className="bal-benefits-grid">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <article className="bal-benefit-card" key={b.title}>
                  <div className="bal-benefit-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS ROADMAP */}
      <section className="section bal-how-section" id="how-it-works">
        <div className="container">
          <div className="bal-section-head">
            <span className="eyebrow">Onboarding Roadmap</span>
            <h2>From application to your first booking.</h2>
            <p className="lead">
              A simple, transparent 4-step path to start earning as a verified local host.
            </p>
          </div>

          <div className="bal-roadmap-grid">
            {roadmapSteps.map((step) => (
              <div className="bal-roadmap-card" key={step.number}>
                <div className="bal-roadmap-num">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & SAFETY FOR HOSTS */}
      <section className="section bal-trust-section">
        <div className="container">
          <div className="bal-trust-card">
            <div className="bal-trust-copy">
              <span className="eyebrow">Platform Protection</span>
              <h2>Your safety and peace of mind come first.</h2>
              <p>
                HireALocals is built with built-in safeguards to ensure safe, transparent, and mutually respectful connections between travelers and hosts.
              </p>
            </div>

            <div className="bal-trust-features">
              <div className="bal-trust-feature">
                <ShieldCheck size={20} />
                <div>
                  <strong>Pre-Funded Bookings</strong>
                  <span>Every traveler pre-pays before you meet; no awkward cash handoffs.</span>
                </div>
              </div>

              <div className="bal-trust-feature">
                <Users size={20} />
                <div>
                  <strong>Traveler Account Reviews</strong>
                  <span>Direct communication and profile details before accepting requests.</span>
                </div>
              </div>

              <div className="bal-trust-feature">
                <HeartHandshake size={20} />
                <div>
                  <strong>Mutual Feedback System</strong>
                  <span>Both travelers and hosts leave verified reviews after every completed experience.</span>
                </div>
              </div>

              <div className="bal-trust-feature">
                <BadgeCheck size={20} />
                <div>
                  <strong>Dedicated Platform Support</strong>
                  <span>Our support team is on standby to assist with booking questions and scheduling.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPLICATION SECTION WITH FORM */}
      <section className="section bal-application-section" id="apply">
        <div className="container">
          <div className="bal-apply-layout">
            <div className="bal-apply-sidebar">
              <span className="eyebrow">Apply Today</span>
              <h2>Ready to share your city with the world?</h2>
              <p className="lead">
                Submit your application below. We review all applications to maintain high trust and quality across our marketplace.
              </p>

              <div className="bal-sidebar-perks">
                <div className="bal-sidebar-perk">
                  <CheckCircle2 size={18} />
                  <span>Free to apply — no upfront subscription or listing fees</span>
                </div>
                <div className="bal-sidebar-perk">
                  <CheckCircle2 size={18} />
                  <span>Direct control over your pricing and schedule</span>
                </div>
                <div className="bal-sidebar-perk">
                  <CheckCircle2 size={18} />
                  <span>Full access to your personal Local workspace dashboard</span>
                </div>
                <div className="bal-sidebar-perk">
                  <CheckCircle2 size={18} />
                  <span>Opportunity to receive custom traveler requests</span>
                </div>
              </div>

              <div className="bal-sidebar-faq">
                <h4>Questions before applying?</h4>
                <p>
                  Check out our <Link href="/how-it-works">How It Works</Link> page or read our <Link href="/safety">Trust & Safety Guidelines</Link>.
                </p>
              </div>
            </div>

            <div className="bal-apply-form-wrapper">
              <ProviderForm />
            </div>
          </div>
        </div>
      </section>

      {/* HOST FAQS */}
      <section className="section bal-faq-section">
        <div className="container">
          <div className="bal-section-head">
            <span className="eyebrow">Host FAQs</span>
            <h2>Frequently asked questions from prospective hosts.</h2>
            <p className="lead">
              Common questions about hosting, setting rates, and getting verified.
            </p>
          </div>

          <div className="bal-faq-grid">
            {hostFaqs.map((faq, idx) => (
              <details className="bal-faq-item" key={idx} open={idx === 0}>
                <summary className="bal-faq-question">
                  <span>{faq.q}</span>
                </summary>
                <p className="bal-faq-answer">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
