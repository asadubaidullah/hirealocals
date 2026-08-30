import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getBlogPosts, getFeaturedCities } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export const dynamic="force-dynamic";
export const metadata={
  title:"Travel Guides & Local City Advice",
  description:"Practical travel guides for London, New York and other HireALocals cities, with useful planning advice and local-service ideas.",
  alternates:{canonical:"/blog"},
  openGraph:{title:"Travel Guides & Local City Advice | HireALocals",description:"Useful city planning, local perspectives and practical travel advice from HireALocals."}
};

function readableDate(value?:string|null){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return new Intl.DateTimeFormat("en",{day:"numeric",month:"short",year:"numeric"}).format(date);
}

export default async function Page(){
  const [posts,cities]=await Promise.all([getBlogPosts(),getFeaturedCities()]);
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"Blog","@id":`${siteUrl}/blog#blog`,name:"HireALocals Travel Guides",url:`${siteUrl}/blog`,description:"Practical destination guides and local travel advice for HireALocals launch cities.",publisher:{"@id":`${siteUrl}/#organization`},blogPost:posts.slice(0,12).map(p=>({"@type":"BlogPosting",headline:p.title,url:`${siteUrl}/blog/${p.slug}`,datePublished:p.published_at||undefined}))},
    {"@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"HireALocals",item:siteUrl},
      {"@type":"ListItem",position:2,name:"Travel Guides",item:`${siteUrl}/blog`}
    ]}
  ]};

  return <section className="section seo-hub-section">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <div className="container">
      <div className="seo-hub-intro">
        <span className="eyebrow">Travel Guides</span>
        <h1>Useful before you even book.</h1>
        <p className="lead">Straightforward city advice for travelers who would rather understand a place than rush through a checklist. We focus on questions that come up while planning: where a local can genuinely help, what to compare before booking, and how to make limited time in a city count.</p>
      </div>

      {cities.length?<nav className="seo-city-links" aria-label="Popular city guides">
        <span>Start with a city:</span>
        {cities.slice(0,6).map(city=><Link href={`/${city.country_slug}/${city.slug}`} key={city.id}><MapPin size={14}/>{city.name}</Link>)}
      </nav>:null}

      {posts.length?<div className="grid grid-3 seo-blog-grid">{posts.map(p=><Link className="card seo-blog-card" href={`/blog/${p.slug}`} key={p.slug}>
        {p.image_url&&<img src={p.image_url} alt={p.title} loading="lazy"/>}
        <div className="card-body">
          <div className="seo-post-meta"><span className="badge">{p.category}</span>{p.published_at?<time dateTime={p.published_at}>{readableDate(p.published_at)}</time>:null}</div>
          <h2>{p.title}</h2>
          <p className="muted">{p.excerpt}</p>
          <span className="seo-read-link">Read guide <ArrowRight size={15}/></span>
        </div>
      </Link>)}</div>:<div className="empty seo-empty-guides">We are preparing the first travel guides. In the meantime, browse a city page to see the locals and services being added.</div>}
    </div>
  </section>;
}
