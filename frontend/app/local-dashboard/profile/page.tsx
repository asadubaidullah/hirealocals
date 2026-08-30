/* HIREALOCALS LOCAL KYC REQUIRED R1 */
"use client";
import TwoFactorCard from "@/components/TwoFactorCard";
import EmailVerificationCard from "@/components/EmailVerificationCard";
import DiditKycCard from "@/components/DiditKycCard";
import Link from "next/link";
import { FormEvent,useEffect,useState } from "react";
import { authedFetch } from "@/lib/api";
type Profile={slug:string;display_name:string;headline:string;bio:string;country_code:string;city_name:string;city_slug:string;languages:string;hourly_rate:number;image_url:string;response_time:string;years_local:number;verified:boolean};
type UploadItem={id:number;kind:string;original_name:string;status:string;created_at:string};
export default function Page(){
 const [p,setP]=useState<Profile|null>(null);const [email,setEmail]=useState('');const [status,setStatus]=useState('Loading profileâ€¦');const [uploads,setUploads]=useState<UploadItem[]>([]);const [uploading,setUploading]=useState('');
 async function load(){const r=await authedFetch('/api/local/profile');if(r.ok){const d=await r.json();setP(d.profile);setEmail(d.email);setStatus('')}else setStatus('Could not load profile');const u=await authedFetch('/api/local/uploads');if(u.ok)setUploads(await u.json())}
 useEffect(()=>{load()},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setStatus('Saving profileâ€¦');const f=new FormData(e.currentTarget);const city=String(f.get('city_name')||'').trim();const payload={display_name:f.get('display_name'),headline:f.get('headline'),bio:f.get('bio'),country_code:f.get('country_code'),city_name:city,city_slug:city.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),languages:f.get('languages'),hourly_rate:Number(f.get('hourly_rate')), response_time:f.get('response_time'),years_local:Number(f.get('years_local'))};const r=await authedFetch('/api/local/profile',{method:'PATCH',body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok){setStatus(d.detail||'Could not save profile');return}setP(d);setStatus('Profile saved.')}
 async function uploadPhoto(file?:File){if(!file)return;setUploading('photo');const f=new FormData();f.append('file',file);const r=await authedFetch('/api/uploads/profile-image',{method:'POST',body:f});const d=await r.json().catch(()=>({}));if(!r.ok)setStatus(d.detail||'Photo upload failed');else{setStatus('Profile photo uploaded.');await load()}setUploading('')}
 async function uploadDocument(file?:File){if(!file)return;setUploading('document');const f=new FormData();f.append('file',file);const r=await authedFetch('/api/local/verification-document',{method:'POST',body:f});const d=await r.json().catch(()=>({}));if(!r.ok)setStatus(d.detail||'Document upload failed');else{setStatus('Verification document uploaded for admin review.');await load()}setUploading('')}
 if(!p)return <><span className="eyebrow">Local workspace</span><h2>Profile</h2><div className="notice">{status}</div></>;
 const docs=uploads.filter(x=>x.kind==='verification_document');
 const kycApproved=p.verified;
 return <><span className="eyebrow">Local workspace</span><div className="dash-title-row"><div><h2>Public profile</h2><p className="muted">Manage listing details, profile image and verification documents.</p></div>{kycApproved
      ? <Link
          className="btn secondary"
          href={`/locals/${p.slug}`}
        >
          Preview profile
        </Link>

      : <span
          className="btn secondary kyc-preview-disabled"
          aria-disabled="true"
          title="KYC approval required"
        >
          Approval required
        </span>
    }</div><EmailVerificationCard/>

    <div
      className={`local-kyc-status ${
        kycApproved
          ? "approved"

          : docs.some(
              x=>x.status==="pending"
            )
            ? "pending"

            : docs.some(
                x=>x.status==="rejected"
              )
              ? "rejected"

              : "required"
      }`}
    >

      <span
        className="local-kyc-status-icon"
        aria-hidden="true"
      >
        {kycApproved ? "\u2713" : "!"}
      </span>

      <div>

        <strong>
          {kycApproved
            ? "Identity verified"

            : docs.some(
                x=>x.status==="pending"
              )
              ? "KYC review in progress"

              : docs.some(
                  x=>x.status==="rejected"
                )
                ? "KYC document needs attention"

                : "KYC verification required"
          }
        </strong>

        <p>
          {kycApproved
            ? "Your identity has been approved and your Local profile is eligible for the marketplace."

            : "For traveler safety, your Local profile remains on marketplace hold until an administrator approves your KYC document."
          }
        </p>

      </div>

    </div>

    {status&&
      <div className="notice">
        {status}
      </div>
    }<div className="profile-editor-grid"><div><div className="form-box upload-control-card"><h3>Profile image</h3><p className="muted">Upload a real JPG, PNG or WebP photo up to 5 MB from your device. External profile-photo URLs are not allowed.</p><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadPhoto(e.target.files?.[0])}/>{uploading==='photo'&&<small>Uploading photoâ€¦</small>}</div><form className="form-box" onSubmit={submit}><div className="form-grid"><div className="form-group"><label>Display name</label><input name="display_name" defaultValue={p.display_name} required/></div><div className="form-group"><label>Account email</label><input value={email} disabled/></div><div className="form-group full"><label>Headline</label><input name="headline" defaultValue={p.headline} required/></div><div className="form-group"><label>Country</label><select name="country_code" defaultValue={p.country_code}><option value="GB">United Kingdom</option><option value="US">United States</option></select></div><div className="form-group"><label>City</label><input name="city_name" defaultValue={p.city_name} required/></div><div className="form-group"><label>Languages</label><input name="languages" defaultValue={p.languages} required/></div><div className="form-group"><label>Base hourly rate ($)</label><input name="hourly_rate" type="number" min="5" step="1" defaultValue={p.hourly_rate} required/></div><div className="form-group"><label>Years local</label><input name="years_local" type="number" min="0" max="100" defaultValue={p.years_local}/></div><div className="form-group"><label>Typical response time</label><input name="response_time" defaultValue={p.response_time}/></div><div className="form-group full"><label>About you</label><textarea name="bio" rows={8} defaultValue={p.bio} required/></div></div><button className="btn">Save profile</button></form><DiditKycCard verified={kycApproved}/><div className="form-box verification-upload-card"><div className="dash-title-row"><div><h3>Manual verification fallback</h3><p className="muted">Use this only if automatic verification is unavailable or you have been asked to provide a document for manual review. Files remain private and are visible only to authorized admins.</p></div><span className={`badge ${kycApproved?'':'badge-neutral'}`}>{kycApproved?'Verified':'Not verified'}</span></div><input type="file" disabled={kycApproved} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>uploadDocument(e.target.files?.[0])}/>{uploading==='document'&&<small>Uploading documentâ€¦</small>}{docs.length>0&&<div className="verification-history">{docs.map(x=><div key={x.id}><span>{x.original_name}</span><strong className="badge">{x.status}</strong><small>{new Date(x.created_at).toLocaleDateString()}</small></div>)}</div>}</div></div><aside className="profile-editor-preview"><img src={p.image_url} alt="Profile preview"/><span className={`badge ${kycApproved?'':'badge-neutral'}`}>{kycApproved?'Verified local':'Not yet verified'}</span><h3>{p.display_name}</h3><p>{p.headline}</p><p className="muted">{p.city_name} Â· {p.languages}</p><strong>${p.hourly_rate}/hr</strong></aside></div><TwoFactorCard/></>}
