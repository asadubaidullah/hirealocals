"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type Post={id:number;slug:string;title:string;excerpt:string;category:string;image_url:string;content:string;meta_title:string;meta_description:string;published:boolean;featured:boolean;published_at?:string};
const empty={slug:"",title:"",excerpt:"",category:"Travel Planning",image_url:"",content:"",meta_title:"",meta_description:"",published:false,featured:false};

function slugify(value:string){return value.toLowerCase().trim().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)}

export default function Page(){
  const[rows,setRows]=useState<Post[]>([]);
  const[selected,setSelected]=useState<number|null>(null);
  const[status,setStatus]=useState("Loading travel guides…");
  const[busy,setBusy]=useState(false);
  async function load(){const r=await authedFetch("/api/admin/blog");const d=await r.json().catch(()=>[]);if(!r.ok)setStatus(d.detail||"Could not load travel guides");else{setRows(d);setStatus("")}}
  useEffect(()=>{load()},[]);
  const item=useMemo(()=>rows.find(x=>x.id===selected)||null,[rows,selected]);
  function payload(f:FormData){return{slug:String(f.get("slug")||""),title:String(f.get("title")||""),excerpt:String(f.get("excerpt")||""),category:String(f.get("category")||"Travel Planning"),image_url:String(f.get("image_url")||""),content:String(f.get("content")||""),meta_title:String(f.get("meta_title")||""),meta_description:String(f.get("meta_description")||""),published:f.get("published")==="on",featured:f.get("featured")==="on"}}
  async function save(e:FormEvent<HTMLFormElement>,id?:number){e.preventDefault();setBusy(true);setStatus(id?"Saving guide…":"Creating guide…");const r=await authedFetch(id?`/api/admin/blog/${id}`:"/api/admin/blog",{method:id?"PATCH":"POST",body:JSON.stringify(payload(new FormData(e.currentTarget)))});const d=await r.json().catch(()=>({}));if(!r.ok)setStatus(d.detail||"Could not save guide");else{setStatus("Travel guide saved.");if(!id)e.currentTarget.reset();await load();if(d.id)setSelected(d.id)}setBusy(false)}
  return <AdminShell eyebrow="Content marketing" title="Travel guide CMS">
    <div className="notice"><strong>Editorial standard:</strong> answer a real traveler question, use details you can stand behind, keep titles descriptive, and link naturally to the relevant city or local page. Avoid filler, copied destination summaries and keyword-stuffed text.</div>
    {status&&<div className="notice">{status}</div>}
    <div className="dashboard-grid-2 cms-admin-grid">
      <div><h3>Articles</h3>{rows.length?<div className="service-manager-list">{rows.map(p=><article className="managed-service" key={p.id}><div><div className="managed-service-title"><h3>{p.title}</h3><span className={`badge ${p.published?"":"badge-neutral"}`}>{p.published?"Published":"Draft"}</span></div><p className="muted">{p.category} · /blog/{p.slug}</p><p>{p.excerpt}</p></div><div className="managed-service-side"><div className="action-row"><button className="mini-btn secondary-mini" onClick={()=>setSelected(p.id)}>Edit</button>{p.published&&<Link href={`/blog/${p.slug}`} className="mini-btn">Open</Link>}</div></div></article>)}</div>:<div className="empty">No posts yet.</div>}</div>
      <aside><h3>{item?"Edit article":"New article"}</h3><div key={item?.id||"new"}><PostForm value={item||empty} busy={busy} onSubmit={e=>save(e,item?.id)} onNew={item?()=>setSelected(null):undefined}/></div></aside>
    </div>
  </AdminShell>;
}

function PostForm({value,busy,onSubmit,onNew}:{value:any;busy:boolean;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;onNew?:()=>void}){
  const[title,setTitle]=useState(value.title||"");
  const[slug,setSlug]=useState(value.slug||"");
  const[excerpt,setExcerpt]=useState(value.excerpt||"");
  const[content,setContent]=useState(value.content||"");
  const[metaTitle,setMetaTitle]=useState(value.meta_title||"");
  const[metaDescription,setMetaDescription]=useState(value.meta_description||"");
  const internalLinks=(content.match(/\]\(\//g)||[]).length;
  const headings=(content.match(/^##+\s+/gm)||[]).length;
  const checks=[
    {label:"Clear page title",ok:title.trim().length>12},
    {label:"Useful excerpt",ok:excerpt.trim().length>60},
    {label:"Descriptive SEO title",ok:(metaTitle||title).trim().length>20},
    {label:"Search snippet written",ok:metaDescription.trim().length>70},
    {label:"Article has clear sections",ok:headings>=2},
    {label:"At least one internal link",ok:internalLinks>=1}
  ];
  const readyCount=checks.filter(x=>x.ok).length;

  return <form className="form-box compact-form" onSubmit={onSubmit}>
    <div className="seo-editorial-panel">
      <div className="seo-editorial-score"><strong>SEO & editorial readiness</strong><span>{readyCount}/{checks.length}</span></div>
      <div className="seo-editorial-checks">{checks.map(check=><span className={check.ok?"is-ready":""} key={check.label}>{check.ok?"✓":"○"} {check.label}</span>)}</div>
      <p>Natural writing wins here: use a real point of view, specific examples you can verify, and useful internal links. There is no required word count.</p>
    </div>

    <div className="form-group"><label>Title</label><input name="title" value={title} onChange={e=>setTitle(e.target.value)} required/><small>{title.length} characters · describe the exact question or trip need.</small></div>
    <div className="form-group"><label>Slug</label><div className="seo-slug-row"><input name="slug" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="first-time-london-tips" required/><button type="button" className="mini-btn secondary-mini" onClick={()=>setSlug(slugify(title))}>From title</button></div><small>Keep it short, readable and stable after publishing.</small></div>
    <div className="form-group"><label>Category</label><input name="category" defaultValue={value.category}/></div>
    <div className="form-group"><label>Excerpt</label><textarea name="excerpt" rows={4} value={excerpt} onChange={e=>setExcerpt(e.target.value)}/><small>{excerpt.length} characters · write this for a traveler, not a crawler.</small></div>
    <div className="form-group"><label>Hero image URL</label><input name="image_url" defaultValue={value.image_url}/></div>
    <div className="form-group"><label>Article content</label><textarea name="content" rows={16} value={content} onChange={e=>setContent(e.target.value)} placeholder={"A direct opening paragraph that answers the question.\n\n## What matters first\nUseful detail and context.\n\n## What a local can help with\nAdd a practical example and link naturally: [explore London locals](/uk/london)\n\n- Useful bullet item"}/><small>Formatting: ## heading, ### subheading, - bullet, [internal link](/uk/london). Current draft: {headings} sections · {internalLinks} internal links.</small></div>
    <div className="form-group"><label>SEO title</label><input name="meta_title" value={metaTitle} onChange={e=>setMetaTitle(e.target.value)} placeholder={title}/><small>{metaTitle.length} characters · concise and descriptive; do not repeat keywords.</small></div>
    <div className="form-group"><label>Meta description</label><textarea name="meta_description" rows={3} value={metaDescription} onChange={e=>setMetaDescription(e.target.value)}/><small>{metaDescription.length} characters · a useful search-result summary, not a sales slogan.</small></div>
    <label className="toggle-line"><input type="checkbox" name="published" defaultChecked={value.published}/> Published</label>
    <label className="toggle-line"><input type="checkbox" name="featured" defaultChecked={value.featured}/> Featured</label>
    <div className="action-row"><button className="btn" disabled={busy}>{busy?"Saving…":"Save article"}</button>{onNew&&<button type="button" className="btn secondary" onClick={onNew}>New article</button>}</div>
  </form>;
}
