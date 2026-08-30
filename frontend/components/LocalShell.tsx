"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";

import { authedFetch } from "@/lib/api";
import LocalSidebar from "@/components/LocalSidebar";
import BrandLoader from "@/components/BrandLoader";
import ThemeToggle from "@/components/ThemeToggle";

type Me = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  image_url?: string;
};

export default function LocalShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const response = await authedFetch("/api/auth/me");

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const account: Me = await response.json();

        if (account.role !== "local") {
          router.replace(
            account.role === "admin"
              ? "/admin"
              : "/dashboard"
          );
          return;
        }

        if (live) {
          setMe(account);
          setReady(true);
        }
      } catch {
        if (live) {
          setError("Could not connect to the API.");
        }
      }
    })();

    return () => {
      live = false;
    };
  }, [router]);

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <div className="notice error">{error}</div>
        </div>
      </section>
    );
  }

  if (!ready || !me) {
    return (
      <div className="workspace-auth-loading">
        <BrandLoader
          label="Preparing your Local workspace"
          delayMs={180}
        />
      </div>
    );
  }

  const initial =
    me.full_name.trim().charAt(0).toUpperCase() || "L";

  return (
    <section className="pro-workspace pro-workspace-local">

      <div className="pro-workspace-frame">

        <LocalSidebar me={me} />

        <div className="pro-workspace-body">

          <header className="pro-workspace-topbar">

            <div className="pro-workspace-welcome">
              <span>Local workspace</span>
              <strong>{me.full_name}</strong>
              <small>{me.email}</small>
            </div>

            <div className="pro-workspace-top-actions">

              
              <ThemeToggle />
<Link
                href="/local-dashboard/availability"
                className="pro-workspace-primary-action"
              >
                <CalendarClock size={17} />
                <span>Manage availability</span>
              </Link>

              <Link
                href="/local-dashboard/profile"
                className="pro-workspace-avatar"
                aria-label="Open local profile settings"
              >
                {me.image_url ? (
                  <img
                    src={me.image_url}
                    alt={me.full_name}
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </Link>

            </div>

          </header>

          <main className="pro-workspace-content local-page-content">
            {children}
          </main>

        </div>

      </div>

    </section>
  );
}
