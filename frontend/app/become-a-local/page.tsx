import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import ProviderForm from "@/components/ProviderForm";

export const metadata: Metadata = {
  title: "Become a Local",
  description:
    "Apply to become a HireALocals Local and offer private experiences and practical local help to travelers across selected UK and US cities.",
  alternates: {
    canonical: "/become-a-local",
  },
};

const benefits = [
  {
    icon: Heart,
    title: "Share what you know",
    text:
      "Turn your knowledge of your city, neighbourhoods, culture and everyday life into useful experiences for travelers.",
  },
  {
    icon: CalendarDays,
    title: "Work on your terms",
    text:
      "Choose the services you want to offer and manage your availability from your Local workspace.",
  },
  {
    icon: Users,
    title: "Meet travelers personally",
    text:
      "Offer private, flexible help instead of forcing every traveler into the same generic package.",
  },
];

const steps = [
  {
    number: "1",
    title: "Apply",
    text:
      "Tell us who you are, where you are based, the languages you speak and the services you can offer.",
  },
  {
    number: "2",
    title: "Application review",
    text:
      "HireALocals reviews your application before a Local account and public profile can go live.",
  },
  {
    number: "3",
    title: "Complete your Local profile",
    text:
      "Add your profile details, services, pricing, availability and any verification information that is required.",
  },
  {
    number: "4",
    title: "Start receiving requests",
    text:
      "Once ready, travelers can discover your profile and send booking requests for your services.",
  },
];

export default function Page() {
  return (
    <>
      <section className="bal-hero">
        <div className="container bal-hero-grid">

          <div className="bal-hero-copy">
            <span className="eyebrow">Become a Local</span>

            <h1>
              Share your world.
              <br />
              <span>Inspire</span> every traveler.
            </h1>

            <p>
              Use your local knowledge to help travelers experience a city
              in a more personal way. Choose what you offer, shape your
              availability and build a trusted Local profile.
            </p>

            <div className="bal-hero-actions">
              <Link href="#apply" className="btn">
                Apply to become a Local
                <ArrowRight size={17}/>
              </Link>

              <Link href="#how-it-works" className="btn secondary">
                How it works
              </Link>
            </div>

            <div className="bal-proof-row">
              <span>
                <ShieldCheck size={17}/>
                Application review
              </span>

              <span>
                <CalendarDays size={17}/>
                Flexible availability
              </span>

              <span>
                <Sparkles size={17}/>
                Your own services
              </span>
            </div>
          </div>


          <div className="bal-hero-visual">
            <img
              src="/images/become-a-local/hero-guide-pexels.jpg"
              alt="Local guide speaking with visiting travelers"
            />

            <div className="bal-hero-float">
              <span className="bal-hero-float-icon">
                <MapPin size={20}/>
              </span>

              <div>
                <strong>Local knowledge matters.</strong>
                <span>
                  Help travelers experience more than the usual checklist.
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>


      <section className="bal-section">
        <div className="container">

          <div className="bal-section-head">
            <span className="eyebrow">Why become a Local?</span>
            <h2>Turn local knowledge into something useful.</h2>
          </div>

          <div className="bal-benefit-grid">
            {benefits.map(({icon:Icon,title,text}) => (
              <article className="bal-benefit-card" key={title}>
                <span className="bal-icon">
                  <Icon size={22}/>
                </span>

                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

        </div>
      </section>


      <section className="bal-section bal-earn-section">
        <div className="container bal-earn-grid">

          <div>
            <span className="eyebrow">Build your offering</span>
            <h2>Choose what you do best.</h2>

            <p className="lead">
              A HireALocals profile can be built around the kind of help
              you genuinely know how to provide.
            </p>

            <div className="bal-check-list">
              <span>
                <CheckCircle2 size={17}/>
                Private local and city experiences
              </span>

              <span>
                <CheckCircle2 size={17}/>
                Food, photography or language help
              </span>

              <span>
                <CheckCircle2 size={17}/>
                Trip planning and practical local support
              </span>

              <span>
                <CheckCircle2 size={17}/>
                Your own service details and availability
              </span>
            </div>
          </div>


          <div className="bal-earn-card">
            <span className="bal-icon large">
              <WalletCards size={28}/>
            </span>

            <span className="eyebrow">Transparent marketplace</span>

            <h3>Your services. Your profile.</h3>

            <p>
              Set up the services and pricing that make sense for what
              you offer. Confirmed booking and earnings information is
              available from your Local workspace.
            </p>

            <div className="bal-mini-facts">
              <span>
                <Clock3 size={16}/>
                Manage availability
              </span>

              <span>
                <BadgeCheck size={16}/>
                Build a trusted profile
              </span>
            </div>
          </div>

        </div>
      </section>


      <section
        className="bal-section bal-how-section"
        id="how-it-works"
      >
        <div className="container">

          <div className="bal-section-head">
            <span className="eyebrow">How to get started</span>
            <h2>From application to your first request.</h2>
          </div>

          <div className="bal-step-grid">
            {steps.map(step => (
              <article className="bal-step" key={step.number}>
                <span className="bal-step-number">
                  {step.number}
                </span>

                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>


      <section className="bal-trust-strip">
        <div className="container bal-trust-grid">

          <div>
            <strong>Trusted marketplace. Real people.</strong>
            <span>
              We review Local applications before profiles can go live.
            </span>
          </div>

          <span>
            <ShieldCheck size={20}/>
            Profile review
          </span>

          <span>
            <BadgeCheck size={20}/>
            Verification where required
          </span>

          <span>
            <Sparkles size={20}/>
            Quality-focused profiles
          </span>

        </div>
      </section>


      <section className="bal-apply-section" id="apply">
        <div className="container bal-apply-grid">

          <div className="bal-apply-copy">
            <span className="eyebrow">Your application</span>

            <h2>Tell us about your city and what you can offer.</h2>

            <p>
              Start with the essentials. If your application is approved,
              you can then complete your Local profile, services and
              availability from your workspace.
            </p>

            <div className="notice">
              Applications are reviewed before a Local profile is
              published.
            </div>
          </div>

          <div className="bal-form-shell">
            <ProviderForm/>
          </div>

        </div>
      </section>
    </>
  );
}



