"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

export default function ActiveNavLink({ href, children, className = "", exact = false, matchPrefixes = [] }: Props) {
  const pathname = usePathname();
  const matchesHref = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const matchesExtra = matchPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const active = matchesHref || matchesExtra;

  return (
    <Link
      href={href}
      className={`${className} ${active ? "is-active" : ""}`.trim()}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

