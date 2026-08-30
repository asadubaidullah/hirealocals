import type { Metadata } from "next";
import Link from "next/link";

import {
  Accessibility,
  ArrowRight,
  Camera,
  CarFront,
  Compass,
  Landmark,
  Languages,
  MessageCircle,
  PlaneLanding,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UsersRound,
  UtensilsCrossed
} from "lucide-react";

import { getServiceCategories } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Local Travel Experiences & Services",
  description:
    "Explore local guides, photography, food discovery, language help, trip planning and practical travel services on HireALocals.",
  alternates: {
    canonical: "/experiences"
  }
};

function serviceIcon(name:string){
  const key=name.toLowerCase();
  const props={size:24,strokeWidth:1.8};

  if(key.includes("photo"))return <Camera {...props}/>;
  if(key.includes("food"))return <UtensilsCrossed {...props}/>;
  if(key.includes("airport"))return <PlaneLanding {...props}/>;
  if(key.includes("driver"))return <CarFront {...props}/>;

  if(
    key.includes("interpreter")||
    key.includes("translator")||
    key.includes("language")
  ){
    return <Languages {...props}/>;
  }

  if(key.includes("shopping"))return <ShoppingBag {...props}/>;
  if(key.includes("family"))return <UsersRound {...props}/>;

  if(
    key.includes("wheelchair")||
    key.includes("access")
  ){
    return <Accessibility {...props}/>;
  }

  if(
    key.includes("history")||
    key.includes("historical")
  ){
    return <Landmark {...props}/>;
  }

  if(
    key.includes("guide")||
    key.includes("tour")
  ){
    return <Compass {...props}/>;
  }

  return <Sparkles {...props}/>;
}

function serviceFallback(name:string){
  const key=name.toLowerCase();

  if(key.includes("photo"))
    return "Travel photography and relaxed photo walks with someone who knows the city.";

  if(key.includes("food"))
    return "Explore neighbourhood favourites, markets and local food culture.";

  if(key.includes("airport"))
    return "Practical local help when arriving in an unfamiliar city.";

  if(key.includes("driver"))
    return "Flexible local driving support shaped around your plans.";

  if(
    key.includes("interpreter")||
    key.includes("translator")||
    key.includes("language")
  )
    return "Practical language support for travel and everyday situations.";

  if(key.includes("shopping"))
    return "Local shopping help, markets and neighbourhood recommendations.";

  if(key.includes("family"))
    return "Flexible local help for families travelling at their own pace.";

  if(
    key.includes("guide")||
    key.includes("tour")
  )
    return "Explore privately with someone who knows the city beyond the obvious.";

  return "Flexible person-to-person travel help from someone who knows the city.";
}

export default async function ExperiencesPage(){
  const categories=(await getServiceCategories())
    .filter(category=>category.active!==false);

  return <div className="market-page experiences-market-page">

    <section className="market-hero experiences-hero">
      <div className="container market-hero-grid">

        <div className="market-hero-copy">
          <span className="eyebrow">Experiences</span>

          <h1>
            More than
            <br/>
            tour guides.
          </h1>

          <p className="lead">
            Choose the kind of local help that fits your trip,
            then compare the people currently offering it.
          </p>

          <div className="market-hero-actions">
            <Link href="/explore" className="btn">
              Find your local
              <ArrowRight size={17}/>
            </Link>

            <Link href="/how-it-works" className="btn secondary">
              How it works
            </Link>
          </div>

          <div className="market-proof-row">
            <span>
              <ShieldCheck size={17}/>
              Profile review
            </span>

            <span>
              <MessageCircle size={17}/>
              Direct requests
            </span>

            <span>
              <Star size={17}/>
              Booking reviews
            </span>
          </div>
        </div>

        <div className="market-hero-media experiences-hero-media">
          <img
            src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=86"
            alt="Travelers sharing a local food experience"
            fetchPriority="high"
          />

          <div className="market-photo-label">
            <Sparkles size={17}/>
            <div>
              <strong>Private. Flexible. Personal.</strong>
              <span>Choose the person who fits your trip.</span>
            </div>
          </div>
        </div>

      </div>
    </section>


    <section className="section market-directory-section">
      <div className="container">

        <div className="market-section-head">
          <div>
            <span className="eyebrow">Explore by service</span>
            <h2>What do you need a local for?</h2>
            <p>
              Service availability is based on active categories
              and locals currently listed on HireALocals.
            </p>
          </div>
        </div>

        {categories.length ?
           <div className="experience-card-grid">
              {categories.map(category=>
                <Link
                  href={`/explore?service=${encodeURIComponent(category.name)}`}
                  className="experience-service-card"
                  key={category.id}
                >
                  <span className="experience-service-icon">
                    {serviceIcon(category.name)}
                  </span>

                  <div>
                    <h3>{category.name}</h3>
                    <p>
                      {category.description||
                       serviceFallback(category.name)}
                    </p>
                  </div>

                  <ArrowRight
                    className="experience-service-arrow"
                    size={18}
                  />
                </Link>
              )}
            </div>
          : <div className="empty">
              Experience categories will appear here when they are available.
            </div>
        }

      </div>
    </section>


    <section className="section market-soft-section">
      <div className="container">

        <div className="market-section-head compact">
          <div>
            <span className="eyebrow">Designed around you</span>
            <h2>Choose the help. Then choose the person.</h2>
          </div>
        </div>

        <div className="market-value-grid">

          <article>
            <span>01</span>
            <h3>Start with your trip</h3>
            <p>
              Pick the city and the kind of local help you need.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>Compare real profiles</h3>
            <p>
              Look at services, languages, reviews and pricing
              before deciding.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>Send a direct request</h3>
            <p>
              Share your date, group size and requirements with
              the person you choose.
            </p>
          </article>

        </div>

      </div>
    </section>


    <section className="section-sm market-final-cta-section">
      <div className="container market-final-cta">

        <div>
          <span className="eyebrow">Find your match</span>
          <h2>Ready to compare locals?</h2>
          <p>
            Search by destination, service, rating and price.
          </p>
        </div>

        <Link className="btn" href="/explore">
          Find a Local
          <ArrowRight size={17}/>
        </Link>

      </div>
    </section>

  </div>;
}
