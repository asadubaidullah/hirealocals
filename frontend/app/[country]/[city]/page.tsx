import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import LocalCard from "@/components/LocalCard";
import { getBlogPosts, getCity } from "@/lib/content";
import { serverApiUrl, shareImageUrl, siteUrl } from "@/lib/site";

export const dynamic="force-dynamic";

async function getLocals(countryCode:string,citySlug:string){
  try{
    const r=await fetch(`${serverApiUrl}/api/locals`,{cache:'no-store'});
    if(!r.ok)return [];
    const rows=await r.json();
    return rows
      .filter((row:any)=>row.profile?.country_code===countryCode&&row.profile?.city_slug===citySlug)
      .map((row:any)=>{
        const p=row.profile;
        const services=(row.services||[]).filter((s:any)=>s.active!==false);
        return {
          id:p.id,slug:p.slug,name:p.display_name,city:p.city_name,countryCode:p.country_code,
          headline:p.headline,languages:String(p.languages||'').split(',').map((x:string)=>x.trim()).filter(Boolean),
          rating:p.rating,reviews:p.review_count,rate:p.hourly_rate,verified:p.verified,image:p.image_url,
          categories:[...new Set(services.map((s:any)=>s.category))] as string[]
        };
      });
  }catch{return [];}
}

export async function generateMetadata({params}:{params:Promise<{country:string;city:string}>}):Promise<Metadata>{
  const {country,city}=await params;
  const c=await getCity(country,city);
  if(!c)return {};
  return {
    title:c.meta_title||`Hire a Local in ${c.name}`,
    description:c.meta_description||c.description,
    alternates:{canonical:`/${c.country_slug}/${c.slug}`},
    openGraph:{title:c.meta_title||`Hire a Local in ${c.name}`,description:c.meta_description||c.description,images:[{url:shareImageUrl({title:`Hire a local in ${c.name}`,subtitle:c.meta_description||c.description,eyebrow:"EXPLORE WITH SOMEONE WHO LIVES THERE",badge:c.country_name}),width:1200,height:630,alt:`Hire a local in ${c.name}`}]},
    twitter:{card:"summary_large_image",title:c.meta_title||`Hire a Local in ${c.name}`,description:c.meta_description||c.description,images:[shareImageUrl({title:`Hire a local in ${c.name}`,subtitle:c.meta_description||c.description,eyebrow:"EXPLORE WITH SOMEONE WHO LIVES THERE",badge:c.country_name})]}
  };
}

type Insight={title:string;body:string};

function parseInsights(text:string):Insight[]{
  if(!text.trim())return [];
  const lines=text.replace(/\r/g,"").split("\n").map((line)=>line.trim()).filter(Boolean);
  const insights:Insight[]=[];
  let title="";
  let body:string[]=[];

  const push=()=>{
    if(!title&&!body.length)return;
    insights.push({title:title||"Local tips for your visit",body:body.join(" ").trim()});
    title="";
    body=[];
  };

  for(const line of lines){
    if(line.startsWith("## ")){
      push();
      title=line.slice(3).trim();
    }else{
      body.push(line.replace(/^[-*]\s+/,""));
    }
  }
  push();
  return insights.filter((item)=>item.title||item.body);
}

function CityInsights({text,city}:{text:string;city:string}){
  const insights=parseInsights(text);
  if(!insights.length)return null;
  return (
    <section className="section city-insights-section">
      <div className="container city-insights-shell">
        <div className="city-insights-head">
          <span className="eyebrow"><Sparkles size={13}/>Local insight</span>
          <h2>Plan your {city} experience with confidence.</h2>
          <p>Useful context for choosing the right local and shaping a trip around your interests.</p>
        </div>
        <div className="city-insights-grid">
          {insights.map((item,index)=>(
            <article className="city-insight-card" key={`${item.title}-${index}`}>
              <span className="city-insight-index">0{index+1}</span>
              <h3>{item.title}</h3>
              {item.body?<p>{item.body}</p>:null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function CityPage({params}:{params:Promise<{country:string;city:string}>}){
  const {country,city}=await params;
  const c=await getCity(country,city);
  if(!c)notFound();
  const [found,posts]=await Promise.all([getLocals(c.country_code,c.slug),getBlogPosts()]);
  const cityNeedle=c.name.toLowerCase();
  const relatedGuides=posts.filter(p=>`${p.title} ${p.excerpt} ${p.content||""}`.toLowerCase().includes(cityNeedle)).slice(0,3);
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"CollectionPage",name:c.meta_title||`Hire a Local in ${c.name}`,description:c.meta_description||c.description,url:`${siteUrl}/${c.country_slug}/${c.slug}`},
    {"@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"HireALocals",item:siteUrl},
      {"@type":"ListItem",position:2,name:c.country_name,item:`${siteUrl}/${c.country_slug}`},
      {"@type":"ListItem",position:3,name:c.name,item:`${siteUrl}/${c.country_slug}/${c.slug}`}
    ]}
  ]};

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <section className="page-hero city-page-hero"><div className="container"><Link href={`/${c.country_slug}`} className="badge" style={{textDecoration:'none'}}><MapPin size={14}/>{c.country_name}</Link><h1>Hire a local in {c.name}.</h1><p className="lead">{c.description}</p><div className="hero-actions"><Link className="btn" href={`/explore?city=${encodeURIComponent(c.name)}`}>Browse {c.name} locals <ArrowRight size={16}/></Link><Link className="btn secondary" href="/become-a-local">Become a {c.name} local</Link></div></div></section>
    {c.image_url&&<section className="section-sm city-cover-section"><div className="container"><img className="city-cover-image" src={c.image_url} alt={`${c.name} city`}/></div></section>}
    <section className="section city-locals-section"><div className="container"><span className="eyebrow">Locals in {c.name}</span><h2>Choose a person, not just a package.</h2>{found.length?<div className="grid grid-3" style={{marginTop:26}}>{found.map((l:any)=><LocalCard key={l.id} local={l}/>)}</div>:<div className="empty">We are onboarding the first trusted locals in {c.name}. <Link href="/become-a-local" style={{color:'var(--green)',fontWeight:800}}>Apply to be one of them.</Link></div>}</div></section>
    {c.seo_content?<CityInsights text={c.seo_content} city={c.name}/>:null}
    {relatedGuides.length?<section className="section city-guides-section"><div className="container"><div className="city-guides-head"><div><span className="eyebrow">Travel guides for {c.name}</span><h2>Read a little before you decide what to book.</h2></div><Link href="/blog" className="seo-text-link">All travel guides <ArrowRight size={15}/></Link></div><div className="grid grid-3 city-guide-grid">{relatedGuides.map(post=><Link className="card city-guide-card" href={`/blog/${post.slug}`} key={post.id}>{post.image_url?<img src={post.image_url} alt={post.title} loading="lazy"/>:null}<div className="card-body"><span className="badge">{post.category}</span><h3>{post.title}</h3><p className="muted">{post.excerpt}</p><span className="seo-read-link">Read guide <ArrowRight size={15}/></span></div></Link>)}</div></div></section>:null}
    <section className="section city-trust-section"><div className="container"><div className="grid grid-3"><div className="city-trust-card"><h3>Private & flexible</h3><p>Discuss your interests and pace before meeting rather than joining a fixed group route.</p></div><div className="city-trust-card"><h3>Local knowledge</h3><p>Ask practical questions about neighbourhoods, transport, food and what is genuinely worth your time.</p></div><div className="city-trust-card"><h3>Trust first</h3><p>Profiles, reviews and booking history are designed to make choosing a stranger less uncertain.</p></div></div></div></section>
  </>;
}

