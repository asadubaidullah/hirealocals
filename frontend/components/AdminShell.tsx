"use client";

import type { ReactNode } from "react";
import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ExternalLink,
  Menu,
  X,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { authedFetch } from "@/lib/api";

type Props = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

type Me = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  image_url?: string;
};

export default function AdminShell({
  eyebrow,
  title,
  children,
}: Props) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Admin");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("admin-mode");

    return () => {
      document.body.classList.remove("admin-mode");
    };
  }, []);

  useEffect(() => {
    let live = true;

    (async () => {
      try {
        const response = await authedFetch("/api/auth/me");

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const me: Me = await response.json();

        if (me.role !== "admin") {
          router.replace(
            me.role === "local" ?
               "/local-dashboard"
              : "/dashboard"
          );
          return;
        }

        if (live) {
          setName(me.full_name || "Admin");
          setAvatarUrl(me.image_url || "");
          setReady(true);
        }
      } catch {
        if (live) {
          setError(
            "Could not connect to the HireALocals API."
          );
          setReady(true);
        }
      }
    })();

    return () => {
      live = false;
    };
  }, [router]);

  async function uploadAvatar(file?: File) {
    if (!file || avatarBusy) return;

    setAvatarBusy(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await authedFetch(
        "/api/uploads/profile-image",
        {
          method: "POST",
          body: form,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.detail || "Could not upload profile photo.");
        return;
      }

      if (data.url) {
        setAvatarUrl(data.url);
      }

      window.dispatchEvent(new Event("hal-auth-changed"));
    } catch {
      setError("Could not upload profile photo.");
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="admin-v2-loading">
        <div className="admin-v2-loading-card">
          <img
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="admin-v2-brand-favicon admin-v2-loading-favicon"
          />
          <strong>Opening admin console…</strong>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        menuOpen
          ? "admin-v2 admin-v2-menu-open"
          : "admin-v2"
      }
    >
      <button
        type="button"
        className="admin-v2-overlay"
        aria-label="Close navigation"
        onClick={() => setMenuOpen(false)}
      />

      <aside className="admin-v2-sidebar">
        <AdminSidebar
          onNavigate={() => setMenuOpen(false)}
        />
      </aside>

      <div className="admin-v2-workspace">
        <header className="admin-v2-topbar">

          <div className="admin-v2-topbar-left">

            <button
              type="button"
              className="admin-v2-menu-button"
              aria-label={
                menuOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>

            <div className="admin-v2-mobile-brand">
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                width={30}
                height={30}
                className="admin-v2-mobile-brand-logo"
              />

              <span className="admin-v2-mobile-brand-text">
                HireALocals <b>Admin</b>
              </span>
            </div>

          </div>

          <div className="admin-v2-topbar-actions">

            <ThemeToggle />

            <Link
              href="/"
              target="_blank"
              className="admin-v2-site-link"
            >
              View website
              <ExternalLink size={14} />
            </Link>

            <div className="admin-v2-user">

              <label
                className={
                  avatarBusy
                    ? "admin-v2-user-avatar admin-v2-user-avatar-edit is-busy"
                    : "admin-v2-user-avatar admin-v2-user-avatar-edit"
                }
                title={
                  avatarBusy
                    ? "Uploading profile photo…"
                    : "Change profile photo"
                }
                aria-label="Change administrator profile photo"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                  />
                ) : (
                  name.trim().charAt(0).toUpperCase() || "A"
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={avatarBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    void uploadAvatar(file);
                  }}
                />
              </label>

              <span className="admin-v2-user-copy">
                <strong>{name}</strong>
                <small>Administrator</small>
              </span>

            </div>

          </div>

        </header>

        <main className="admin-v2-main">

          <div className="admin-v2-page-head">
            <div>
              <span className="admin-v2-eyebrow">
                {eyebrow}
              </span>

              <h1>{title}</h1>
            </div>
          </div>

          {error ? (
            <div className="notice error">
              {error}
            </div>
          ) : null}

          <div className="admin-v2-page-body">
            {children}
          </div>

        </main>
      </div>
    </div>
  );
}

