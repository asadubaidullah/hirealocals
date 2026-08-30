"use client";
import { useEffect,useState } from "react";
import { apiUrl } from "@/lib/site";

export default function MarketplaceStatusBanner(){
  const [mode,setMode]=useState<string|null>(null);
  useEffect(()=>{let live=true;(async()=>{try{const r=await fetch(`${apiUrl}/api/marketplace/config`,{cache:"no-store"});if(r.ok&&live){const d=await r.json();setMode(d.marketplace_mode||"open")}}catch{}})();return()=>{live=false}},[]);
  if(mode!=="paused")return null;
  return <div className="marketplace-status-banner" role="status">Bookings are temporarily paused. You can still browse Locals, services and travel guides.</div>;
}

