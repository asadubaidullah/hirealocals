"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

export default function BackToTop(){
  const [visible,setVisible]=useState(false);
  const [progress,setProgress]=useState(0);

  useEffect(()=>{
    const onScroll=()=>{
      setVisible(window.scrollY>520);

      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      const next =
        maxScroll > 0
          ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100))
          : 0;

      setProgress(next);
    };

    onScroll();
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onScroll);

    return()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",onScroll);
    };
  },[]);

  return (
    <button
      type="button"
      className={`back-to-top ${visible?"is-visible":""}`}
      style={{
        "--scroll-progress": `${progress * 3.6}deg`
      } as CSSProperties}
      onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp size={19}/>
      <span>Top</span>
    </button>
  );
}
