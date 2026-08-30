"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { authedFetch } from "@/lib/api";
import AdminShell from "@/components/AdminShell";

type Payment={status:string;required:boolean;currency:string;provider:string;mode:string};
type BookingItem={id:number;booking_date:string;start_time:string;guests:number;hours:number;subtotal:number;platform_fee:number;status:string;created_at:string;local_name:string;tourist_name:string;tourist_email:string;service_title:string|null;payment:Payment};
export default function Page(){
 const [items,setItems]=useState<BookingItem[]>([]); const [status,setStatus]=useState('Loading bookings…'); const [filter,setFilter]=useState('all');
 async function load(){try{const r=await authedFetch('/api/admin/bookings');if(!r.ok)throw new Error('Could not load bookings');setItems(await r.json());setStatus('')}catch(e:any){setStatus(e.message||'Could not load bookings')}}
 useEffect(()=>{load()},[]);
 async function update(id:number,next:string){setStatus('Updating booking…');const r=await authedFetch(`/api/admin/bookings/${id}`,{method:'PATCH',body:JSON.stringify({status:next})});if(r.ok)await load();else{const d=await r.json().catch(()=>({}));setStatus(d.detail||'Update failed')}}
 const shown=filter==='all'?items:items.filter(x=>x.status===filter); const fee=items.filter(x=>x.status!=='cancelled'&&x.status!=='rejected').reduce((n,x)=>n+x.platform_fee,0);
 return <AdminShell eyebrow="Admin control center" title="Bookings">
   {status&&<div className="notice">{status}</div>}
   <div className="kpis"><div className="kpi"><strong>{items.length}</strong><span className="muted">Total bookings</span></div><div className="kpi"><strong>{items.filter(x=>x.status==='pending').length}</strong><span className="muted">Pending</span></div><div className="kpi"><strong>{items.filter(x=>x.status==='completed').length}</strong><span className="muted">Completed</span></div><div className="kpi"><strong>${fee.toFixed(2)}</strong><span className="muted">Booked platform fees</span></div></div>
   <div className="admin-toolbar"><h3>Booking requests</h3><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="rejected">Rejected</option></select></div>
   {shown.length?<div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Traveler</th><th>Local / Service</th><th>Schedule</th><th>Value</th><th>Booking</th><th>Payment</th><th>Action</th></tr></thead><tbody>{shown.map(x=>{const ps=x.payment?.status||'manual';const completionBlocked=Boolean(x.payment?.required&&ps!=='paid');return <tr key={x.id}><td><Link className="admin-text-link" href={`/admin/bookings/${x.id}`}>#{x.id}</Link></td><td><strong>{x.tourist_name}</strong><div className="muted admin-cell-note">{x.tourist_email}</div></td><td><strong>{x.local_name}</strong><div className="muted admin-cell-note">{x.service_title||'General local booking'}</div></td><td>{x.booking_date} · {x.start_time}<div className="muted admin-cell-note">{x.hours} hr · {x.guests} guest(s)</div></td><td>${(x.subtotal+x.platform_fee).toFixed(2)}<div className="muted admin-cell-note">Fee ${x.platform_fee.toFixed(2)}</div></td><td><span className={`badge status-${x.status}`}>{x.status}</span></td><td><span className={`badge payment-${ps}`}>{ps.replaceAll('_',' ')}</span></td><td><div className="action-row"><Link className="mini-btn secondary-mini" href={`/admin/bookings/${x.id}`}>View</Link><button className="mini-btn" onClick={()=>update(x.id,'confirmed')}>Confirm</button><button className="mini-btn secondary-mini" disabled={completionBlocked} title={completionBlocked?'Payment must be paid first':''} onClick={()=>update(x.id,'completed')}>Complete</button><button className="mini-btn danger-mini" onClick={()=>update(x.id,'cancelled')}>Cancel</button></div></td></tr>})}</tbody></table></div>:<div className="empty">No bookings match this filter.</div>}
 </AdminShell>
}

