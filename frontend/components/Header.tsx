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
    if(mobileOpen){
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if(e.key === "Escape") setMobileOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return ()=>{
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  },[mobileOpen]);

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

    {/* MOBILE SIDE-DRAWER BACKDROP OVERLAY */}
    <div
      className={`mobile-drawer-overlay ${mobileOpen ? "is-open" : ""}`}
      onClick={()=>setMobileOpen(false)}
      aria-hidden={!mobileOpen}
    />

    {/* MOBILE SIDE-DRAWER */}
    <aside
      id="mobile-site-menu"
      className={`mobile-drawer ${mobileOpen ? "is-open" : ""}`}
      aria-label="Mobile navigation"
      aria-hidden={!mobileOpen}
    >
      <div className="mobile-drawer-header">
        <Link href="/" className="logo drawer-logo" onClick={()=>setMobileOpen(false)}>
          <span className="header-logo-word">
            HireA<strong>Locals</strong>
          </span>
        </Link>
        <div className="mobile-drawer-header-actions">
          <ThemeToggle/>
          <button
            type="button"
            className="mobile-drawer-close"
            aria-label="Close menu"
            onClick={()=>setMobileOpen(false)}
          >
            <X size={20}/>
          </button>
        </div>
      </div>

      <div className="mobile-drawer-body">
        <nav className="mobile-drawer-nav" aria-label="Mobile main links">
          <ActiveNavLink href="/" exact className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Home
          </ActiveNavLink>
          <ActiveNavLink href="/explore" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Find a Local
          </ActiveNavLink>
          <ActiveNavLink href="/destinations" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Destinations
          </ActiveNavLink>
          <ActiveNavLink href="/experiences" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Experiences
          </ActiveNavLink>
          <ActiveNavLink href="/how-it-works" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            How it works
          </ActiveNavLink>
          <ActiveNavLink href="/blog" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Travel Guides
          </ActiveNavLink>
          <ActiveNavLink href="/safety" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Trust &amp; Safety
          </ActiveNavLink>
          <ActiveNavLink href="/contact" className="mobile-drawer-link" onClick={()=>setMobileOpen(false)}>
            Contact &amp; Support
          </ActiveNavLink>
          <ActiveNavLink href="/become-a-local" className="mobile-drawer-link highlight" onClick={()=>setMobileOpen(false)}>
            Become a Local
          </ActiveNavLink>
        </nav>

        <div className="mobile-drawer-divider"/>

        <div className="mobile-drawer-actions">
          {ready&&role ? <>
            <Link
              href={dashboardFor(role)}
              className="btn secondary mobile-drawer-action-btn"
              onClick={()=>setMobileOpen(false)}
            >
              Dashboard
            </Link>
            <button
              className="btn mobile-drawer-action-btn"
              onClick={logout}
            >
              Log out
            </button>
          </> : <>
            <Link
              href="/login"
              className="btn secondary mobile-drawer-action-btn"
              onClick={()=>setMobileOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="btn mobile-drawer-action-btn"
              onClick={()=>setMobileOpen(false)}
            >
              Sign up
            </Link>
          </>}
        </div>

        <div className="mobile-drawer-footer">
          <span>Private Travel Marketplace</span>
        </div>
      </div>
    </aside>
  </header>;
}



