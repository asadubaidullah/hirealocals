"use client";

import Link from "next/link";
import {
  Bell,
  CalendarDays,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";

import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

type Me = {
  full_name: string;
  email: string;
  image_url?: string;
};

const links = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My bookings",
    href: "/dashboard/bookings",
    icon: CalendarDays,
  },
  {
    label: "Custom requests",
    href: "/dashboard/requests",
    icon: Sparkles,
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageCircle,
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    label: "Saved locals",
    href: "/dashboard/saved",
    icon: Heart,
  },
  {
    label: "Reviews",
    href: "/dashboard/reviews",
    icon: Star,
  },
  {
    label: "Referrals & Rewards",
    href: "/dashboard/referrals",
    icon: Sparkles,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: UserRound,
  },
] as const;

const mobileLinks = [
  links[0], // Overview
  links[1], // My bookings
  links[2], // Custom requests
  links[3], // Messages
  links[5], // Saved locals
];

export default function TravelerSidebar({
  me,
}: {
  me: Me;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const initial =
    me.full_name.trim().charAt(0).toUpperCase() || "T";

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href ||
        pathname.startsWith(`${href}/`);

  function logout() {
    clearSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="pro-sidebar traveler-sidebar">

        <Link href="/" className="pro-sidebar-brand">
          <img src="/icon.svg" alt="" />
          <div>
            <strong>HireALocals</strong>
            <span>Traveler</span>
          </div>
        </Link>

        <div className="pro-sidebar-account">

          <div className="pro-sidebar-avatar">
            {me.image_url ? (
              <img src={me.image_url} alt={me.full_name} />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <div>
            <strong>{me.full_name}</strong>
            <span>{me.email}</span>
          </div>

        </div>

        <div className="pro-sidebar-label">
          Your trips
        </div>

        <nav
          className="pro-sidebar-nav"
          aria-label="Traveler dashboard"
        >
          {links.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? "active" : ""}
              aria-current={isActive(href) ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="pro-sidebar-footer">

          <Link href="/explore">
            <Search size={17} />
            <span>Find a Local</span>
          </Link>

          <button type="button" onClick={logout}>
            <LogOut size={17} />
            <span>Log out</span>
          </button>

        </div>

      </aside>

      <nav
        className="pro-mobile-nav"
        aria-label="Traveler mobile navigation"
      >
        {mobileLinks.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isActive(href) ? "active" : ""}
          >
            <Icon size={20} />
            <span>
              {(label as string) === "My bookings"
                ? "Bookings"
                : (label as string) === "Custom requests"
                  ? "Requests"
                  : (label as string) === "Saved locals"
                    ? "Saved"
                    : label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
