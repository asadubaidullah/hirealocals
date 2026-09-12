"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SubmenuItem {
  label: string;
  href: string;
}

interface NavLinkItem {
  label: string;
  href?: string;
  isSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
}

interface NavSection {
  id: string;
  title: string;
  items: NavLinkItem[];
}

const DESTINATION_SUBMENU_LINKS: SubmenuItem[] = [
  { label: "Things to Do in London", href: "/uk/london/things-to-do" },
  { label: "Things to Do in New York", href: "/usa/new-york/things-to-do" },
  { label: "London", href: "/uk/london" },
  { label: "New York", href: "/usa/new-york" },
  { label: "All Destinations", href: "/destinations" },
];

const NAV_SECTIONS: NavSection[] = [
  {
    id: "explore",
    title: "Explore",
    items: [
      {
        label: "Destinations",
        isSubmenu: true,
        submenuItems: DESTINATION_SUBMENU_LINKS,
      },
      { label: "Experiences", href: "/experiences" },
      { label: "Travel Guides", href: "/blog" },
      { label: "Find a Local", href: "/explore" },
      { label: "Request a Local", href: "/request-a-local" },
    ],
  },
  {
    id: "company",
    title: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Trust & Safety", href: "/safety" },
      { label: "Contact & Support", href: "/contact" },
    ],
  },
  {
    id: "locals-legal",
    title: "For Locals & Legal",
    items: [
      { label: "Become a Local", href: "/become-a-local" },
      { label: "Local Dashboard", href: "/local-dashboard" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cancellation Policy", href: "/cancellation" },
      { label: "Refund Policy", href: "/refund" },
    ],
  },
];

export default function FooterNavAccordions() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [destMenuOpen, setDestMenuOpen] = useState(false);
  const destContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  // Close desktop submenu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        destContainerRef.current &&
        !destContainerRef.current.contains(e.target as Node)
      ) {
        setDestMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="hal-footer-nav-group">
      {NAV_SECTIONS.map((section) => {
        const isOpen = openSection === section.id;
        return (
          <div
            key={section.id}
            className={`hal-footer-col hal-nav-accordion-item ${
              isOpen ? "is-open" : ""
            }`}
          >
            {/* Desktop column header */}
            <strong className="hal-col-title-desktop">{section.title}</strong>

            {/* Mobile accordion trigger */}
            <button
              type="button"
              className="hal-col-accordion-trigger"
              onClick={() => toggleSection(section.id)}
              aria-expanded={isOpen}
              aria-controls={`footer-acc-${section.id}`}
            >
              <span>{section.title}</span>
              <ChevronDown
                size={16}
                className={`hal-col-chevron ${isOpen ? "is-rotated" : ""}`}
              />
            </button>

            {/* Nav links container */}
            <div
              id={`footer-acc-${section.id}`}
              className={`hal-col-collapse ${isOpen ? "is-expanded" : ""}`}
            >
              <nav
                className="hal-footer-nav"
                aria-label={`Footer ${section.title} Navigation`}
              >
                {section.items.map((item) => {
                  if (item.isSubmenu && item.submenuItems) {
                    return (
                      <div
                        key="destinations-submenu"
                        ref={destContainerRef}
                        className="hal-dest-submenu-container"
                      >
                        <button
                          type="button"
                          className="hal-dest-trigger"
                          aria-haspopup="true"
                          aria-expanded={destMenuOpen}
                          onClick={() => setDestMenuOpen((prev) => !prev)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setDestMenuOpen(false);
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDestMenuOpen((prev) => !prev);
                            }
                          }}
                        >
                          <ChevronRight size={12} className="hal-link-chevron" />
                          <span>Destinations</span>
                          <ChevronDown size={12} className="hal-dest-arrow" />
                        </button>

                        <div
                          className={`hal-dest-popover ${destMenuOpen ? "is-open" : ""}`}
                          role="menu"
                          aria-label="Destinations submenu"
                        >
                          {item.submenuItems.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="hal-dest-popover-link"
                              role="menuitem"
                              onClick={() => setDestMenuOpen(false)}
                            >
                              <ChevronRight size={11} className="hal-link-chevron" />
                              <span>{sub.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href!}
                      href={item.href!}
                      className="hal-footer-link"
                    >
                      <ChevronRight size={12} className="hal-link-chevron" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        );
      })}
    </div>
  );
}
