/* HIREALOCALS NOTIFICATIONS PRO V2 */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/api";

type Item={id:number;kind:string;title:string;body:string;link:string;read_at:string|null;created_at:string};
export default function NotificationCenter({embedded=false}:{embedded?:boolean}){
  const [items,setItems]=useState<Item[]>([]); const [status,setStatus]=useState("Loading notifications…"); const [busy,setBusy]=useState(false);
  async function load(){const r=await authedFetch('/api/notifications');const d=await r.json().catch(()=>[]);if(!r.ok)setStatus(d.detail||'Could not load notifications');else{setItems(d);setStatus('')}}
  useEffect(()=>{load()},[]);
  async function mark(id:number){await authedFetch(`/api/notifications/${id}/read`,{method:'PATCH'});setItems(v=>v.map(x=>x.id===id?{...x,read_at:new Date().toISOString()}:x))}
  async function all(){setBusy(true);await authedFetch('/api/notifications/read-all',{method:'POST'});await load();setBusy(false)}
  const unread=items.filter(x=>!x.read_at).length;

  function notificationTime(
    value:string
  ){

    const date =
      new Date(value);

    const now =
      new Date();


    if(
      date.toDateString() ===
      now.toDateString()
    ){

      return date.toLocaleTimeString(
        [],
        {
          hour:"numeric",
          minute:"2-digit",
        }
      );
    }


    const yesterday =
      new Date(now);

    yesterday.setDate(
      now.getDate() - 1
    );


    if(
      date.toDateString() ===
      yesterday.toDateString()
    ){

      return "Yesterday";
    }


    return date.toLocaleDateString(
      [],
      {
        month:"short",
        day:"numeric",

        ...(date.getFullYear() !==
          now.getFullYear()
            ? {year:"numeric"}
            : {}),
      }
    );
  }


  return <div className="notification-center">
    <div className="panel-title-row">
      <div>
        {!embedded&&<>
          <span className="eyebrow">Updates</span>
          <h1 className="panel-title">Notifications</h1>
        </>}
        <p className="muted">Booking, messages, verification and account updates in one place.</p>
      </div>
      <button
        type="button"
        className={`notification-read-all ${unread ? "has-unread" : ""}`}
        disabled={busy||!unread}
        onClick={all}
      >
        {busy
          ? "Updating..."
          : unread
            ? `Mark all as read (${unread})`
            : "All read"}
      </button>
    </div>

    {status&&<div className="notice">{status}</div>}

    {!status&&!items.length&&
      <div className="empty-state">
        <h3>No notifications yet</h3>
        <p>Important marketplace activity will appear here.</p>
      </div>
    }

    <div className="notification-list">
      {items.map((n)=>{
        const content = <>
          <span className="notification-dot" aria-hidden="true" />
          <div className="notification-copy">
            <div className="notification-head">
              <strong>{n.title}</strong>
              <small>{notificationTime(n.created_at)}</small>
            </div>
            <p>{n.body}</p>
          </div>
        </>;

        return n.link ? (
          <Link
            key={n.id}
            href={n.link}
            className={`notification-card ${n.read_at ? "" : "unread"}`}
            onClick={()=>{ if(!n.read_at) mark(n.id) }}
          >
            {content}
          </Link>
        ) : (
          <button
            key={n.id}
            type="button"
            className={`notification-card notification-card-button ${n.read_at ? "" : "unread"}`}
            onClick={()=>{ if(!n.read_at) mark(n.id) }}
          >
            {content}
          </button>
        );
      })}
    </div>
  </div>
}
