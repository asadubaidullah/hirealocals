import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CarFront,
  Compass,
  Languages,
  MapPin,
  MessageCircle,
  PlaneLanding,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react";

import HomeMobileCarousels from "@/components/HomeMobileCarousels";
import SearchBar from "@/components/SearchBar";
import LocalCard from "@/components/LocalCard";

import {
  getBlogPosts,
  getFeaturedCities,
  getCities,
  getServiceCategories
} from "@/lib/content";

import { serverApiUrl } from "@/lib/site";

export const revalidate=30;

export const metadata:Metadata={
  title:"Hire Trusted Locals for Private Travel Experiences",
  description:"Find locals for private experiences and practical travel help across selected UK and US cities.",
  alternates:{canonical:"/"}
};

function serviceIcon(name:string){
  const key=name.toLowerCase();
  const props={size:21,strokeWidth:1.9};

  if(key.includes("photo"))return <Camera {...props}/>;
  if(key.includes("food"))return <UtensilsCrossed {...props}/>;
  if(key.includes("airport"))return <PlaneLanding {...props}/>;
  if(key.includes("driver"))return <CarFront {...props}/>;
  if(key.includes("translator")||key.includes("interpreter")||key.includes("language"))return <Languages {...props}/>;
  if(key.includes("shopping"))return <ShoppingBag {...props}/>;
  if(key.includes("guide")||key.includes("tour"))return <Compass {...props}/>;

  return <Sparkles {...props}/>;
}

async function liveLocals(){
  try{
    const r=await fetch(
      `${serverApiUrl}/api/locals`,
      {next:{revalidate:30}}
    );

    if(!r.ok)return[];

    const rows=await r.json();

    return rows.map((row:any)=>{
      const p=row.profile;
      const services=(row.services||[])
        .filter((s:any)=>s.active!==false);

      return {
        id:p.id,
        slug:p.slug,
        name:p.display_name,
        city:p.city_name,
        headline:p.headline,
        languages:String(p.languages||"")
          .split(",")
          .map((x:string)=>x.trim())
          .filter(Boolean),
        rating:p.rating,
        reviews:p.review_count,
        rate:p.hourly_rate,
        verified:p.verified,
        image:p.image_url,
        categories:[
          ...new Set(services.map((s:any)=>s.category))
        ] as string[],
      };
    });
  }catch{
    return[];
  }
}

export default async function Home(){
  const[
    featured,
    allCities,
    categories,
    locals,
    guides
  ]=await Promise.all([
    getFeaturedCities(),
    getCities(),
    getServiceCategories(),
    liveLocals(),
    getBlogPosts(),
  ]);

  const cityCards=(featured.length?featured:allCities).slice(0,4);

  const activeCategories=categories
    .filter(category=>category.active!==false)
    .slice(0,6);

  const featuredLocals=locals.slice(0,4);
  const first=featuredLocals[0];

  return <>
    <HomeMobileCarousels/>
    

    {/* HERO */}
    <section className="hal-home-hero hal-home-hero-reference">
      <div className="container hal-home-hero-inner">

        <div className="hal-home-hero-copy">
          <h1>
            Real people.<br/>
            Real experiences.<br/>
            <span>Made for you.</span>
          </h1>

          <p>
            Find trusted locals in selected UK and US cities for
            private experiences, practical travel help and a more
            personal way to explore.
          </p>
        </div>


        <div className="hal-home-hero-photo hal-home-reference-photo">

          <img
            src="/images/home/hero-home-pexels.jpg"
            alt="Female traveler exploring London near Big Ben"
          />


          {first&&first.image ?
             <Link
                href={`/locals/${first.slug}`}
                className="hal-home-floating-local hal-home-floating-local-v2"
              >

                <div className="hal-local-card-status">
                  <span className="hal-local-status-dot"/>
                  {first.verified ?
                     "Verified local"
                    : "Local profile"
                  }
                </div>


                <div className="hal-local-card-main">

                  <img
                    src={first.image}
                    alt=""
                    className="hal-local-card-avatar"
                  />

                  <div className="hal-local-card-identity">

                    <strong>{first.name}</strong>

                    <span>
                      <MapPin size={12}/>
                      {first.city}
                    </span>

                  </div>

                </div>


                {Number(first.rating)>0&&Number(first.reviews)>0 ?
                   <div className="hal-local-card-rating">

                      <Star
                        size={13}
                        fill="currentColor"
                      />

                      <strong>{first.rating}</strong>

                      <span>
                        ({first.reviews} reviews)
                      </span>

                    </div>
                  : null
                }


                {first.categories?.length ?
                   <div className="hal-local-card-tags">

                      {first.categories
                        .slice(0,3)
                        .map((category:string)=>
                          <span key={category}>
                            {category}
                          </span>
                        )
                      }

                    </div>
                  : null
                }


                {Number(first.rate)>0 ?
                   <div className="hal-local-card-price">

                      From{" "}
                      <strong>
                        ${Number(first.rate).toFixed(0)}
                      </strong>

                      <span> / hour</span>

                    </div>
                  : null
                }

              </Link>
            : null
          }

        </div>


        <div className="hal-home-search">
          <SearchBar/>
        </div>


        <div className="hal-home-trustbar">

          <span>
            <ShieldCheck size={16}/>
            Profile review
          </span>

          <span>
            <MessageCircle size={16}/>
            Direct requests
          </span>

          <span>
            <Star size={16}/>
            Marketplace reviews
          </span>

        </div>

      </div>
    </section>


    {/* EXPERIENCES */}
    <section className="hal-home-section hal-home-services">
      <div className="container">

        <div className="hal-section-heading">
          <div>
            <span className="eyebrow">Travel marketplace</span>
            <h2>More than tour guides.</h2>
            <p>
              Choose the type of local help that fits your trip.
            </p>
          </div>

          <Link href="/experiences">
            See all experiences <ArrowRight size={15}/>
          </Link>
        </div>

        <div className="hal-service-grid">
          {activeCategories.map(category=>
            <Link
              key={category.id}
              href={`/explore?service=${encodeURIComponent(category.name)}`}
              className="hal-service-card"
            >
              <span>{serviceIcon(category.name)}</span>

              <div>
                <h3>{category.name}</h3>
                <p>
                  {category.description||
                    "Explore locals offering this service."}
                </p>
              </div>
            </Link>
          )}
        </div>

      </div>
    </section>


    {/* DESTINATIONS - SEPARATE */}
    <section className="hal-home-section hal-home-destinations">
      <div className="container">

        <div className="hal-section-heading">
          <div>
            <span className="eyebrow">Popular destinations</span>
            <h2>Start with a city you love.</h2>
            <p>
              Explore destinations where HireALocals is currently
              building its local marketplace.
            </p>
          </div>

          <Link href="/destinations">
            All destinations <ArrowRight size={15}/>
          </Link>
        </div>

        <div className="hal-destination-grid">
          {cityCards.map(city=>
            <Link
              key={city.id}
              href={`/${city.country_slug}/${city.slug}`}
              className="hal-destination-card"
            >
              {city.image_url ?
                 <img
                    src={city.image_url}
                    alt={`${city.name}, ${city.country_name}`}
                    loading="lazy"
                  />
                : null
              }

              <div>
                <strong>{city.name}</strong>
                <span>{city.country_name}</span>
              </div>
            </Link>
          )}
        </div>

      </div>
    </section>


    {/* LOCALS - SEPARATE */}
    <section className="hal-home-section hal-home-locals">
      <div className="container">

        <div className="hal-section-heading">
          <div>
            <span className="eyebrow">Meet some locals</span>
            <h2>Choose the person, not a generic package.</h2>
            <p>
              Compare real profiles, languages, services and available
              pricing before sending a request.
            </p>
          </div>

          <Link href="/explore">
            View all locals <ArrowRight size={15}/>
          </Link>
        </div>

        {featuredLocals.length ?
           <div className="hal-local-grid">
              {featuredLocals.map((local:any)=>
                <LocalCard key={local.id} local={local}/>
              )}
            </div>
          : <div className="empty">
              Local profiles will appear here as they go live.
            </div>
        }

      </div>
    </section>


    {/* HOW IT WORKS - SEPARATE */}
    <section className="hal-home-section hal-home-how">
      <div className="container">

        <div className="hal-section-heading">
          <div>
            <span className="eyebrow">How it works</span>
            <h2>Find the right local in three simple steps.</h2>
          </div>

          <Link href="/how-it-works">
            See how it works <ArrowRight size={15}/>
          </Link>
        </div>

        <div className="hal-how-grid">
          <article>
            <span>01</span>
            <h3>Search & discover</h3>
            <p>Choose your destination and the service you need.</p>
          </article>

          <article>
            <span>02</span>
            <h3>Request & chat</h3>
            <p>Compare locals and discuss your trip requirements.</p>
          </article>

          <article>
            <span>03</span>
            <h3>Meet & experience</h3>
            <p>Agree the details and enjoy your local experience.</p>
          </article>
        </div>

      </div>
    </section>


    {/* TRUST & SAFETY - SEPARATE */}
    <section className="hal-home-section hal-home-safety">
      <div className="container">

        <div className="hal-section-heading">
          <div>
            <span className="eyebrow">Trust & Safety</span>
            <h2>Built for person-to-person travel.</h2>
          </div>

          <Link href="/safety">
            Trust & Safety <ArrowRight size={15}/>
          </Link>
        </div>

        <div className="hal-safety-grid">
          <article>
            <ShieldCheck size={25}/>
            <div>
              <h3>Profile review</h3>
              <p>
                Local profiles can be reviewed before becoming visible
                on the marketplace.
              </p>
            </div>
          </article>

          <article>
            <MessageCircle size={25}/>
            <div>
              <h3>Direct requests</h3>
              <p>
                Discuss your requirements with a local before the
                experience.
              </p>
            </div>
          </article>

          <article>
            <Star size={25}/>
            <div>
              <h3>Marketplace reviews</h3>
              <p>
                Completed-booking feedback can help future travelers
                compare profiles.
              </p>
            </div>
          </article>
        </div>

      </div>
    </section>


    {/* TRAVEL GUIDES - SEPARATE */}
    {guides.length ?
       <section className="hal-home-section hal-home-guides">
          <div className="container">

            <div className="hal-section-heading">
              <div>
                <span className="eyebrow">Travel Guides</span>
                <h2>Plan with local context.</h2>
              </div>

              <Link href="/blog">
                View all guides <ArrowRight size={15}/>
              </Link>
            </div>

            <div className="hal-guide-grid">
              {guides.slice(0,4).map(post=>
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="hal-guide-card"
                >
                  {post.image_url ?
                     <img
                        src={post.image_url}
                        alt={post.title}
                        loading="lazy"
                      />
                    : null
                  }

                  <div>
                    <span>{post.category}</span>
                    <h3>{post.title}</h3>
                    <strong>
                      Read guide <ArrowRight size={14}/>
                    </strong>
                  </div>
                </Link>
              )}
            </div>

          </div>
        </section>
      : null
    }


    {/* CTA */}
    <section className="hal-home-cta-section">
      <div className="container hal-home-cta">

        <div>
          <span className="eyebrow">Your trip. Your way.</span>
          <h2>Find someone local who fits your trip.</h2>
        </div>

        <div>
          <Link href="/explore" className="btn">
            Find your local <ArrowRight size={16}/>
          </Link>

          <Link href="/become-a-local" className="btn secondary">
            Become a Local
          </Link>
        </div>

      </div>
    </section>

  </>;
}



