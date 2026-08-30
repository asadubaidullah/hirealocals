"use client";
import { useEffect,useState } from "react";
import { authedFetch } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

type ReviewItem={id:number;rating:number;title:string;comment:string;created_at:string;local_name:string;tourist_name:string;booking_id:number;moderation_status:string};
export default function Page(){
 const [items,setItems]=useState<ReviewItem[]>([]); const [status,setStatus]=useState('Loading reviews…');
 async function load(){try{const r=await authedFetch('/api/admin/reviews');if(!r.ok)throw new Error('Could not load reviews');setItems(await r.json());setStatus('')}catch(e:any){setStatus(e.message||'Could not load reviews')}} useEffect(()=>{load()},[]);
 async function moderate(id:number,next:string){setStatus('Updating review…');const r=await authedFetch(`/api/admin/reviews/${id}/moderation`,{method:'PATCH',body:JSON.stringify({status:next})});const d=await r.json().catch(()=>({}));if(!r.ok)setStatus(d.detail||'Could not update review');else await load()}
 const avg=items.length?items.reduce((n,x)=>n+x.rating,0)/items.length:0;
 return <AdminShell eyebrow="Admin control center" title="Reviews">
   {status&&<div className="notice">{status}</div>}
   <div className="kpis"><div className="kpi"><strong>{items.length}</strong><span className="muted">Total reviews</span></div><div className="kpi"><strong>{avg.toFixed(1)}</strong><span className="muted">Average rating</span></div><div className="kpi"><strong>{items.filter(x=>x.moderation_status==='visible').length}</strong><span className="muted">Visible</span></div><div className="kpi"><strong>{items.filter(x=>x.moderation_status!=='visible').length}</strong><span className="muted">Moderation queue</span></div></div>
   <h3 style={{marginTop:28}}>Customer reviews</h3>
   {items.length?<div className="table-wrap"><table className="table"><thead><tr><th>Rating</th><th>Traveler</th><th>Local</th><th>Review</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>★ {x.rating}/5</strong><div className="muted admin-cell-note">Booking #{x.booking_id}</div></td><td>{x.tourist_name}</td><td>{x.local_name}</td><td><strong>{x.title||'Review'}</strong><div className="muted admin-cell-note admin-review-text">{x.comment}</div></td><td><span className={`badge ${x.moderation_status==='visible'?'':'badge-neutral'}`}>{x.moderation_status}</span></td><td><div className="action-row"><button className="mini-btn" onClick={()=>moderate(x.id,'visible')}>Show</button><button className="mini-btn secondary-mini" onClick={()=>moderate(x.id,'flagged')}>Flag</button><button className="mini-btn danger-mini" onClick={()=>moderate(x.id,'hidden')}>Hide</button></div></td></tr>)}</tbody></table></div>:<div className="empty">No reviews yet. Reviews will appear after completed bookings.</div>}
 </AdminShell>
}

