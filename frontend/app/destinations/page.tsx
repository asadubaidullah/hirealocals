import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Sparkles
} from "lucide-react";

import {
  getCities,
  type SeoCity
} from "@/lib/content";

import { cities as fallbackCities } from "@/lib/data";
import SafeImage from "@/components/SafeImage";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Explore HireALocals destinations across the United Kingdom and United States and find local people for private travel experiences.",
  alternates: {
    canonical: "/destinations"
  }
};

const fallbackImage=new Map(
  fallbackCities.map(city=>[
    `${city.countrySlug}/${city.slug}`,
    city.image
  ])
);

fallbackImage.set(
  "uk/birmingham",
  "/images/destinations/birmingham.jpg"
);

fallbackImage.set(
  "uk/liverpool",
  "https://unsplash.com/photos/9iOVb_kfFvw/download?force=true&w=1200"
);


function cityImage(city:SeoCity){
  return (
    city.image_url||
    fallbackImage.get(
      `${city.country_slug}/${city.slug}`
    )||
    ""
  );
}

function countryRank(name:string){
  const value=name.toLowerCase();

  if(value.includes("united kingdom"))return 1;
  if(value.includes("united states"))return 2;

  return 10;
}

export default async function DestinationsPage(){
  const rows=(await getCities())
    .filter(city=>city.published!==false);

  const grouped=rows.reduce<Record<string,SeoCity[]>>(
    (acc,city)=>{
      const name=city.country_name||city.country_code;

      if(!acc[name])acc[name]=[];
      acc[name].push(city);

      return acc;
    },
    {}
  );

  const countries=Object.entries(grouped)
    .sort(
      ([a],[b])=>
        countryRank(a)-countryRank(b)||
        a.localeCompare(b)
    );

  const heroCities=rows
    .filter(city=>cityImage(city))
    .slice(0,3);

  return <div className="market-page destinations-market-page">

    <section className="market-hero destinations-hero">
      <div className="container market-hero-grid">

        <div className="market-hero-copy">
          <span className="eyebrow">Destinations</span>

          <h1>
            Find your
            <br/>
            next city.
          </h1>

          <p className="lead">
            Explore active destinations and discover local people,
            services and practical travel help.
          </p>

          <div className="market-hero-actions">
            <Link href="/explore" className="btn">
              Find a Local
              <ArrowRight size={17}/>
            </Link>
          </div>

          <div className="destination-country-pills">
            {countries.map(([country,cities])=>
              <a
                href={`#${country.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}
                key={country}
              >
                <MapPin size={14}/>
                {country}
                <span>{cities.length}</span>
              </a>
            )}
          </div>
        </div>

        <div className="destination-hero-collage">
          {heroCities.map((city,index)=>{
            const image=cityImage(city);

            return <Link
              href={`/${city.country_slug}/${city.slug}`}
              className={`destination-hero-tile tile-${index+1}`}
              key={city.id}
            >
              <img
                src={image}
                alt={`${city.name}, ${city.country_name}`}
              />

              <span>
                {city.name}
              </span>
            </Link>;
          })}

          {!heroCities.length&&
            <div className="destination-hero-empty">
              <Sparkles size={28}/>
              <strong>
                New destinations are being added.
              </strong>
            </div>
          }
        </div>

      </div>
    </section>


    <section className="section destination-directory-section">
      <div className="container">

        {countries.length ?
           countries.map(([country,cities])=>{
              const id=country
                .toLowerCase()
                .replace(/[^a-z0-9]+/g,"-");

              return <section
                className="destination-country-block"
                id={id}
                key={country}
              >

                <div className="destination-country-head">
                  <div>
                    <span className="eyebrow">
                      {cities[0]?.country_code||"Explore"}
                    </span>

                    <h2>{country}</h2>
                  </div>

                  <span>
                    {cities.length}
                    {" "}
                    {cities.length===1
                      ?"destination"
                      :"destinations"
                    }
                  </span>
                </div>

                <div className="destination-card-grid">
                  {cities.map(city=>{
                    const image=cityImage(city);

                    return <Link
                      href={`/${city.country_slug}/${city.slug}`}
                      className="destination-market-card"
                      key={city.id}
                    >
                      <div className="destination-market-image">
                        {image ?
                           <SafeImage
                              src={image}
                              fallbackSrc={fallbackImage.get(`${city.country_slug}/${city.slug}`)}
                              alt={`${city.name}, ${country}`}
                            />
                          : <div className="destination-image-missing">
                              <MapPin size={25}/>
                              <span>
                                Image coming soon
                              </span>
                            </div>
                        }

                        <span className="destination-country-badge">
                          {country}
                        </span>
                      </div>

                      <div className="destination-market-copy">
                        <div>
                          <h3>{city.name}</h3>
                          <p>
                            {city.tagline||
                             `Explore ${city.name} with local context.`}
                          </p>
                        </div>

                        <ArrowRight size={18}/>
                      </div>
                    </Link>;
                  })}
                </div>

              </section>;
            })
          : <div className="empty">
              Destinations are temporarily unavailable.
            </div>
        }

      </div>
    </section>

  </div>;
}
