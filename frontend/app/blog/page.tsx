import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getBlogPosts, getCities } from "@/lib/content";

export const dynamic="force-dynamic";

export const metadata:Metadata={
  title:"Travel Guides",
  description:"Practical HireALocals travel guides for UK and US destinations.",
  alternates:{canonical:"/blog"}
};

function readableDate(value?:string|null){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";

  return new Intl.DateTimeFormat(
    "en",
    {day:"numeric",month:"short",year:"numeric"}
  ).format(date);
}

export default async function BlogPage(){
  const [posts,cities]=await Promise.all([
    getBlogPosts(),
    getCities()
  ]);

  const published=posts.filter(post=>post.published!==false);

  return (
    <section className="section seo-hub-section">
      <div className="container">

        <div className="seo-hub-intro">
          <span className="eyebrow">Travel Guides</span>
          <h1>Plan with local context.</h1>
          <p className="lead">
            Practical destination ideas, local perspectives and
            useful trip-planning guides.
          </p>
        </div>

        <div className="seo-city-links">
          <span>Explore destinations</span>

          {cities
            .filter(city=>city.published!==false)
            .slice(0,8)
            .map(city=>
              <Link
                href={`/${city.country_slug}/${city.slug}`}
                key={city.id}
              >
                <MapPin size={13}/>
                {city.name}
              </Link>
            )}
        </div>

        {published.length ?
           <div className="grid grid-3 seo-blog-grid">
              {published.map(post=>
                <Link
                  className="card seo-blog-card"
                  href={`/blog/${post.slug}`}
                  key={post.id}
                >
                  {post.image_url ?
                     <img src={post.image_url} alt={post.title}/>
                    : null
                  }

                  <div className="card-body">
                    <div className="seo-post-meta">
                      <span className="badge">{post.category}</span>

                      {post.published_at ?
                         <time>{readableDate(post.published_at)}</time>
                        : null
                      }
                    </div>

                    <h2>{post.title}</h2>
                    <p className="muted">{post.excerpt}</p>

                    <span className="seo-read-link">
                      Read guide <ArrowRight size={15}/>
                    </span>
                  </div>
                </Link>
              )}
            </div>
          : <div className="empty seo-empty-guides">
              Travel guides will appear here as they are published.
            </div>
        }

      </div>
    </section>
  );
}

