"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

export default function SafeImage({
  src,
  fallbackSrc,
  alt,
  className=""
}:{
  src?:string|null;
  fallbackSrc?:string|null;
  alt:string;
  className?:string;
}){
  const [current,setCurrent]=useState(src||fallbackSrc||"");
  const [failed,setFailed]=useState(!src&&!fallbackSrc);

  useEffect(()=>{
    setCurrent(src||fallbackSrc||"");
    setFailed(!src&&!fallbackSrc);
  },[src,fallbackSrc]);

  function fail(){
    if(fallbackSrc&&current!==fallbackSrc){
      setCurrent(fallbackSrc);
      return;
    }

    setFailed(true);
  }

  return (
    <div className={`safe-image ${className}`}>
      {!failed&&current ?
         <img src={current} alt={alt} onError={fail}/>
        : <div className="safe-image-fallback">
            <ImageIcon size={24}/>
            <strong>{alt}</strong>
          </div>
      }
    </div>
  );
}

