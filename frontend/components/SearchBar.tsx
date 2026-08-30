"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Compass,
  MapPin,
  Search,
  UsersRound
} from "lucide-react";
import { apiUrl } from "@/lib/site";

export default function SearchBar(){
  const router=useRouter();
  const isDevelopment =
    process.env.NODE_ENV !== "production";

  const [cities,setCities]=useState<string[]>(
    isDevelopment
      ? ["London","New York","Edinburgh","Miami"]
      : []
  );

  const [services,setServices]=useState<string[]>(
    isDevelopment
      ? ["Tour Guide","Photographer","Food Expert","Local Guide","Interpreter"]
      : []
  );

  const [city,setCity]=useState(isDevelopment?"London":"");
  const [service,setService]=useState(isDevelopment?"Tour Guide":"");
  const [date,setDate]=useState("");
  const [guests,setGuests]=useState("1");
  const [optionsError,setOptionsError]=useState("");

  useEffect(()=>{
    let alive=true;

    (async()=>{
      try{
        setOptionsError("");
        const [cityResponse,serviceResponse]=await Promise.all([
          fetch(`${apiUrl}/api/content/cities`),
          fetch(`${apiUrl}/api/content/service-categories`)
        ]);

        if(cityResponse.ok&&alive){
          const rows=await cityResponse.json();
          const names=rows
            .filter((row:any)=>row.published!==false)
            .map((row:any)=>row.name)
            .filter(Boolean);

          if(names.length){
            setCities(names);
            setCity(current=>names.includes(current)?current:names[0]);
          }
        }

        if(serviceResponse.ok&&alive){
          const rows=await serviceResponse.json();
          const names=rows
            .filter((row:any)=>row.active!==false)
            .map((row:any)=>row.name)
            .filter(Boolean);

          if(names.length){
            setServices(names);
            setService(current=>names.includes(current)?current:names[0]);
          }
        }
      }catch{
        if(!alive)return;

        setOptionsError(
          "Destinations and experiences are temporarily unavailable."
        );

        if(!isDevelopment){
          setCities([]);
          setServices([]);
          setCity("");
          setService("");
        }
      }
    })();

    return()=>{alive=false};
  },[]);

  function search(){
    if(!city||!service)return;

    const params=new URLSearchParams();

    if(city)params.set("city",city);
    if(service)params.set("service",service);
    if(date)params.set("date",date);
    if(guests)params.set("guests",guests);

    router.push(`/explore?${params.toString()}`);
  }

  return (
    <>
    <div className="hal-searchbar" role="search" aria-label="Search HireALocals">

      <label className="hal-search-field">
        <MapPin size={18}/>
        <span>
          <small>Where to?</small>
          <select
            value={city}
            disabled={!cities.length}
            onChange={e=>setCity(e.target.value)}
            aria-label="Destination"
          >
            {cities.map(item=>
              <option key={item} value={item}>{item}</option>
            )}
          </select>
        </span>
      </label>

      <label className="hal-search-field">
        <Compass size={18}/>
        <span>
          <small>Experience type</small>
          <select
            value={service}
            disabled={!services.length}
            onChange={e=>setService(e.target.value)}
            aria-label="Experience type"
          >
            {services.map(item=>
              <option key={item} value={item}>{item}</option>
            )}
          </select>
        </span>
      </label>

      <label className="hal-search-field">
        <CalendarDays size={18}/>
        <span>
          <small>Date</small>
          <input
            type="date"
            value={date}
            onChange={e=>setDate(e.target.value)}
            aria-label="Trip date"
          />
        </span>
      </label>

      <label className="hal-search-field">
        <UsersRound size={18}/>
        <span>
          <small>Guests</small>
          <select
            value={guests}
            onChange={e=>setGuests(e.target.value)}
            aria-label="Guests"
          >
            <option value="1">1 guest</option>
            <option value="2">2 guests</option>
            <option value="3">3 guests</option>
            <option value="4">4 guests</option>
            <option value="5">5 guests</option>
            <option value="6">6 guests</option>
          </select>
        </span>
      </label>

      <button
        type="button"
        className="btn hal-search-submit"
        onClick={search}
        disabled={!city||!service}
      >
        <Search size={17}/>
        Search
      </button>

    </div>

    {optionsError ?
       <div
          className="hal-search-api-error"
          role="status"
        >
          {optionsError}
        </div>
      : null
    }
  </>
  );
}

