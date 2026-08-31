"use client";

import Link from "next/link";
import { BadgeCheck, Heart, Star, UserRound } from "lucide-react";

export default function LocalCard({
  local,
  saved=false,
  onToggleSave,
  tripParams
}:{
  local:any;
  saved?:boolean;
  onToggleSave?:(id:number)=>void;
  tripParams?:{
    city?:string;
    service?:string;
    date?:string;
    guests?:string|number;
  };
}){
  const rating=Number(local.rating)||0;
  const reviews=Number(local.reviews)||0;
  const rate=Number(local.rate)||0;
  const languages=Array.isArray(local.languages)?local.languages:[];
  const categories=Array.isArray(local.categories)?local.categories:[];

  const query=new URLSearchParams();

  if(tripParams?.city){
    query.set("city",tripParams.city);
  }

  if(tripParams?.service){
    query.set("service",tripParams.service);
  }

  if(tripParams?.date){
    query.set("date",tripParams.date);
  }

  if(tripParams?.guests){
    query.set(
      "guests",
      String(tripParams.guests)
    );
  }

  const queryString=query.toString();

  const profileHref=
    `/locals/${local.slug}`+
    (queryString?`?${queryString}`:"");

  return <article className="card local-card local-card-shell">
    {onToggleSave&&
      <button
        type="button"
        className={`save-local-btn ${saved?"saved":""}`}
        aria-label={saved?"Remove from saved locals":"Save local"}
        onClick={()=>onToggleSave(local.id)}
      >
        <Heart size={18} fill={saved?"currentColor":"none"}/>
      </button>
    }

    <Link href={profileHref} className="local-card-link">
      {local.image ?
         <img
           className="cover"
           src={local.image}
           alt={`${local.name}, local in ${local.city}`}
           loading="lazy"
           decoding="async"
           width={320}
           height={270}
         />
        : <div className="local-card-image-placeholder"><UserRound size={38}/></div>
      }

      <div className="card-body">
        <div className="local-meta">
          <div>
            <strong>{local.name}</strong>
            {local.verified&&
              <BadgeCheck
                size={15}
                color="#13795b"
                style={{display:"inline",marginLeft:4,verticalAlign:"-2px"}}
              />
            }
            <div className="muted local-city-label">{local.city}</div>
          </div>

          {rating>0&&reviews>0 ?
             <span className="rating"><Star size={13} fill="currentColor"/> {rating} ({reviews})</span>
            : <span className="muted local-new-label">New local</span>
          }
        </div>

        {local.headline?<div className="local-card-headline">{local.headline}</div>:null}

        {categories.length ?
           <div className="chips">
              {categories.slice(0,2).map((c:string)=><span className="chip" key={c}>{c}</span>)}
            </div>
          : null
        }

        <div className="local-meta local-card-bottom">
          {languages.length ?
             <span className="muted local-language-label">{languages.join(" · ")}</span>
            : <span/>
          }

          {rate>0 ?
             <span>
                <span className="price">${rate}</span>
                <span className="muted local-rate-label">/hr</span>
              </span>
            : null
          }
        </div>
      </div>
    </Link>
  </article>;
}

