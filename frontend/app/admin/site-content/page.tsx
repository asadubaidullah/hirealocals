"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type SiteContent={
  support_email:string;support_phone:string;whatsapp_number:string;
  facebook_url:string;youtube_url:string;linkedin_url:string;instagram_url:string;
  footer_help_title:string;footer_social_title:string;
};

export default function Page(){
  const[data,setData]=useState<SiteContent|null>(null);
  const[status,setStatus]=useState("Loading site content…");
  const[busy,setBusy]=useState(false);

  async function load(){
    const r=await authedFetch("/api/admin/site-content");
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setStatus(d.detail||"Could not load site content");
    else{setData(d);setStatus("")}
  }
  useEffect(()=>{load()},[]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setStatus("Saving site content...");
    const f=new FormData(e.currentTarget);
    const payload={
      support_email:String(f.get("support_email")||"").trim(),
      support_phone:String(f.get("support_phone")||"").trim(),
      whatsapp_number:String(f.get("whatsapp_number")||"").trim(),
      facebook_url:String(f.get("facebook_url")||"").trim(),
      youtube_url:String(f.get("youtube_url")||"").trim(),
      linkedin_url:String(f.get("linkedin_url")||"").trim(),
      instagram_url:String(f.get("instagram_url")||"").trim(),
      footer_help_title:String(f.get("footer_help_title")||"").trim(),
      footer_social_title:String(f.get("footer_social_title")||"").trim()
    };
    const r=await authedFetch("/api/admin/site-content",{method:"PATCH",body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setStatus(d.detail||"Could not save site content");
    else{setData(d);setStatus("Site content saved. Footer updates automatically.");}
    setBusy(false);
  }

  return <AdminShell eyebrow="Public website" title="Site content">
    <div className="notice"><strong>Safe public content:</strong> manage the footer support details and official social links here. Empty phone, WhatsApp or social fields are hidden on the public website, so no dummy contact information is published.</div>
    {status&&<div className="notice">{status}</div>}
    {data&&<form className="form-box site-content-form" onSubmit={save}>
      <div className="site-content-group">
        <div><span className="eyebrow">Support card</span><h3>Need help?</h3><p className="muted">The email is clickable. Call and WhatsApp buttons appear only when you enter real numbers.</p></div>
        <div className="form-grid">
          <div className="form-group"><label>Card heading</label><input name="footer_help_title" defaultValue={data.footer_help_title} placeholder="Need help?"/></div>
          <div className="form-group"><label>Support email</label><input type="email" name="support_email" defaultValue={data.support_email} required/></div>
          <div className="form-group"><label>Phone number</label><input name="support_phone" defaultValue={data.support_phone} placeholder="+1 202 555 0000"/><small>Include country code.</small></div>
          <div className="form-group"><label>WhatsApp number</label><input name="whatsapp_number" defaultValue={data.whatsapp_number} placeholder="+44 7700 900000"/><small>Include country code; spaces are fine.</small></div>
        </div>
      </div>

      <div className="site-content-group">
        <div><span className="eyebrow">Social links</span><h3>Official profiles</h3><p className="muted">Only filled links appear in the footer. Use full https:// URLs.</p></div>
        <div className="form-grid">
          <div className="form-group full"><label>Social heading</label><input name="footer_social_title" defaultValue={data.footer_social_title} placeholder="Follow HireALocals"/></div>
          <div className="form-group"><label>Facebook URL</label><input type="url" name="facebook_url" defaultValue={data.facebook_url} placeholder="https://facebook.com/..."/></div>
          <div className="form-group"><label>YouTube URL</label><input type="url" name="youtube_url" defaultValue={data.youtube_url} placeholder="https://youtube.com/@..."/></div>
          <div className="form-group"><label>LinkedIn URL</label><input type="url" name="linkedin_url" defaultValue={data.linkedin_url} placeholder="https://linkedin.com/company/..."/></div>
          <div className="form-group"><label>Instagram URL</label><input type="url" name="instagram_url" defaultValue={data.instagram_url} placeholder="https://instagram.com/..."/></div>
        </div>
      </div>

      <div className="admin-settings-warning"><strong>Public-only fields</strong><p>This panel stores only support/contact and public social URLs. Passwords, API keys, payment credentials and SMTP credentials are never exposed here.</p></div>
      <button className="btn" disabled={busy}>{busy?"Saving...":"Save site content"}</button>
    </form>}
  </AdminShell>;
}

