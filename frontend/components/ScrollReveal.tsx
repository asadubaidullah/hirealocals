"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = [
  ".card",
  ".how-steps .how-step",
  ".feature",
  ".city-insight-card",
  ".city-trust-card",
  ".contact-direct-card",
  ".kpi",
  ".booking-box",
  ".form-box",
  ".cta",
  ".experience-service-card",
  ".destination-market-card",
  ".how-journey-card",
  ".safety-feature-grid article",
  ".become-benefit-grid article",
  ".support-topic-grid article",
  ".contact-method-card",
  ".market-value-grid article",
].join(",");

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") return;

    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!elements.length) return;

    const animations = new Map<Element, Animation>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target as HTMLElement;
          const index = elements.indexOf(el);
          const delay = (Math.max(index, 0) % 4) * 70;

          // Animate without changing className/style attributes owned by React.
          // Directly mutating those attributes can trigger hydration mismatches
          // during development refreshes and subsequent React renders.
          const animation = el.animate(
            [
              { opacity: 0, transform: "translateY(15px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 520,
              delay,
              easing: "ease",
              fill: "backwards",
            },
          );

          animations.set(el, animation);
          animation.addEventListener("finish", () => animations.delete(el), { once: true });
          animation.addEventListener("cancel", () => animations.delete(el), { once: true });
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
  }, [pathname]);

  return null;
}

