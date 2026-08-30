"use client";
import { useEffect,useMemo,useState } from "react";
import AdminShell from "@/components/AdminShell";
import { authedFetch } from "@/lib/api";

type Check={code:string;label:string;ok:boolean;detail:string;level:string};
type Task={id:number;key:string;label:string;category:string;required:boolean;done:boolean;note:string;updated_at:string};
type Data={release:string;score:number;ready:boolean;blockers:string[];automatic_checks:Check[];manual_tasks:Task[]};

export default function Page(){
  const [data,setData]=useState<Data|null>(null);const [status,setStatus]=useState("Loading launch checks…");const [busy,setBusy]=useState("");
  async function load(){const r=await authedFetch('/api/admin/launch-control');const d=await r.json().catch(()=>({}));if(!r.ok){setStatus(d.detail||'Could not load launch control');return}setData(d);setStatus('')}
  useEffect(()=>{load()},[]);
  async function saveTask(task:Task,done=task.done,note=task.note){setBusy(task.key);const r=await authedFetch(`/api/admin/launch-control/tasks/${task.key}`,{method:'PATCH',body:JSON.stringify({done,note})});const d=await r.json().catch(()=>({}));if(!r.ok){setStatus(d.detail||'Could not update launch task')}await load();setBusy('')}
  function editNote(key:string,note:string){setData(old=>old?{...old,manual_tasks:old.manual_tasks.map(t=>t.key===key?{...t,note}:t)}:old)}
  const requiredFail=useMemo(()=>data?.automatic_checks.filter(x=>x.level==='required'&&!x.ok).length||0,[data]);
  if(!data)return <AdminShell eyebrow="Release readiness" title="Launch control"><div className="notice">{status}</div></AdminShell>;
  return <AdminShell eyebrow="Release readiness" title="Launch control">
    {status&&<div className="notice">{status}</div>}
    <div className="form-box launch-score"><div className={`launch-score-ring ${data.ready?'ready':''}`}>{data.score}%</div><div><h3 style={{marginBottom:4}}>Release {data.release}</h3><strong>{data.ready?'All required checks are complete':'Launch blockers remain'}</strong><p className="muted" style={{marginBottom:0}}>{requiredFail} automatic blocker(s) · {data.manual_tasks.filter(t=>t.required&&!t.done).length} manual task(s) open.</p></div></div>
    {!data.ready&&<div className="notice error"><strong>Do not treat this as production-ready yet.</strong><ul>{data.blockers.slice(0,12).map(x=><li key={x}>{x}</li>)}</ul></div>}
    <div className="admin-toolbar"><div><h3>Automatic checks</h3><p className="muted small-text">These are calculated from configuration and live marketplace data.</p></div><button className="btn secondary" onClick={load}>Refresh</button></div>
    <div className="launch-check-grid">{data.automatic_checks.map(c=><div key={c.code} className={`launch-check ${c.ok?'ok':'fail'}`}><strong>{c.ok?'✓':'!'} {c.label}</strong><span className="muted small-text">{c.detail}</span>{c.level==='recommended'&&<div><span className="badge badge-neutral" style={{marginTop:8}}>Recommended</span></div>}</div>)}</div>
    <div className="form-box" style={{marginTop:24}}><h3>Manual release checklist</h3><p className="muted">Tick a task only after it has actually been tested or reviewed. Notes are kept for the launch record.</p>{data.manual_tasks.map(task=><div className="launch-task" key={task.key}><input type="checkbox" checked={task.done} disabled={busy===task.key} onChange={e=>saveTask(task,e.target.checked,task.note)}/><div><div className="dash-title-row"><div><strong>{task.label}</strong><div className="muted small-text">{task.category}{task.required?' · required':' · optional'}</div></div><span className={`badge ${task.done?'payment-paid':'badge-neutral'}`}>{task.done?'Done':'Open'}</span></div><textarea value={task.note||''} onChange={e=>editNote(task.key,e.target.value)} placeholder="Test result, reviewer, date, or deployment note…"/><button className="btn secondary" style={{marginTop:8}} disabled={busy===task.key} onClick={()=>saveTask(task,task.done,task.note)}>{busy===task.key?'Saving…':'Save note'}</button></div></div>)}</div>
    <div className="notice" style={{marginTop:20}}>Policy version checks intentionally stay blocked while <code>TERMS_VERSION</code>, <code>PRIVACY_VERSION</code> or <code>BOOKING_POLICY_VERSION</code> are set to <code>draft</code>. Change them only after the matching published text is finalized.</div>
  </AdminShell>
}

