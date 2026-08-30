"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { authedFetch } from "@/lib/api";
import TravelerSidebar from "@/components/TravelerSidebar";

type Me = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  image_url?: string;
};

export default function TravelerShell({
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

        if (account.role !== "tourist") {
          router.replace(
            account.role === "admin"
              ? "/admin"
              : "/local-dashboard"
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
      <section className="section">
        <div className="container">
          <div className="panel-loading">
            Loading traveler workspace…
          </div>
        </div>
      </section>
    );
  }

  const initial =
    me.full_name.trim().charAt(0).toUpperCase() || "T";

  return (
    <section className="pro-workspace pro-workspace-traveler">

      <div className="pro-workspace-frame">

        <TravelerSidebar me={me} />

        <div className="pro-workspace-body">

          <header className="pro-workspace-topbar">

            <div className="pro-workspace-welcome">
              <span>Traveler workspace</span>
              <strong>{me.full_name}</strong>
              <small>{me.email}</small>
            </div>

            <div className="pro-workspace-top-actions">

              <Link
                href="/explore"
                className="pro-workspace-primary-action"
              >
                <Search size={17} />
                <span>Find a Local</span>
              </Link>

              <Link
                href="/dashboard/profile"
                className="pro-workspace-avatar"
                aria-label="Open traveler profile"
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

          <main className="pro-workspace-content traveler-page-content">
            {children}
          </main>

        </div>

      </div>

    </section>
  );
}
