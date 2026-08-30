import { Suspense } from "react";
import ExploreClient from "@/components/ExploreClient";
export const metadata={title:"Find a Local",description:"Browse trusted locals in UK and US cities for private tours, photography, food, orientation and more.",alternates:{canonical:"/explore"}};
export default function Explore(){return <section className="section"><div className="container"><span className="eyebrow">Explore locals</span><h1 style={{fontSize:'clamp(40px,6vw,64px)'}}>Find the right local for your trip.</h1><p className="lead">Search by city, service and budget. Every listed local is intended to be reviewed before their profile is made public.</p><Suspense fallback={<p>Loading filters…</p>}><ExploreClient/></Suspense></div></section>}

