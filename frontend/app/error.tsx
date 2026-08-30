"use client";
import Link from "next/link";
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section className="section"><div className="container" style={{textAlign:'center',maxWidth:680}}><span className="eyebrow">Something went wrong</span><h1 style={{fontSize:'clamp(42px,7vw,68px)'}}>We could not load this page.</h1><p className="lead">Your booking or account data has not been intentionally changed by this error. Try the page again, or return home.</p><div className="error-actions"><button className="btn" onClick={()=>reset()}>Try again</button><Link href="/" className="btn secondary">Back home</Link></div></div></section>}

