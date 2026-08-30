import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  MessageCircle,
  Search,
  Star,
  UserRoundCheck
} from "lucide-react";

export const metadata:Metadata={
  title:"How HireALocals Works",
  description:
    "See how travelers search, compare and request local people for private travel experiences.",
  alternates:{
    canonical:"/how-it-works"
  }
};

const steps=[
  {
    n:"01",
    icon:<Search size={22}/>,
    title:"Search your city",
    text:"Choose the destination and the kind of local help that fits your trip."
  },
  {
    n:"02",
    icon:<UserRoundCheck size={22}/>,
    title:"Choose your person",
    text:"Compare profiles, languages, services, reviews and pricing before deciding."
  },
  {
    n:"03",
    icon:<MessageCircle size={22}/>,
    title:"Plan it together",
    text:"Send your date, group size and requirements directly to the local you choose."
  },
  {
    n:"04",
    icon:<MapPin size={22}/>,
    title:"Meet & experience",
    text:"Agree the meeting details, then experience the city at a pace that works for you."
  }
];

export default function HowItWorksPage(){
  return <div className="market-page how-market-page">

    <section className="market-hero how-market-hero">
      <div className="container market-hero-grid">

        <div className="market-hero-copy">
          <span className="eyebrow">
            Simple by design
          </span>

          <h1>
            Travel with
            <br/>
            a person,
            <br/>
            not a script.
          </h1>

          <p className="lead">
            HireALocals helps travelers compare people,
            discuss the details directly and create a more
            personal way to explore a place.
          </p>

          <div className="market-hero-actions">
            <Link href="/explore" className="btn">
              Find a local
              <ArrowRight size={17}/>
            </Link>

            <Link
              href="/safety"
              className="btn secondary"
            >
              Trust & Safety
            </Link>
          </div>
        </div>

        <div className="market-hero-media how-hero-media">
          <img
            src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1400&q=86"
            alt="Travelers exploring a destination together"
            fetchPriority="high"
          />

          <div className="how-photo-note">
            <CalendarCheck size={18}/>

            <div>
              <strong>You set the trip details.</strong>
              <span>
                Date, group size and meeting plan stay part
                of the request.
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>


    <section className="section how-journey-section">
      <div className="container">

        <div className="market-section-head">
          <div>
            <span className="eyebrow">
              From search to experience
            </span>

            <h2>
              Four simple steps.
            </h2>
          </div>

          <p>
            Start broad, compare the people available,
            then agree the details with the person you choose.
          </p>
        </div>

        <div className="how-journey-grid">
          {steps.map(step=>
            <article
              className="how-journey-card"
              key={step.n}
            >
              <div className="how-journey-top">
                <span className="how-journey-number">
                  {step.n}
                </span>

                <span className="how-journey-icon">
                  {step.icon}
                </span>
              </div>

              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          )}
        </div>

      </div>
    </section>


    <section className="section market-soft-section">
      <div className="container how-details-layout">

        <div>
          <span className="eyebrow">
            Before you meet
          </span>

          <h2>
            Make the important details clear.
          </h2>

          <p className="lead">
            A better local experience starts with a clear request,
            not with assumptions.
          </p>
        </div>

        <div className="how-detail-list">

          <div>
            <CalendarCheck size={19}/>
            <span>
              <strong>Date & time</strong>
              <small>
                Choose when you want the experience.
              </small>
            </span>
          </div>

          <div>
            <UserRoundCheck size={19}/>
            <span>
              <strong>Guests</strong>
              <small>
                Tell the local how many people are coming.
              </small>
            </span>
          </div>

          <div>
            <MapPin size={19}/>
            <span>
              <strong>Meeting details</strong>
              <small>
                Agree a practical meeting point before the trip.
              </small>
            </span>
          </div>

          <div>
            <MessageCircle size={19}/>
            <span>
              <strong>Your requirements</strong>
              <small>
                Explain what you want to see, do or arrange.
              </small>
            </span>
          </div>

        </div>

      </div>
    </section>


    <section className="section-sm market-final-cta-section">
      <div className="container market-final-cta">
        <div>
          <span className="eyebrow">
            Ready when you are
          </span>

          <h2>
            Find someone local who fits your trip.
          </h2>
        </div>

        <Link href="/explore" className="btn">
          Start exploring
          <ArrowRight size={17}/>
        </Link>
      </div>
    </section>

  </div>;
}
