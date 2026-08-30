import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Camera, Compass, Languages, MapPin, Sparkles, Star } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import LocalCard from "@/components/LocalCard";
import { getBlogPosts,getFeaturedCities,getCities,getServiceCategories } from "@/lib/content";
import { serverApiUrl } from "@/lib/site";

export const revalidate=30;
export const metadata: Metadata={
  title:"Hire Trusted Locals for Private Travel Experiences",
  description:"Find trusted locals for private tours, photography, food discoveries, orientation and practical trip help in selected UK and US cities.",
  alternates:{canonical:"/"}
};


async function liveLocals(){
  try{
    const r=await fetch(`${serverApiUrl}/api/locals`,{next:{revalidate:30}});
    if(!r.ok)return[];
    const rows=await r.json();
    return rows.map((row:any)=>{
      const p=row.profile;
      const services=(row.services||[]).filter((s:any)=>s.active!==false);
      return{
        id:p.id,slug:p.slug,name:p.display_name,city:p.city_name,headline:p.headline,
        languages:String(p.languages||'').split(',').map((x:string)=>x.trim()).filter(Boolean),
        rating:p.rating,reviews:p.review_count,rate:p.hourly_rate,verified:p.verified,image:p.image_url,
        categories:[...new Set(services.map((s:any)=>s.category))] as string[]
      };
    });
  }catch{return[];}
}

export default async function Home(){
  const[featured,allCities,categories,locals,guides]=await Promise.all([
    getFeaturedCities(),getCities(),getServiceCategories(),liveLocals(),getBlogPosts()
  ]);
  const cityCards=(featured.length?featured:allCities).slice(0,4);
  const first=locals[0];

  return <>
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="badge"><Sparkles size={14}/>Private, local, personal</span>
          <h1>See the city through <span style={{color:'var(--green)'}}>local eyes.</span></h1>
          <p>Hire trusted locals for private tours, photography, food discoveries, first-day orientation and practical trip help — shaped around you.</p>
          <div className="hero-actions">
            <Link href="/explore" className="btn">Find a local <ArrowRight size={17}/></Link>
            <Link href="/become-a-local" className="btn secondary">Become a Local</Link>
          </div>
          <div className="trust-row"><span>✓ Verified profiles</span><span>✓ Real reviews</span><span>✓ Flexible private experiences</span></div>
          <SearchBar/>
        </div>
        <div className="hero-visual">
          <img className="hero-main" src="https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1200&q=85" alt="Traveler exploring a city with a local"/>
          {first&&<div className="floating-card one"><img className="avatar" src={first.image} alt={first.name}/><div><strong>{first.name} in {first.city}</strong><div className="muted" style={{fontSize:12}}><Star size={12} fill="currentColor" style={{display:'inline'}}/> {first.rating||'New'} · {first.verified?'Verified local':'Local'}</div></div></div>}
          <div className="floating-card two"><BadgeCheck color="#13795b"/><div><strong>Built around trust</strong><div className="muted" style={{fontSize:12}}>Profiles reviewed before going live</div></div></div>
        </div>
      </div>
    </section>

    <section className="section destinations-section">
      <div className="container">
        <span className="eyebrow">Popular destinations</span>
        <div className="section-heading-row">
          <div><h2>Start with a city you love.</h2><p className="lead">Browse active HireALocals destinations and find people who know the city beyond the usual tourist route.</p></div>
          <Link className="btn ghost" href="/explore">See all locals <ArrowRight size={16}/></Link>
        </div>
        <div className="grid grid-4">{cityCards.map(c=><Link key={c.id} href={`/${c.country_slug}/${c.slug}`} className="card city-card"><img src={c.image_url} alt={c.name}/><div className="city-content"><div className="badge" style={{background:'rgba(255,255,255,.9)'}}><MapPin size={13}/>{c.country_name}</div><h3 style={{fontSize:30,marginTop:10}}>{c.name}</h3><div style={{color:'#e4ebe7'}}>{c.tagline}</div></div></Link>)}</div>
      </div>
    </section>

    <section className="section locals-showcase-section">
      <div className="container"><span className="eyebrow">Meet some locals</span><h2>People, not generic packages.</h2><p className="lead">Choose the person whose interests, language, style and availability fit your trip.</p>{locals.length?<div className="grid grid-3" style={{marginTop:28}}>{locals.slice(0,3).map((l:any)=><LocalCard key={l.id} local={l}/>)}</div>:<div className="empty" style={{marginTop:28}}>The first local profiles are being onboarded.</div>}</div>
    </section>

    <section className="section how how-polished">
      <div className="container">
        <div className="how-polished-head">
          <div><span className="eyebrow">How it works</span><h2>Find the right local in three simple steps.</h2></div>
          <p>Choose who fits your trip, agree the details, then enjoy a private experience at your own pace.</p>
        </div>
        <div className="how-steps">
          <article className="how-step"><span className="how-step-num">01</span><h3>Search your city</h3><p>Filter by destination and service to find locals who match what you need.</p></article>
          <article className="how-step"><span className="how-step-num">02</span><h3>Choose your person</h3><p>Compare profiles, reviews, languages, services and pricing before you request.</p></article>
          <article className="how-step"><span className="how-step-num">03</span><h3>Plan it together</h3><p>Confirm the details directly and enjoy a flexible, one-to-one local experience.</p></article>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container"><span className="eyebrow">More than tour guides</span><h2>One local marketplace. Many reasons to use it.</h2><div className="grid grid-4" style={{marginTop:28}}><div className="feature"><Compass className="feature-icon"/><h3>Local guides</h3><p className="muted">Flexible city exploring without a rigid group itinerary.</p></div><div className="feature"><Camera className="feature-icon"/><h3>Photographers</h3><p className="muted">Explore and come home with better photos of the trip.</p></div><div className="feature"><Languages className="feature-icon"/><h3>Interpreters</h3><p className="muted">Practical language support for travelers and business visitors.</p></div><div className="feature"><MapPin className="feature-icon"/><h3>Trip helpers</h3><p className="muted">Orientation, local planning, shopping help and other city-specific support.</p></div></div></div>
    </section>

    {guides.length?<section className="section home-guides-section"><div className="container"><div className="section-heading-row"><div><span className="eyebrow">Travel Guides</span><h2>Plan with context, not just a list.</h2><p className="lead">Read practical city advice before you decide whether you need a guide, photographer, food expert or simply a local who can help you get oriented.</p></div><Link className="btn ghost" href="/blog">Browse all guides <ArrowRight size={16}/></Link></div><div className="grid grid-3 home-guide-grid">{guides.slice(0,3).map(post=><Link className="card home-guide-card" href={`/blog/${post.slug}`} key={post.id}>{post.image_url?<img src={post.image_url} alt={post.title} loading="lazy"/>:null}<div className="card-body"><span className="badge">{post.category}</span><h3>{post.title}</h3><p className="muted">{post.excerpt}</p><span className="seo-read-link">Read guide <ArrowRight size={15}/></span></div></Link>)}</div></div></section>:null}

    <section className="section-sm"><div className="container cta"><div><span className="eyebrow">Live like a local, earn like a local</span><h2>Know your city well?</h2><p className="lead">Turn local knowledge, language skills or creative talent into bookable travel services.</p></div><Link href="/become-a-local" className="btn">Apply to join <ArrowRight size={17}/></Link></div></section>
  </>;
}
