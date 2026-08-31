"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { authedFetch } from "@/lib/api";
import { getToken, clearSession, NAME_KEY } from "@/lib/auth";

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

  // Instant hydration state from cache
  const [name, setName] = useState<string>("Admin");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // Initialize cached session info immediately on mount (0ms delay)
  useEffect(() => {
    try {
      const cachedName = localStorage.getItem(NAME_KEY);
      const cachedAvatar = localStorage.getItem("hal_avatar");
      if (cachedName) setName(cachedName);
      if (cachedAvatar) setAvatarUrl(cachedAvatar);
    } catch {}
  }, []);

  useEffect(() => {
    function onBadgesSynced(e: any) {
      if (e.detail && typeof e.detail.total === "number") {
        setTotalUnread(e.detail.total);
      }
    }
    window.addEventListener("hal-admin-badges-synced", onBadgesSynced);
    return () => {
      window.removeEventListener("hal-admin-badges-synced", onBadgesSynced);
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => {
      document.body.classList.remove("admin-mode");
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let live = true;
    (async () => {
      try {
        const response = await authedFetch("/api/auth/me");
        if (!response.ok) {
          clearSession();
          router.replace("/login");
          return;
        }

        const me: Me = await response.json();
        if (me.role !== "admin") {
          router.replace(me.role === "local" ? "/local-dashboard" : "/dashboard");
          return;
        }

        if (live) {
          const resolvedName = me.full_name || "Admin";
          setName(resolvedName);
          setAvatarUrl(me.image_url || "");
          try {
            localStorage.setItem("hal_user_name", resolvedName);
            if (me.image_url) localStorage.setItem("hal_user_avatar", me.image_url);
          } catch {}
        }
      } catch {
        // Soft network error, retain shell
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

      const response = await authedFetch("/api/uploads/profile-image", {
        method: "POST",
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.detail || "Could not upload profile photo.");
        return;
      }

      if (data.url) {
        setAvatarUrl(data.url);
        try {
          localStorage.setItem("hal_user_avatar", data.url);
        } catch {}
      }

      window.dispatchEvent(new Event("hal-auth-changed"));
    } catch {
      setError("Could not upload profile photo.");
    } finally {
      setAvatarBusy(false);
    }
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
        aria-label="Close navigation drawer"
        onClick={() => setMenuOpen(false)}
      />

      <aside className="admin-v2-sidebar">
        <AdminSidebar onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="admin-v2-workspace">
        <header className="admin-v2-topbar">
          <div className="admin-v2-topbar-left">
            <button
              type="button"
              className="admin-v2-menu-button"
              aria-label="Toggle navigation drawer"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="admin-v2-mobile-brand">
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
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
              href="/admin/notifications"
              className="admin-v2-topbar-badge-link"
              aria-label={
                totalUnread > 0
                  ? `${totalUnread} unread admin notifications`
                  : "Notifications"
              }
              title={
                totalUnread > 0
                  ? `${totalUnread} unread notifications`
                  : "Notifications"
              }
            >
              <Bell size={17} />
              {totalUnread > 0 ? (
                <span
                  className="admin-v2-topbar-badge-dot"
                  aria-hidden="true"
                >
                  {totalUnread > 9 ? "9+" : totalUnread}
                </span>
              ) : null}
            </Link>

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
            <div className="notice error mb-4">
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
