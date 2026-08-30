"use client";

import Link from "next/link";
import { Bell, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, dashboardFor, getRole } from "@/lib/auth";
import ActiveNavLink from "@/components/ActiveNavLink";
import { authedFetch } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header(){
  const [role,setRole]=useState<"tourist"|"local"|"admin"|null>(null);
  const [ready,setReady]=useState(false);
  const [unread,setUnread]=useState(0);
  const [mobileOpen,setMobileOpen]=useState(false);
  const pathname=usePathname();
  const router=useRouter();

  useEffect(()=>{
    const sync=()=>{setRole(getRole());setReady(true)};
    sync();
    window.addEventListener("storage",sync);
    window.addEventListener("hal-auth-changed",sync as EventListener);

    return ()=>{
      window.removeEventListener("storage",sync);
      window.removeEventListener("hal-auth-changed",sync as EventListener);
    };
  },[]);

  useEffect(()=>setMobileOpen(false),[pathname]);

  useEffect(()=>{
    if(!role){setUnread(0);return}

    let live=true;

    const load=async()=>{
      try{
        const r=await authedFetch("/api/notifications/unread-count");
        if(r.ok&&live){
          const d=await r.json();
          setUnread(d.count||0);
        }
      }catch{}
    };

    load();
    const id=window.setInterval(load,30000);

    return()=>{
      live=false;
      window.clearInterval(id);
    };
  },[role]);

  const notificationHref=
    role==="admin"
      ?"/admin/notifications"
      :role==="local"
        ?"/local-dashboard/notifications"
        :"/dashboard/notifications";

  function logout(){
    clearSession();
    setRole(null);
    setMobileOpen(false);
    router.replace("/");
    router.refresh();
  }

  return <header className={`header ${mobileOpen?"mobile-open":""}`}>
    <div className="container nav">

      <Link href="/" className="logo header-logo" aria-label="HireALocals home">
        <span className="header-logo-word">
          HireA<strong>Locals</strong>
        </span>
      </Link>

      <nav className="navlinks" aria-label="Main navigation">
        <ActiveNavLink href="/" exact className="navlink">Home</ActiveNavLink>
        <ActiveNavLink href="/how-it-works" className="navlink">
          How it works
        </ActiveNavLink>

        <ActiveNavLink
          href="/destinations"
          matchPrefixes={["/uk","/usa"]}
          className="navlink"
        >
          Destinations
        </ActiveNavLink>

        <ActiveNavLink href="/experiences" className="navlink">
          Experiences
        </ActiveNavLink>

        <ActiveNavLink href="/blog" className="navlink">
          Travel Guides
        </ActiveNavLink>

        <ActiveNavLink href="/become-a-local" className="navlink">
          Become a Local
        </ActiveNavLink>
      </nav>

      <div className="nav-actions">
        <ThemeToggle/>

        {ready&&role ? <>
          <Link
            className="notification-bell"
            href={notificationHref}
            aria-label={`Notifications${unread?` (${unread} unread)`:''}`}
          >
            <Bell size={19}/>
            {unread>0&&<span>{unread>99?"99+":unread}</span>}
          </Link>

          <Link
            className="btn secondary header-dashboard-btn"
            href={dashboardFor(role)}
          >
            Dashboard
          </Link>

          <button className="btn" onClick={logout}>
            Log out
          </button>
        </> : <>
          <ActiveNavLink className="btn secondary" href="/login">
            Log in
          </ActiveNavLink>

          <ActiveNavLink className="btn" href="/register">
            Sign up
          </ActiveNavLink>
        </>}
      </div>

      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={mobileOpen?"Close menu":"Open menu"}
        aria-expanded={mobileOpen}
        aria-controls="mobile-site-menu"
        onClick={()=>setMobileOpen(v=>!v)}
      >
        {mobileOpen?<X size={22}/>:<Menu size={22}/>}
      </button>
    </div>

    <div
      id="mobile-site-menu"
      className="mobile-menu-shell"
      hidden={!mobileOpen}
    >
      <div className="container mobile-menu-panel">

        

        <nav className="mobile-menu-links">
          <ActiveNavLink href="/" exact>Home</ActiveNavLink>
          <ActiveNavLink href="/explore">Find a Local</ActiveNavLink>
          <ActiveNavLink href="/destinations">Destinations</ActiveNavLink>
          <ActiveNavLink href="/experiences">Experiences</ActiveNavLink>
          <ActiveNavLink href="/how-it-works">How it works</ActiveNavLink>
          <ActiveNavLink href="/blog">Travel Guides</ActiveNavLink>
          <ActiveNavLink href="/safety">Trust & Safety</ActiveNavLink>
          <ActiveNavLink href="/contact">Contact</ActiveNavLink>
          <ActiveNavLink href="/become-a-local">Become a Local</ActiveNavLink>
        </nav>

        <div className="mobile-menu-divider"/>

        <div className="mobile-account-actions">
          {ready&&role ? <>
            <Link href={dashboardFor(role)} className="btn secondary">
              Dashboard
            </Link>
            <button className="btn" onClick={logout}>
              Log out
            </button>
          </> : <>
            <Link href="/login" className="btn secondary">
              Log in
            </Link>
            <Link href="/register" className="btn">
              Sign up
            </Link>
          </>}
        </div>

      </div>
    </div>
  </header>;
}



