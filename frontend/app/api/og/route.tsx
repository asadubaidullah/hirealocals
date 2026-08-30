import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";


function clean(value:string|null,fallback:string,max:number){
  const text=(value||"").replace(/[<>]/g,"").trim();
  return (text||fallback).slice(0,max);
}

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  const title=clean(q.get("title"),"See the city through local eyes.",120);
  const subtitle=clean(q.get("subtitle"),"Private, flexible travel experiences with trusted locals in selected UK and US cities.",190);
  const eyebrow=clean(q.get("eyebrow"),"HIRE A LOCAL. TRAVEL BETTER.",70);
  const badge=clean(q.get("badge"),"UK + USA",60);

  return new ImageResponse(
    <div style={{
      width:"100%",height:"100%",display:"flex",position:"relative",overflow:"hidden",
      padding:"68px 76px",background:"linear-gradient(135deg,#071c16 0%,#0e3c2f 54%,#10674c 100%)",
      color:"#f8fffb",fontFamily:"Arial, Helvetica, sans-serif"
    }}>
      <div style={{position:"absolute",width:420,height:420,borderRadius:999,right:-95,top:-130,background:"rgba(83,211,159,.14)",border:"1px solid rgba(255,255,255,.11)"}}/>
      <div style={{position:"absolute",width:260,height:260,borderRadius:999,right:170,bottom:-125,background:"rgba(240,210,145,.13)",border:"1px solid rgba(255,255,255,.09)"}}/>
      <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",fontSize:45,fontWeight:900,letterSpacing:"-2.5px"}}>HireA<span style={{color:"#69e0ae"}}>Locals</span></div>
          <div style={{display:"flex",padding:"10px 16px",borderRadius:999,border:"1px solid rgba(255,255,255,.24)",background:"rgba(255,255,255,.08)",fontSize:17,fontWeight:800,letterSpacing:".7px"}}>{badge}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"center",flex:1,maxWidth:980}}>
          <div style={{display:"flex",fontSize:17,fontWeight:800,letterSpacing:"2.8px",color:"#80e7bb",marginBottom:20}}>{eyebrow}</div>
          <div style={{display:"flex",fontSize:title.length>72?53:62,fontWeight:900,lineHeight:1.04,letterSpacing:"-3px",maxWidth:1040}}>{title}</div>
          <div style={{display:"flex",fontSize:24,lineHeight:1.45,color:"#c9ddd5",maxWidth:920,marginTop:24}}>{subtitle}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16,fontSize:16,fontWeight:700,color:"#cfe9df"}}>
          <span style={{display:"flex"}}>Trusted profiles</span><span style={{display:"flex",color:"#68dbaa"}}>•</span>
          <span style={{display:"flex"}}>Private experiences</span><span style={{display:"flex",color:"#68dbaa"}}>•</span>
          <span style={{display:"flex"}}>hirealocals.com</span>
        </div>
      </div>
    </div>,
    {width:1200,height:630}
  );
}

