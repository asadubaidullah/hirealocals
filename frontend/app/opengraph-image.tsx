import { ImageResponse } from "next/og";

export const alt="HireALocals — Hire trusted locals for better trips";
export const size={width:1200,height:630};
export const contentType="image/png";

export default function Image(){
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",position:"relative",overflow:"hidden",padding:"70px 76px",background:"linear-gradient(135deg,#071c16 0%,#0e3c2f 54%,#10674c 100%)",color:"#f8fffb",fontFamily:"Arial, Helvetica, sans-serif"}}>
      <div style={{position:"absolute",width:430,height:430,borderRadius:999,right:-100,top:-145,background:"rgba(83,211,159,.14)",border:"1px solid rgba(255,255,255,.11)"}}/>
      <div style={{position:"absolute",width:280,height:280,borderRadius:999,right:180,bottom:-145,background:"rgba(240,210,145,.13)",border:"1px solid rgba(255,255,255,.09)"}}/>
      <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",fontSize:46,fontWeight:900,letterSpacing:"-2.6px"}}>HireA<span style={{color:"#69e0ae"}}>Locals</span></div>
          <div style={{display:"flex",padding:"10px 17px",borderRadius:999,border:"1px solid rgba(255,255,255,.24)",background:"rgba(255,255,255,.08)",fontSize:18,fontWeight:800}}>UK + USA</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"center",flex:1,maxWidth:980}}>
          <div style={{display:"flex",fontSize:18,fontWeight:800,letterSpacing:"2.8px",color:"#80e7bb",marginBottom:20}}>HIRE A LOCAL. TRAVEL BETTER.</div>
          <div style={{display:"flex",fontSize:66,fontWeight:900,lineHeight:1.03,letterSpacing:"-3.5px"}}>See the city through local eyes.</div>
          <div style={{display:"flex",fontSize:25,lineHeight:1.45,color:"#c9ddd5",maxWidth:900,marginTop:25}}>Private tours, photography, food discoveries and practical trip help with trusted locals.</div>
        </div>
        <div style={{display:"flex",gap:16,fontSize:17,fontWeight:700,color:"#cfe9df"}}><span>Trusted profiles</span><span style={{color:"#68dbaa"}}>•</span><span>Private experiences</span><span style={{color:"#68dbaa"}}>•</span><span>hirealocals.com</span></div>
      </div>
    </div>,
    size
  );
}

