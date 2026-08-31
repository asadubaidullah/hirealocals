"use client";

import { useEffect } from "react";

const selectors = [
  ".hal-service-grid",
  ".hal-destination-grid",
  ".hal-local-grid",
  ".hal-guide-grid",
];

export default function HomeMobileCarousels() {
  useEffect(() => {
    // Only execute on mobile devices
    if (typeof window === "undefined" || window.innerWidth > 768) {
      return;
    }

    let isDestroyed = false;
    const cleanups: Array<() => void> = [];

    // Schedule initialization when main thread is idle
    const initTimer = setTimeout(() => {
      if (isDestroyed) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      for (const selector of selectors) {
        const found = document.querySelector<HTMLElement>(selector);
        if (!found || found.children.length < 2 || found.dataset.proCarousel === "1") {
          continue;
        }

        const rail: HTMLElement = found;
        const parent = rail.parentElement;
        if (!parent) continue;

        rail.dataset.proCarousel = "1";

        // Shell
        const shell = document.createElement("div");
        shell.className = "hal-pro-home-slider";
        parent.insertBefore(shell, rail);
        shell.appendChild(rail);

        // Arrow Controls
        const controls = document.createElement("div");
        controls.className = "hal-pro-home-slider-controls";

        const prev = document.createElement("button");
        prev.type = "button";
        prev.className = "hal-pro-home-slider-arrow hal-pro-home-slider-prev";
        prev.setAttribute("aria-label", "Previous cards");
        prev.innerHTML = "&#8249;";

        const next = document.createElement("button");
        next.type = "button";
        next.className = "hal-pro-home-slider-arrow hal-pro-home-slider-next";
        next.setAttribute("aria-label", "Next cards");
        next.innerHTML = "&#8250;";

        controls.appendChild(prev);
        controls.appendChild(next);
        shell.appendChild(controls);

        // Dots with valid ARIA tablist
        const dots = document.createElement("div");
        dots.className = "hal-pro-home-slider-dots";
        dots.setAttribute("role", "tablist");
        dots.setAttribute("aria-label", "Carousel navigation");

        const dotButtons: HTMLButtonElement[] = [];

        for (let index = 0; index < rail.children.length; index++) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.setAttribute("role", "tab");
          dot.className = "hal-pro-home-slider-dot" + (index === 0 ? " is-active" : "");
          dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
          dot.setAttribute("aria-selected", index === 0 ? "true" : "false");
          dot.dataset.index = String(index);

          dots.appendChild(dot);
          dotButtons.push(dot);
        }

        shell.appendChild(dots);

        // Cached step size calculation
        let cachedStep = 0;
        function updateStep() {
          const first = rail.firstElementChild;
          if (first instanceof HTMLElement) {
            const gap = 12;
            cachedStep = first.offsetWidth + gap;
          } else {
            cachedStep = Math.max(rail.clientWidth * 0.8, 220);
          }
        }
        updateStep();

        function setActiveDot(requestedIndex: number) {
          const last = dotButtons.length - 1;
          const index = Math.max(0, Math.min(requestedIndex, last));

          dotButtons.forEach((dot, dotIndex) => {
            const isActive = dotIndex === index;
            dot.classList.toggle("is-active", isActive);
            dot.setAttribute("aria-selected", isActive ? "true" : "false");
          });
        }

        function getCurrentIndex(): number {
          if (cachedStep <= 0) return 0;
          return Math.round(rail.scrollLeft / cachedStep);
        }

        function goTo(index: number) {
          const last = rail.children.length - 1;
          const target = Math.max(0, Math.min(index, last));

          rail.scrollTo({
            left: (cachedStep || 240) * target,
            behavior: reducedMotion ? "auto" : "smooth",
          });
          setActiveDot(target);
        }

        function previousCard() {
          const current = getCurrentIndex();
          if (current <= 0) {
            goTo(rail.children.length - 1);
          } else {
            goTo(current - 1);
          }
        }

        function nextCard() {
          const current = getCurrentIndex();
          if (current >= rail.children.length - 1) {
            goTo(0);
          } else {
            goTo(current + 1);
          }
        }

        prev.addEventListener("click", previousCard);
        next.addEventListener("click", nextCard);

        const dotHandlers: Array<() => void> = [];
        dotButtons.forEach((dot, index) => {
          const handler = () => goTo(index);
          dot.addEventListener("click", handler);
          dotHandlers.push(handler);
        });

        // Scroll listener with RAF throttle
        let scrollFrame: number | null = null;
        function syncDots() {
          if (scrollFrame !== null) return;
          scrollFrame = window.requestAnimationFrame(() => {
            scrollFrame = null;
            setActiveDot(getCurrentIndex());
          });
        }
        rail.addEventListener("scroll", syncDots, { passive: true });

        // Resize handler with debounce
        let resizeTimer: number | null = null;
        function onResize() {
          if (resizeTimer !== null) clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(updateStep, 150);
        }
        window.addEventListener("resize", onResize, { passive: true });

        cleanups.push(() => {
          if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
          if (resizeTimer !== null) clearTimeout(resizeTimer);
          window.removeEventListener("resize", onResize);
          rail.removeEventListener("scroll", syncDots);
          prev.removeEventListener("click", previousCard);
          next.removeEventListener("click", nextCard);
          dotButtons.forEach((dot, index) => {
            dot.removeEventListener("click", dotHandlers[index]);
          });
          delete rail.dataset.proCarousel;
          if (shell.parentElement) {
            shell.parentElement.insertBefore(rail, shell);
            shell.remove();
          }
        });
      }
    }, 60);

    return () => {
      isDestroyed = true;
      clearTimeout(initTimer);
      cleanups.forEach((c) => c());
    };
  }, []);

  return null;
}
