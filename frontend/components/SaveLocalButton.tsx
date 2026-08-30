"use client";
import { useEffect,useState } from "react";
import { Heart } from "lucide-react";
import { authedFetch } from "@/lib/api";
import { getRole,getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
export default function SaveLocalButton({localId}:{localId:number}){const router=useRouter();const [saved,setSaved]=useState(false);const [ready,setReady]=useState(false);const [visible,setVisible]=useState(true);useEffect(()=>{const role=getRole();if(getToken()&&role!=='tourist'){setVisible(false);setReady(true);return}if(!getToken()){setReady(true);return}(async()=>{const r=await authedFetch('/api/traveler/saved-ids');if(r.ok){const ids:number[]=await r.json();setSaved(ids.includes(localId))}setReady(true)})()},[localId]);async function toggle(){if(!getToken()){router.push('/login');return}if(getRole()!=='tourist')return;const r=await authedFetch(`/api/traveler/saved/${localId}`,{method:saved?'DELETE':'POST'});if(r.ok)setSaved(!saved)}if(!visible)return null;return <button type="button" className={`btn secondary profile-save-btn ${saved?'saved':''}`} onClick={toggle} disabled={!ready}><Heart size={17} fill={saved?'currentColor':'none'}/>{saved?'Saved':'Save local'}</button>}

