"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  RefreshCw,
  Sparkles,
  UsersRound
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import LocalCard from "./LocalCard";
import { apiUrl } from "@/lib/site";
import { authedFetch } from "@/lib/api";
import { getRole, getToken } from "@/lib/auth";

type LocalShape = {
  id:number;
  slug:string;
  name:string;
  city:string;
  headline:string;
  languages:string[];
  rating:number;
  reviews:number;
  rate:number;
  verified:boolean;
  image:string;
  categories:string[];
};

type Facets = {
  cities:{
    name:string;
    slug:string;
    country_code:string
  }[];
  categories:string[];
};

function shape(row:any):LocalShape {
  const p=row.profile||{};

  const services=(row.services||[])
    .filter((s:any)=>s.active!==false);

  return {
    id:p.id,
    slug:p.slug,
    name:p.display_name,
    city:p.city_name,
    headline:p.headline,

    languages:String(p.languages||"")
      .split(",")
      .map((x:string)=>x.trim())
      .filter(Boolean),

    rating:Number(p.rating)||0,
    reviews:Number(p.review_count)||0,
    rate:Number(p.hourly_rate)||0,
    verified:Boolean(p.verified),
    image:p.image_url||"",

    categories:[
      ...new Set(
        services
          .map((s:any)=>s.category)
          .filter(Boolean)
      )
    ] as string[],
  };
}

function safeGuests(value:string|null){
  const parsed=Number(value);

  if(!Number.isFinite(parsed)){
    return "1";
  }

  return String(
    Math.min(
      6,
      Math.max(1,Math.trunc(parsed))
    )
  );
}

export default function ExploreClient(){
  const sp=useSearchParams();

  const tripDate=sp.get("date")||"";
  const tripGuests=safeGuests(
    sp.get("guests")
  );

  const [items,setItems]=
    useState<LocalShape[]>([]);

  const [saved,setSaved]=
    useState<number[]>([]);

  const [facets,setFacets]=
    useState<Facets>({
      cities:[],
      categories:[]
    });

  const [loading,setLoading]=
    useState(true);

  const [error,setError]=
    useState("");

  const [retryKey,setRetryKey]=
    useState(0);

  const [q,setQ]=useState("");
  const [debouncedQ,setDebouncedQ]=
    useState("");

  const [city,setCity]=
    useState(sp.get("city")||"");

  const [service,setService]=
    useState(sp.get("service")||"");

  const [maxRate,setMaxRate]=
    useState("100");

  const [minRating,setMinRating]=
    useState("0");

  const [sort,setSort]=
    useState("recommended");

  const [page,setPage]=useState(1);
  const [pages,setPages]=useState(1);
  const [total,setTotal]=useState(0);

  useEffect(()=>{
    const timer=setTimeout(
      ()=>setDebouncedQ(q.trim()),
      350
    );

    return()=>clearTimeout(timer);
  },[q]);

  useEffect(()=>{
    setPage(1);
  },[
    debouncedQ,
    city,
    service,
    maxRate,
    minRating,
    sort
  ]);

  useEffect(()=>{
    let alive=true;

    (async()=>{
      setLoading(true);
      setError("");

      const params=new URLSearchParams({
        page:String(page),
        page_size:"9",
        sort
      });

      if(debouncedQ){
        params.set("q",debouncedQ);
      }

      if(city){
        params.set("city",city);
      }

      if(service){
        params.set("category",service);
      }

      if(maxRate!=="1000"){
        params.set(
          "max_rate",
          maxRate
        );
      }

      if(Number(minRating)>0){
        params.set(
          "min_rating",
          minRating
        );
      }

      try{
        const r=await fetch(
          `${apiUrl}/api/search/locals?${params.toString()}`,
          {cache:"no-store"}
        );

        const data=
          await r.json()
            .catch(()=>({}));

        if(!r.ok){
          throw new Error(
            data.detail||
            "We could not load locals right now."
          );
        }

        if(!alive)return;

        setItems(
          (data.items||[]).map(shape)
        );

        setFacets(
          data.facets||{
            cities:[],
            categories:[]
          }
        );

        setTotal(
          Number(data.total)||0
        );

        setPages(
          Math.max(
            1,
            Number(data.pages)||1
          )
        );

        if(
          Number(data.page)&&
          Number(data.page)!==page
        ){
          setPage(
            Number(data.page)
          );
        }
      }
      catch(e:any){
        if(!alive)return;

        setItems([]);
        setTotal(0);
        setPages(1);

        setError(
          e?.message||
          "We could not load marketplace results. Please try again."
        );
      }
      finally{
        if(alive){
          setLoading(false);
        }
      }
    })();

    return()=>{
      alive=false;
    };

  },[
    debouncedQ,
    city,
    service,
    maxRate,
    minRating,
    sort,
    page,
    retryKey
  ]);

  useEffect(()=>{
    if(
      getToken()&&
      getRole()==="tourist"
    ){
      authedFetch(
        "/api/traveler/saved-ids"
      )
        .then(async r=>{
          if(r.ok){
            setSaved(
              await r.json()
            );
          }
        })
        .catch(()=>{});
    }
  },[]);

  async function toggleSave(id:number){
    if(
      !getToken()||
      getRole()!=="tourist"
    ){
      window.location.href="/login";
      return;
    }

    const isSaved=
      saved.includes(id);

    const r=await authedFetch(
      `/api/traveler/saved/${id}`,
      {
        method:
          isSaved
            ?"DELETE"
            :"POST"
      }
    );

    if(r.ok){
      setSaved(v=>
        isSaved
          ?v.filter(x=>x!==id)
          :[...v,id]
      );
    }
  }

  const tripParams={
    city,
    service,
    date:tripDate,
    guests:tripGuests
  };

  const hasTripContext=
    Boolean(sp.get("date"))||
    Boolean(sp.get("guests"));

  return <>

    {hasTripContext&&
      <div
        className="explore-trip-context"
        aria-label="Trip search details"
      >
        {tripDate&&
          <span>
            <CalendarDays size={15}/>
            {tripDate}
          </span>
        }

        <span>
          <UsersRound size={15}/>
          {tripGuests}
          {" "}
          {tripGuests==="1"
            ?"guest"
            :"guests"
          }
        </span>

        <small>
          These trip details will carry
          into the booking request.
        </small>
      </div>
    }


    <div className="filters explore-filters">

      <input
        aria-label="Search locals"
        placeholder="Search name, city, language or keyword"
        value={q}
        onChange={e=>
          setQ(e.target.value)
        }
      />


      <select
        aria-label="Filter by city"
        value={city}
        onChange={e=>
          setCity(e.target.value)
        }
      >
        <option value="">
          All cities
        </option>

        {city&&
         !facets.cities.some(
           c=>c.name===city
         )&&
          <option value={city}>
            {city}
          </option>
        }

        {facets.cities.map(c=>
          <option
            value={c.name}
            key={`${c.country_code}-${c.slug}`}
          >
            {c.name}
          </option>
        )}
      </select>


      <select
        aria-label="Filter by service"
        value={service}
        onChange={e=>
          setService(e.target.value)
        }
      >
        <option value="">
          All services
        </option>

        {service&&
         !facets.categories.includes(
           service
         )&&
          <option value={service}>
            {service}
          </option>
        }

        {facets.categories.map(c=>
          <option
            key={c}
            value={c}
          >
            {c}
          </option>
        )}
      </select>


      <select
        aria-label="Maximum hourly rate"
        value={maxRate}
        onChange={e=>
          setMaxRate(e.target.value)
        }
      >
        <option value="40">
          Up to $40/hr
        </option>

        <option value="60">
          Up to $60/hr
        </option>

        <option value="100">
          Up to $100/hr
        </option>

        <option value="1000">
          Any rate
        </option>
      </select>


      <select
        aria-label="Minimum rating"
        value={minRating}
        onChange={e=>
          setMinRating(e.target.value)
        }
      >
        <option value="0">
          Any rating
        </option>

        <option value="4">
          4 stars & up
        </option>

        <option value="4.5">
          4.5 stars & up
        </option>

        <option value="4.8">
          4.8 stars & up
        </option>
      </select>


      <select
        aria-label="Sort results"
        value={sort}
        onChange={e=>
          setSort(e.target.value)
        }
      >
        <option value="recommended">
          Recommended
        </option>

        <option value="rating">
          Top rated
        </option>

        <option value="price_low">
          Price: low to high
        </option>

        <option value="price_high">
          Price: high to low
        </option>

        <option value="newest">
          Newest locals
        </option>
      </select>

    </div>


    <div className="results-summary">
      <p className="muted">
        {loading
          ?"Searching..."
          :error
            ?"Search temporarily unavailable."
            :`${total} locals match your filters.`
        }
      </p>

      {loading&&
        <span
          className="search-pulse"
          aria-hidden="true"
        />
      }
    </div>


    {error&&!loading&&
      <div
        className="explore-error-state"
        role="alert"
      >
        <div>
          <strong>
            We could not load marketplace results.
          </strong>

          <p>{error}</p>
        </div>

        <button
          type="button"
          className="btn secondary"
          onClick={()=>
            setRetryKey(v=>v+1)
          }
        >
          <RefreshCw size={16}/>
          Retry
        </button>
      </div>
    }


    {!error&&
      <div className="grid grid-3">
        {items.map(l=>
          <LocalCard
            local={l}
            saved={saved.includes(l.id)}
            onToggleSave={toggleSave}
            tripParams={tripParams}
            key={l.id}
          />
        )}
      </div>
    }


    {!loading&&
     !error&&
     !items.length&&
      <div className="explore-request-bridge-card" role="region" aria-label="Request a Local">
        <div className="bridge-icon">
          <Sparkles size={28} />
        </div>
        <div className="bridge-content">
          <h3>Can&apos;t find the exact match{city ? ` in ${city}` : ""}?</h3>
          <p>
            Tell us what you need and verified local experts{city ? ` in ${city}` : ""} will send you tailored proposals directly to your dashboard.
          </p>
          <div className="bridge-actions">
            <Link
              href={`/request-a-local?${new URLSearchParams({
                ...(city ? { city } : {}),
                ...(service ? { category: service } : {}),
                ...(tripDate ? { date: tripDate } : {}),
                ...(tripGuests && tripGuests !== "1" ? { guests: tripGuests } : {}),
                ...(maxRate ? { max_rate: maxRate } : {}),
              }).toString()}`}
              className="btn primary"
            >
              Request a Local {city ? `in ${city}` : ""} &rarr;
            </Link>
          </div>
        </div>
      </div>
    }


    {!error&&pages>1&&
      <nav
        className="pagination"
        aria-label="Search result pages"
      >

        <button
          className="mini-btn secondary-mini"
          disabled={
            page<=1||
            loading
          }
          onClick={()=>
            setPage(p=>
              Math.max(1,p-1)
            )
          }
        >
          Previous
        </button>

        <span>
          Page <strong>{page}</strong>
          {" "}of {pages}
        </span>

        <button
          className="mini-btn secondary-mini"
          disabled={
            page>=pages||
            loading
          }
          onClick={()=>
            setPage(p=>
              Math.min(
                pages,
                p+1
              )
            )
          }
        >
          Next
        </button>

      </nav>
    }

  </>;
}

