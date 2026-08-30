import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Flag,
  MessageCircle,
  ShieldCheck,
  Star
} from "lucide-react";

export const metadata:Metadata={
  title:"Trust & Safety",
  description:
    "Learn about HireALocals profile review, booking records, reviews and marketplace safety practices.",
  alternates:{
    canonical:"/safety"
  }
};

export default function SafetyPage(){
  return <div className="market-page safety-market-page">

    <section className="market-hero safety-market-hero">
      <div className="container market-hero-grid">

        <div className="market-hero-copy">
          <span className="eyebrow">
            Trust & Safety
          </span>

          <h1>
            Meet a local
            <br/>
            with more
            <br/>
            confidence.
          </h1>

          <p className="lead">
            HireALocals is built around reviewed profiles,
            clear booking records, direct communication and
            marketplace review history.
          </p>

          <div className="market-hero-actions">
            <Link href="/explore" className="btn">
              Browse locals
              <ArrowRight size={17}/>
            </Link>

            <Link href="/contact" className="btn secondary">
              Contact support
            </Link>
          </div>
        </div>

        <div className="market-hero-media safety-hero-media">
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=86"
            alt="Travelers meeting and exploring together"
            fetchPriority="high"
          />

          <div className="market-photo-label">
            <ShieldCheck size={18}/>
            <div>
              <strong>Trust grows from clear records.</strong>
              <span>
                Profiles, requests and reviews add context
                before you decide.
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>


    <section className="section">
      <div className="container">

        <div className="market-section-head">
          <div>
            <span className="eyebrow">
              Marketplace safeguards
            </span>

            <h2>
              What the current platform does.
            </h2>
          </div>
        </div>

        <div className="safety-feature-grid">

          <article>
            <span>
              <BadgeCheck size={22}/>
            </span>

            <h3>Profile review</h3>

            <p>
              Local profiles can be reviewed before they
              become publicly visible.
            </p>
          </article>

          <article>
            <span>
              <BookOpenCheck size={22}/>
            </span>

            <h3>Booking records</h3>

            <p>
              Requests keep trip details together so both
              sides have clearer context.
            </p>
          </article>

          <article>
            <span>
              <MessageCircle size={22}/>
            </span>

            <h3>Direct communication</h3>

            <p>
              Travelers can explain requirements before
              meeting the local.
            </p>
          </article>

          <article>
            <span>
              <Star size={22}/>
            </span>

            <h3>Review history</h3>

            <p>
              Completed-booking feedback gives future travelers
              additional context.
            </p>
          </article>

        </div>

      </div>
    </section>


    <section className="section market-soft-section">
      <div className="container safety-rules-layout">

        <div className="safety-rules-intro">
          <span className="eyebrow">
            Practical safety
          </span>

          <h2>
            Simple habits still matter.
          </h2>

          <p>
            A marketplace can provide structure,
            but travelers and locals should still use
            sensible judgment when meeting in person.
          </p>
        </div>

        <div className="safety-rules-card">

          <div>
            <ShieldCheck size={19}/>
            <p>
              Meet in sensible public locations unless the
              booked service clearly requires otherwise.
            </p>
          </div>

          <div>
            <MessageCircle size={19}/>
            <p>
              Keep important booking details and communication
              on-platform where possible.
            </p>
          </div>

          <div>
            <Flag size={19}/>
            <p>
              Report unsafe, misleading or inappropriate
              behaviour through the available support channels.
            </p>
          </div>

          <div>
            <BadgeCheck size={19}/>
            <p>
              Do not send identity documents directly to
              another marketplace user.
            </p>
          </div>

        </div>

      </div>
    </section>


    <section className="section-sm market-final-cta-section">
      <div className="container market-final-cta">

        <div>
          <span className="eyebrow">
            Need help?
          </span>

          <h2>
            Talk to HireALocals support.
          </h2>
        </div>

        <Link href="/contact" className="btn">
          Contact support
          <ArrowRight size={17}/>
        </Link>

      </div>
    </section>

  </div>;
}
