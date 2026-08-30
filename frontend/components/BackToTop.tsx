"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackToTop(){
  const[visible,setVisible]=useState(false);

  useEffect(()=>{
    const onScroll=()=>setVisible(window.scrollY>520);
    onScroll();
    window.addEventListener("scroll",onScroll,{passive:true});
    return()=>window.removeEventListener("scroll",onScroll);
  },[]);

  return <button
    type="button"
    className={`back-to-top ${visible?"is-visible":""}`}
    onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
    aria-label="Back to top"
    title="Back to top"
  ><ArrowUp size={19}/><span>Top</span></button>;
}

