"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { clearSession } from "@/lib/auth";


type Me = {
  full_name: string;
  email: string;
  image_url?: string;
};


const links = [
  {
    label: "Overview",
    href: "/local-dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Booking requests",
    href: "/local-dashboard/bookings",
    icon: CalendarCheck2,
  },
  {
    label: "Services",
    href: "/local-dashboard/services",
    icon: BriefcaseBusiness,
  },
  {
    label: "Availability",
    href: "/local-dashboard/availability",
    icon: CalendarClock,
  },
  {
    label: "Messages",
    href: "/local-dashboard/messages",
    icon: MessageCircle,
  },
  {
    label: "Notifications",
    href: "/local-dashboard/notifications",
    icon: Bell,
  },
  {
    label: "Earnings",
    href: "/local-dashboard/earnings",
    icon: WalletCards,
  },
  {
    label: "Profile",
    href: "/local-dashboard/profile",
    icon: UserRound,
  },
] as const;


/*
  Mobile bottom navigation should stay focused on
  the highest-frequency Local actions.
*/

const mobilePrimaryLinks = [
  links[0], // Overview
  links[1], // Requests
  links[3], // Availability
  links[4], // Messages
] as const;


const mobileMoreLinks = [
  links[2], // Services
  links[5], // Notifications
  links[6], // Earnings
  links[7], // Profile
] as const;


export default function LocalSidebar({
  me,
}: {
  me: Me;
}) {

  const pathname =
    usePathname();

  const router =
    useRouter();

  const [moreOpen, setMoreOpen] =
    useState(false);


  const initial =
    me.full_name
      .trim()
      .charAt(0)
      .toUpperCase() || "L";


  const isActive = (
    href: string
  ) =>
    href === "/local-dashboard"
      ? pathname === href
      : pathname === href ||
        pathname.startsWith(
          `${href}/`
        );


  const moreActive =
    mobileMoreLinks.some(
      (item) =>
        isActive(item.href)
    );


  function closeMore() {
    setMoreOpen(false);
  }


  function logout() {

    setMoreOpen(false);

    clearSession();

    router.replace("/login");

    router.refresh();
  }


  return (
    <>

      {/* ================================================
          DESKTOP SIDEBAR — ALL 8 ITEMS
          ================================================ */}

      <aside className="pro-sidebar local-sidebar">

        <Link
          href="/"
          className="pro-sidebar-brand"
        >
          <img
            src="/icon.svg"
            alt=""
          />

          <div>
            <strong>
              HireALocals
            </strong>

            <span>
              Local Partner
            </span>
          </div>
        </Link>


        <div className="pro-sidebar-account">

          <div className="pro-sidebar-avatar">

            {me.image_url ? (
              <img
                src={me.image_url}
                alt={me.full_name}
              />
            ) : (
              <span>
                {initial}
              </span>
            )}

          </div>


          <div>
            <strong>
              {me.full_name}
            </strong>

            <span>
              {me.email}
            </span>
          </div>

        </div>


        <div className="pro-sidebar-label">
          Business workspace
        </div>


        <nav
          className="pro-sidebar-nav"
          aria-label="Local dashboard"
        >

          {links.map(
            ({
              label,
              href,
              icon: Icon,
            }) => (

              <Link
                key={href}
                href={href}

                className={
                  isActive(href)
                    ? "active"
                    : ""
                }

                aria-current={
                  isActive(href)
                    ? "page"
                    : undefined
                }
              >

                <Icon size={18} />

                <span>
                  {label}
                </span>

              </Link>

            )
          )}

        </nav>


        <div className="pro-sidebar-footer">

          <Link href="/">
            <span>
              Back to marketplace
            </span>
          </Link>


          <button
            type="button"
            onClick={logout}
          >

            <LogOut size={17} />

            <span>
              Log out
            </span>

          </button>

        </div>

      </aside>


      {/* ================================================
          MOBILE PRIMARY NAVIGATION
          ================================================ */}

      <nav
        className="pro-mobile-nav local-mobile-nav"
        aria-label="Local mobile navigation"
      >

        {mobilePrimaryLinks.map(
          ({
            label,
            href,
            icon: Icon,
          }) => (

            <Link
              key={href}
              href={href}

              className={
                isActive(href)
                  ? "active"
                  : ""
              }
            >

              <Icon size={20} />

              <span>
                {label ===
                "Booking requests"
                  ? "Requests"
                  : label}
              </span>

            </Link>

          )
        )}


        <button
          type="button"

          className={
            moreActive ||
            moreOpen
              ? "active"
              : ""
          }

          onClick={() =>
            setMoreOpen(
              (current) =>
                !current
            )
          }

          aria-expanded={moreOpen}
          aria-label="More Local workspace options"
        >

          <Menu size={20} />

          <span>
            More
          </span>

        </button>

      </nav>


      {/* ================================================
          MOBILE MORE SHEET
          ================================================ */}

      {moreOpen && (

        <div
          className="local-mobile-more-layer"

          onClick={closeMore}
        >

          <section
            className="local-mobile-more-sheet"

            role="dialog"
            aria-modal="true"
            aria-label="More Local workspace navigation"

            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="local-mobile-more-head">

              <div>
                <span>
                  Local workspace
                </span>

                <strong>
                  More
                </strong>
              </div>


              <button
                type="button"
                onClick={closeMore}
                aria-label="Close menu"
              >
                <X size={19} />
              </button>

            </div>


            <nav
              className="local-mobile-more-links"
              aria-label="Additional Local navigation"
            >

              {mobileMoreLinks.map(
                ({
                  label,
                  href,
                  icon: Icon,
                }) => (

                  <Link
                    key={href}
                    href={href}

                    onClick={closeMore}

                    className={
                      isActive(href)
                        ? "active"
                        : ""
                    }
                  >

                    <span className="local-more-icon">
                      <Icon size={19} />
                    </span>

                    <span>
                      <strong>
                        {label}
                      </strong>

                      <small>
                        {
                          label === "Services"
                            ? "Manage what travelers can book"
                            : label === "Notifications"
                              ? "Updates and account activity"
                              : label === "Earnings"
                                ? "Booking value and earnings"
                                : "Public profile and account details"
                        }
                      </small>
                    </span>

                  </Link>

                )
              )}

            </nav>


            <div className="local-mobile-more-footer">

              <Link
                href="/"
                onClick={closeMore}
              >
                Back to marketplace
              </Link>


              <button
                type="button"
                onClick={logout}
              >
                <LogOut size={17} />
                Log out
              </button>

            </div>

          </section>

        </div>

      )}

    </>
  );
}
