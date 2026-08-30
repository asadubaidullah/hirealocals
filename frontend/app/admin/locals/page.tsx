"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

type LocalItem={id:number;slug:string;display_name:string;headline:string;city_name:string;country_code:string;languages:string;hourly_rate:number;rating:number;review_count:number;verified:boolean;image_url:string;email:string;services_count:number};
export default function Page(){
 const [items,setItems]=useState<LocalItem[]>([]); const [status,setStatus]=useState('Loading localsÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦');
 async function load(){try{const r=await authedFetch('/api/admin/locals');if(!r.ok)throw new Error('Could not load locals');setItems(await r.json());setStatus('')}catch(e:any){setStatus(e.message||'Could not load locals')}}
 useEffect(()=>{load()},[]);
 async function verify(id:number,verified:boolean){setStatus('Updating verificationÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦');const r=await authedFetch(`/api/admin/locals/${id}/verification`,{method:'PATCH',body:JSON.stringify({status:verified?'verified':'unverified'})});if(r.ok)await load();else setStatus('Verification update failed')}
 return <AdminShell eyebrow="Admin control center" title="Locals">
   {status&&<div className="notice">{status}</div>}
   <div className="kpis"><div className="kpi"><strong>{items.length}</strong><span className="muted">Total locals</span></div><div className="kpi"><strong>{items.filter(x=>x.verified).length}</strong><span className="muted">Verified</span></div><div className="kpi"><strong>{items.filter(x=>!x.verified).length}</strong><span className="muted">Unverified</span></div><div className="kpi"><strong>{items.filter(x=>x.country_code==='GB').length} / {items.filter(x=>x.country_code==='US').length}</strong><span className="muted">UK / USA</span></div></div>
   <h3 style={{marginTop:28}}>Local profiles</h3>
   {items.length?<div className="table-wrap"><table className="table"><thead><tr><th>Local</th><th>Location</th><th>Rate</th><th>Rating</th><th>Services</th><th>Verification</th><th>Action</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><div className="admin-person"><img src={x.image_url} alt=""/><div><strong>{x.display_name}</strong><div className="muted" style={{fontSize:12}}>{x.email}</div></div></div></td><td>{x.city_name} ({x.country_code})</td><td>${x.hourly_rate}/hr</td><td>{x.rating} ({x.review_count})</td><td>{x.services_count}</td><td><span className={`badge ${x.verified?'':'badge-neutral'}`}>{x.verified?'Verified':'Unverified'}</span></td><td><div className="action-row"><Link className="mini-btn secondary-mini" href={`/admin/uploads?email=${encodeURIComponent(x.email)}`}>Review KYC</Link>{x.verified?<><Link className="mini-btn" href={`/locals/${x.slug}`}>Public profile</Link><button className="mini-btn danger-mini" onClick={()=>verify(x.id,false)}>Unverify</button></>:null}</div></td></tr>)}</tbody></table></div>:<div className="empty">No local profiles found.</div>}
 </AdminShell>
}

