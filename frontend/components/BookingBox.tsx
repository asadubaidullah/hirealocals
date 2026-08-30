"use client";
import { useEffect,useMemo,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authedFetch } from "@/lib/api";
import { apiUrl } from "@/lib/site";
import { getRole, getToken } from "@/lib/auth";

function todayInput(){
  const now=new Date();
  const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

export default function BookingBox({local}:{local:any}){
  const router=useRouter();
  const [hours,setHours]=useState(2);
  const [date,setDate]=useState("");
  const [time,setTime]=useState("");
  const [guests,setGuests]=useState(1);
  const [slots,setSlots]=useState<string[]>([]);
  const [slotStatus,setSlotStatus]=useState("");
  const [schedule,setSchedule]=useState<any>(null);
  const [serviceId,setServiceId]=useState<number>(local.services?.[0]?.id||0);
  const [message,setMessage]=useState("");
  const [meetingPoint,setMeetingPoint]=useState("");
  const [meetingAddress,setMeetingAddress]=useState("");
  const [meetingInstructions,setMeetingInstructions]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const [feePercent,setFeePercent]=useState(12);
  const [marketplaceMode,setMarketplaceMode]=useState("open");
  const [acceptPolicy,setAcceptPolicy]=useState(false);

  useEffect(()=>{
    const params=
      new URLSearchParams(
        window.location.search
      );

    const requestedDate=
      params.get("date")||"";

    if(
      /^\d{4}-\d{2}-\d{2}$/.test(
        requestedDate
      )&&
      requestedDate>=todayInput()
    ){
      setDate(requestedDate);
    }

    const requestedGuests=
      Number(
        params.get("guests")||"1"
      );

    if(
      Number.isFinite(
        requestedGuests
      )
    ){
      setGuests(
        Math.min(
          6,
          Math.max(
            1,
            Math.trunc(
              requestedGuests
            )
          )
        )
      );
    }

    const requestedService=
      (
        params.get("service")||
        ""
      )
        .trim()
        .toLowerCase();

    if(
      requestedService&&
      Array.isArray(
        local.services
      )
    ){
      const match=
        local.services.find(
          (service:any)=>{
            const category=
              String(
                service.category||
                ""
              )
                .trim()
                .toLowerCase();

            const title=
              String(
                service.title||
                ""
              )
                .trim()
                .toLowerCase();

            return (
              category===
                requestedService||
              title===
                requestedService||
              category.includes(
                requestedService
              )||
              title.includes(
                requestedService
              )
            );
          }
        );

      if(match?.id){
        setServiceId(
          Number(match.id)
        );
      }
    }
  },[local.services]);

  useEffect(()=>{(async()=>{try{const r=await fetch(`${apiUrl}/api/marketplace/config`);if(r.ok){const d=await r.json();setFeePercent(Number(d.platform_fee_percent)||12);setMarketplaceMode(d.marketplace_mode||"open")}}catch{}})()},[]);
  const selectedService=useMemo(()=>local.services?.find((s:any)=>s.id===serviceId),[local.services,serviceId]);
  const bookingHours=Number(selectedService?.duration||hours);
  const subtotal=Number(selectedService?.price??(local.rate*hours));
  const fee=Math.round(subtotal*(feePercent/100)*100)/100;

  useEffect(()=>{
    if(!date){setSlots([]);setTime("");setSchedule(null);setSlotStatus("");return}
    let cancelled=false;
    (async()=>{
      setSlotStatus("Checking live availability...");
      try{
        const q=new URLSearchParams({booking_date:date,hours:String(bookingHours)});
        if(serviceId)q.set("service_id",String(serviceId));
        const r=await fetch(`${apiUrl}/api/locals/${local.id}/available-slots?${q.toString()}`,{cache:"no-store"});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.detail||"Could not check availability");
        if(cancelled)return;
        setSlots(d.slots||[]);setSchedule(d.schedule||null);
        setTime((current)=>(d.slots||[]).includes(current)?current:((d.slots||[])[0]||""));
        setSlotStatus((d.slots||[]).length?`${d.slots.length} start times available`:(d.schedule?.note||"No available time fits this booking on that date."));
      }catch(e:any){if(!cancelled){setSlots([]);setTime("");setSchedule(null);setSlotStatus(e.message||"Could not check availability")}}
    })();
    return()=>{cancelled=true};
  },[date,bookingHours,serviceId,local.id]);

  async function requestBooking(){
    if(!getToken()){
      const returnTo=
        `${window.location.pathname}${window.location.search}`;

      router.push(
        `/login?next=${encodeURIComponent(returnTo)}`
      );

      return;
    }
    const role=getRole();
    if(role!=="tourist"&&role!=="admin"){setStatus("Please use a traveler account to request a booking.");return}
    if(marketplaceMode==="paused"){setStatus("New bookings are temporarily paused.");return}
    if(!date){setStatus("Please choose a booking date first.");return}
    if(!time){setStatus("No valid start time is available. Choose another date or duration.");return}
    if(!acceptPolicy){setStatus("Please accept the booking, cancellation and refund policy before sending the request.");return}
    setBusy(true);setStatus("Sending booking request...");
    try{
      const r=await authedFetch('/api/bookings',{method:'POST',body:JSON.stringify({
        local_profile_id:local.id,service_id:serviceId||null,booking_date:date,start_time:time,guests,hours:bookingHours,message,
        meeting_point_name:meetingPoint,meeting_address:meetingAddress,meeting_instructions:meetingInstructions,accept_booking_terms:acceptPolicy
      })});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.detail||'Booking request failed');
      setStatus(`Request #${data.id} sent successfully. Opening your booking...`);
      setTimeout(()=>router.push(`/dashboard/bookings/${data.id}`),650);
    }catch(e:any){setStatus(e.message||'Could not send booking request')}finally{setBusy(false)}
  }

  return <div className="booking-box sticky">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><div><strong style={{fontSize:28}}>${local.rate}</strong> <span className="muted">/ hour</span></div><span className="rating">&#9733; {local.rating}</span></div>
    <div className="divider"/>
    {local.services?.length>0&&<div className="form-group"><label>Service</label><select value={serviceId} onChange={e=>setServiceId(Number(e.target.value))}>{local.services.map((s:any)=><option value={s.id} key={s.id}>{s.title}</option>)}</select>{selectedService&&<span className="muted" style={{fontSize:12}}>Fixed service: ${selectedService.price} &middot; {selectedService.duration} hr</span>}</div>}
    <div className="form-group" style={{marginTop:12}}><label>Date</label><input className="form-control" value={date} min={todayInput()} onChange={e=>setDate(e.target.value)} type="date"/></div>
    <div className="form-grid" style={{marginTop:12}}><div className="form-group"><label>Available start time</label><select value={time} disabled={!slots.length} onChange={e=>setTime(e.target.value)}><option value="">{date?(slots.length?'Select time':'No slots available'):'Choose date first'}</option>{slots.map(slot=><option key={slot} value={slot}>{slot}</option>)}</select></div><div className="form-group"><label>{selectedService?'Duration':'Hours'}</label>{selectedService?<div className="booking-duration-readonly">{selectedService.duration} hours</div>:<select value={hours} onChange={e=>setHours(Number(e.target.value))}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>}</div></div>
    {date&&<div className={`availability-live-note ${slots.length?'ok':'warn'}`}><strong>{slotStatus}</strong>{schedule?.enabled&&<span>{schedule.start_time}-{schedule.end_time} &middot; {schedule.source==='date_override'?'special date schedule':'local weekly schedule'}</span>}</div>}
    <div className="form-group" style={{marginTop:12}}>
      <label htmlFor="booking-guests">Guests</label>

      <select
        id="booking-guests"
        value={guests}
        onChange={e=>setGuests(Number(e.target.value))}
      >
        <option value="1">1 guest</option>
        <option value="2">2 guests</option>
        <option value="3">3 guests</option>
        <option value="4">4 guests</option>
        <option value="5">5 guests</option>
        <option value="6">6 guests</option>
      </select>
    </div>

    <div className="divider"/>
    <div className="form-group"><label>Meeting area / pickup point <span className="muted">(optional)</span></label><input value={meetingPoint} onChange={e=>setMeetingPoint(e.target.value)} placeholder="e.g. Hotel lobby, Trafalgar Square"/></div>
    <div className="form-group" style={{marginTop:10}}><label>Address <span className="muted">(optional)</span></label><input value={meetingAddress} onChange={e=>setMeetingAddress(e.target.value)} placeholder="Street address or landmark"/></div>
    <div className="form-group" style={{marginTop:10}}><label>Meeting instructions <span className="muted">(optional)</span></label><textarea value={meetingInstructions} onChange={e=>setMeetingInstructions(e.target.value)} rows={2} placeholder="Where exactly should you meet?"/></div>
    <div className="form-group" style={{marginTop:12}}><label>Message to local <span className="muted">(optional)</span></label><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} placeholder="Tell the local what you want to explore"/></div>
    <div className="divider"/><div style={{display:'flex',justifyContent:'space-between'}}><span>{selectedService?'Service price':'Local time'}</span><span>${subtotal.toFixed(2)}</span></div><div style={{display:'flex',justifyContent:'space-between',marginTop:8}}><span>Platform fee ({feePercent}%)</span><span>${fee.toFixed(2)}</span></div><div style={{display:'flex',justifyContent:'space-between',fontWeight:900,marginTop:14}}><span>Estimated total</span><span>${(subtotal+fee).toFixed(2)}</span></div>
    <label className="policy-check compact-policy"><input type="checkbox" checked={acceptPolicy} onChange={e=>setAcceptPolicy(e.target.checked)}/><span>I accept the <Link href="/terms" target="_blank">booking terms</Link>, including the published cancellation/refund rules.</span></label>
    <button type="button" className="btn" disabled={busy||!time||!acceptPolicy} onClick={requestBooking} style={{width:'100%',marginTop:16,opacity:(busy||!time||!acceptPolicy)?.65:1}}>{busy?'Sending...':'Request booking'}</button>
    {status&&<div className="notice" style={{marginTop:12}}>{status}</div>}
    <p className="muted" style={{fontSize:12,textAlign:'center'}}>Availability is checked live and overlapping pending/confirmed bookings are blocked. No payment is taken when you send this request. If online payments are enabled, checkout is offered after the Local confirms.</p>
  </div>
}

