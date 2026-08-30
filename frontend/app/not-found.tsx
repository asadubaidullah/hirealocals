import Link from "next/link";
export default function NotFound(){return <section className="section"><div className="container" style={{textAlign:'center',maxWidth:650}}><span className="eyebrow">404</span><h1 style={{fontSize:64}}>That page wandered off.</h1><p className="lead">The city, local or page you requested does not exist.</p><Link className="btn" href="/">Back home</Link></div></section>}

