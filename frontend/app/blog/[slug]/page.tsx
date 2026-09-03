import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { getBlogPost, getCities } from "@/lib/content";
import { isThingsToDoEligible } from "@/lib/things-to-do";
import { shareImageUrl, siteUrl } from "@/lib/site";

export const dynamic="force-dynamic";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const p=await getBlogPost(slug);
  if(!p)return {};
  return {
    title:p.meta_title||p.title,
    description:p.meta_description||p.excerpt,
    alternates:{canonical:`/blog/${p.slug}`},
    openGraph:{type:"article",url:`/blog/${p.slug}`,title:p.meta_title||p.title,description:p.meta_description||p.excerpt,images:[{url:shareImageUrl({title:p.title,subtitle:p.excerpt,eyebrow:"HIREALOCALS TRAVEL GUIDE",badge:p.category}),width:1200,height:630,alt:p.title}],publishedTime:p.published_at||undefined,modifiedTime:p.updated_at||undefined},
    twitter:{card:"summary_large_image",title:p.meta_title||p.title,description:p.meta_description||p.excerpt,images:[shareImageUrl({title:p.title,subtitle:p.excerpt,eyebrow:"HIREALOCALS TRAVEL GUIDE",badge:p.category})]}
  };
}

function readableDate(value?:string|null){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return new Intl.DateTimeFormat("en",{day:"numeric",month:"long",year:"numeric"}).format(date);
}

function renderInline(text:string,keyPrefix:string):ReactNode[]{
  const nodes:ReactNode[]=[];
  const regex=/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g;
  let last=0;
  let match:RegExpExecArray|null;
  let index=0;
  while((match=regex.exec(text))!==null){
    if(match.index>last)nodes.push(text.slice(last,match.index));
    const label=match[1];
    const href=match[2];
    if(href.startsWith("/"))nodes.push(<Link href={href} key={`${keyPrefix}-link-${index++}`}>{label}</Link>);
    else nodes.push(<a href={href} key={`${keyPrefix}-link-${index++}`} rel="noopener noreferrer">{label}</a>);
    last=regex.lastIndex;
  }
  if(last<text.length)nodes.push(text.slice(last));
  return nodes;
}

function ArticleContent({text}:{text:string}){
  const lines=(text||"").replace(/\r/g,"").split("\n");
  const out:ReactNode[]=[];
  let bullets:string[]=[];
  function flush(){
    if(!bullets.length)return;
    const key=`ul-${out.length}`;
    out.push(<ul key={key}>{bullets.map((b,i)=><li key={i}>{renderInline(b,`${key}-${i}`)}</li>)}</ul>);
    bullets=[];
  }
  lines.forEach((line,i)=>{
    const t=line.trim();
    if(!t){flush();return;}
    if(t.startsWith("- ")){bullets.push(t.slice(2));return;}
    flush();
    if(t.startsWith("## "))out.push(<h2 key={i}>{renderInline(t.slice(3),`h2-${i}`)}</h2>);
    else if(t.startsWith("### "))out.push(<h3 key={i}>{renderInline(t.slice(4),`h3-${i}`)}</h3>);
    else out.push(<p key={i}>{renderInline(t,`p-${i}`)}</p>);
  });
  flush();
  return <>{out}</>;
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const [p,cities]=await Promise.all([getBlogPost(slug),getCities()]);
  if(!p)notFound();

  const haystack=`${p.title} ${p.excerpt} ${p.content||""}`.toLowerCase();
  const relatedCities=cities.filter(c=>haystack.includes(c.name.toLowerCase())).slice(0,4);
  const articleUrl=`${siteUrl}/blog/${p.slug}`;
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"BlogPosting","@id":`${articleUrl}#article`,headline:p.title,description:p.excerpt,image:p.image_url||undefined,datePublished:p.published_at||undefined,dateModified:p.updated_at||p.published_at||undefined,mainEntityOfPage:articleUrl,url:articleUrl,inLanguage:"en",isAccessibleForFree:true,author:{"@id":`${siteUrl}/#organization`},publisher:{"@id":`${siteUrl}/#organization`},isPartOf:{"@id":`${siteUrl}/blog#blog`}},
    {"@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"HireALocals",item:siteUrl},
      {"@type":"ListItem",position:2,name:"Travel Guides",item:`${siteUrl}/blog`},
      {"@type":"ListItem",position:3,name:p.title,item:articleUrl}
    ]}
  ]};

  return <article className="section seo-article-section">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    <div className="container article seo-article">
      <nav className="seo-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/blog">Travel Guides</Link><span>/</span><span aria-current="page">{p.title}</span></nav>
      <div className="seo-article-head">
        <span className="badge">{p.category}</span>
        <h1>{p.title}</h1>
        <p className="lead">{p.excerpt}</p>
        <div className="seo-article-byline"><span>HireALocals Editorial</span>{p.published_at?<><span aria-hidden="true">·</span><time dateTime={p.published_at}>Published {readableDate(p.published_at)}</time></>:null}{p.updated_at&&p.updated_at!==p.published_at?<><span aria-hidden="true">·</span><time dateTime={p.updated_at}>Updated {readableDate(p.updated_at)}</time></>:null}</div>
      </div>
      {p.image_url&&<img className="seo-article-hero" src={p.image_url} alt={p.title}/>}      
      <div className="seo-article-body"><ArticleContent text={p.content||""}/></div>

      {relatedCities.length?<aside className="seo-related-cities" aria-label="Related destinations">
        <div><span className="eyebrow">Continue planning</span><h2>Explore the city behind this guide.</h2><p>See the local profiles, services and practical destination information available on HireALocals.</p></div>
        <div className="seo-related-city-links">{relatedCities.map(city=><Link href={`/${city.country_slug}/${city.slug}`} key={city.id}><MapPin size={15}/><span>{city.name}</span><ArrowRight size={15}/></Link>)}</div>
        {relatedCities.find(c=>isThingsToDoEligible(c.slug)) ? (
          (() => {
            const ttdCity = relatedCities.find(c=>isThingsToDoEligible(c.slug))!;
            return (
              <div className="seo-related-ttd-card">
                <div>
                  <span className="badge">Curated Itinerary</span>
                  <h3>Top Things to Do in {ttdCity.name}</h3>
                  <p>Explore our resident-curated guide to secret spots, food walks, and scenic trails in {ttdCity.name}.</p>
                </div>
                <Link className="btn secondary" href={`/${ttdCity.country_slug}/${ttdCity.slug}/things-to-do`}>
                  View Guide <ArrowRight size={15}/>
                </Link>
              </div>
            );
          })()
        ) : null}
      </aside>:null}

      <div className="seo-article-footer-cta"><div><h2>Prefer help from someone who lives there?</h2><p>Compare local profiles, services, languages and reviews before you send a request.</p></div><Link className="btn" href="/explore">Find a Local <ArrowRight size={16}/></Link></div>
    </div>
  </article>;
}

