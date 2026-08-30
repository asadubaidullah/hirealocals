import { apiUrl } from "@/lib/site";
import { clearSession, getToken } from "@/lib/auth";

export async function authedFetch(path:string, init:RequestInit={}){
  const token=getToken();
  const headers=new Headers(init.headers||{});
  if(token) headers.set("Authorization",`Bearer ${token}`);
  if(init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  const r=await fetch(`${apiUrl}${path}`,{...init,headers});
  if(r.status===401){clearSession();}
  return r;
}

