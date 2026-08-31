"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  BookOpenText,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileText,
  Globe2,
  ImageUp,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MapPinned,
  Rocket,
  Settings,
  Sparkles,
  Star,
  Tags,
  TrendingUp,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { authedFetch } from "@/lib/api";
import { clearSession } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "locals" | "requests" | "reviews" | "support" | "notifications";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type BadgeCounts = {
  total: number;
  locals: number;
  requests: number;
  reviews: number;
  support: number;
  notifications: number;
};

type Props = {
  onNavigate?: () => void;
};

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/admin/revenue",
        label: "Revenue",
        icon: TrendingUp,
      },
    ],
  },

  {
    label: "People",
    items: [
      {
        href: "/admin/travelers",
        label: "Travelers",
        icon: Users,
      },
      {
        href: "/admin/locals",
        label: "Locals & KYC",
        icon: UserRoundCheck,
        badgeKey: "locals",
      },
    ],
  },

  {
    label: "Operations",
    items: [
      {
        href: "/admin/bookings",
        label: "Bookings",
        icon: CalendarDays,
      },
      {
        href: "/admin/requests",
        label: "Custom Requests",
        icon: Sparkles,
        badgeKey: "requests",
      },
      {
        href: "/admin/payments",
        label: "Payments",
        icon: CreditCard,
      },
      {
        href: "/admin/commission",
        label: "Settlements",
        icon: CircleDollarSign,
      },
      {
        href: "/admin/promotions",
        label: "Promotions",
        icon: Tags,
      },
      {
        href: "/admin/reviews",
        label: "Reviews",
        icon: Star,
        badgeKey: "reviews",
      },
      {
        href: "/admin/support",
        label: "Support",
        icon: LifeBuoy,
        badgeKey: "support",
      },
    ],
  },

  {
    label: "Communication",
    items: [
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        badgeKey: "notifications",
      },
      {
        href: "/admin/email-outbox",
        label: "Email outbox",
        icon: Mail,
      },
    ],
  },

  {
    label: "Content",
    items: [
      {
        href: "/admin/seo-cities",
        label: "Destinations",
        icon: MapPinned,
      },
      {
        href: "/admin/blog",
        label: "Travel guides",
        icon: BookOpenText,
      },
      {
        href: "/admin/service-categories",
        label: "Service categories",
        icon: Tags,
      },
      {
        href: "/admin/site-content",
        label: "Site content",
        icon: Globe2,
      },
      {
        href: "/admin/uploads",
        label: "Uploads",
        icon: ImageUp,
      },
    ],
  },

  {
    label: "System",
    items: [
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: FileText,
      },
      {
        href: "/admin/system",
        label: "System status",
        icon: Activity,
      },
      {
        href: "/admin/launch",
        label: "Launch control",
        icon: Rocket,
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
      },
    ],
  },
];

export default function AdminSidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [badges, setBadges] = useState<BadgeCounts>({
    total: 0,
    locals: 0,
    requests: 0,
    reviews: 0,
    support: 0,
    notifications: 0,
  });

  async function fetchBadges() {
    try {
      const res = await authedFetch("/api/admin/activity-badges");
      if (res.ok) {
        const data = await res.json();
        setBadges(data);
        window.dispatchEvent(
          new CustomEvent("hal-admin-badges-synced", { detail: data })
        );
      }
    } catch {}
  }

  useEffect(() => {
    fetchBadges();

    const interval = setInterval(fetchBadges, 30000);
    const onFocus = () => fetchBadges();
    const onRefresh = () => fetchBadges();

    window.addEventListener("focus", onFocus);
    window.addEventListener("hal-admin-badges-refresh", onRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("hal-admin-badges-refresh", onRefresh);
    };
  }, []);

  // When admin navigates to a section, automatically clear its unread badge
  useEffect(() => {
    let categoryToClear = "";
    if (pathname.startsWith("/admin/locals")) categoryToClear = "locals";
    else if (pathname.startsWith("/admin/requests")) categoryToClear = "requests";
    else if (pathname.startsWith("/admin/reviews")) categoryToClear = "reviews";
    else if (pathname.startsWith("/admin/support")) categoryToClear = "support";
    else if (pathname.startsWith("/admin/notifications")) categoryToClear = "notifications";

    if (categoryToClear) {
      authedFetch("/api/admin/activity-badges/clear", {
        method: "POST",
        body: JSON.stringify({ category: categoryToClear }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((updated) => {
          if (updated) {
            setBadges({
              total: updated.total,
              locals: updated.locals,
              requests: updated.requests,
              reviews: updated.reviews,
              support: updated.support,
              notifications: updated.notifications,
            });
            window.dispatchEvent(
              new CustomEvent("hal-admin-badges-synced", { detail: updated })
            );
          }
        })
        .catch(() => {});
    }
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function logout() {
    clearSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="admin-v2-sidebar-inner">
      <div className="admin-v2-brand">
        <img
          src="/icon.svg"
          alt=""
          aria-hidden="true"
          width={38}
          height={38}
          className="admin-v2-brand-favicon"
        />

        <div>
          <strong>HireALocals</strong>
          <span>Admin Console</span>
        </div>
      </div>

      <nav
        className="admin-v2-nav"
        aria-label="Admin navigation"
      >
        {groups.map((group) => (
          <div
            className="admin-v2-nav-group"
            key={group.label}
          >
            <div className="admin-v2-nav-label">
              {group.label}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const count = item.badgeKey ? badges[item.badgeKey] || 0 : 0;

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={
                    active
                      ? "admin-v2-nav-link active"
                      : "admin-v2-nav-link"
                  }
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={17} strokeWidth={1.9} />

                  <span>{item.label}</span>

                  {count > 0 ? (
                    <span
                      className="admin-v2-nav-badge"
                      aria-label={`${count} unread notifications for ${item.label}`}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-v2-sidebar-footer">
        <button
          type="button"
          className="admin-v2-logout"
          onClick={logout}
        >
          <LogOut size={17} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
