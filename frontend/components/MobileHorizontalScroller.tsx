"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface MobileHorizontalScrollerProps {
  children: React.ReactNode;
  className?: string;
  autoScrollInterval?: number;
}

export default function MobileHorizontalScroller({
  children,
  className = "",
  autoScrollInterval = 3800,
}: MobileHorizontalScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cardCount, setCardCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  const isPausedRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to discover the actual scroll container and cards
  const getContext = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return null;
    const grid = scroller.firstElementChild as HTMLElement | null;
    if (!grid) return null;
    const cards = Array.from(grid.children) as HTMLElement[];
    return { scroller, grid, cards };
  }, []);

  // Update card count on mount or children change
  useEffect(() => {
    const ctx = getContext();
    if (ctx && ctx.cards.length > 0) {
      setCardCount(ctx.cards.length);
    }
  }, [getContext, children]);

  // Scroll to a specific card index
  const scrollToCard = useCallback(
    (index: number, immediate = false) => {
      const ctx = getContext();
      if (!ctx || !ctx.cards[index]) return;
      const { scroller, cards } = ctx;
      const card = cards[index];

      // Lock handleScroll from overwriting our target active index
      isAutoScrollingRef.current = true;
      setActiveIndex(index);
      activeIndexRef.current = index;

      // Calculate reliable target left offset
      const scrollerRect = scroller.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const targetLeft = Math.max(
        0,
        Math.round(scroller.scrollLeft + (cardRect.left - scrollerRect.left) - 16)
      );

      scroller.scrollTo({
        left: targetLeft,
        behavior: immediate ? "auto" : "smooth",
      });

      // Release lock after smooth scroll animation completes
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 700);
    },
    [getContext]
  );

  // Pause and resume helpers
  const pause = useCallback((durationMs = 4500) => {
    isPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (durationMs > 0) {
      resumeTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, durationMs);
    }
  }, []);

  const resume = useCallback((delayMs = 2500) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, delayMs);
  }, []);

  // Track active card on manual swipe/scroll
  useEffect(() => {
    const ctx = getContext();
    if (!ctx || ctx.cards.length <= 1) return;
    const { scroller } = ctx;

    let ticking = false;

    const handleScroll = () => {
      // Do not overwrite activeIndex while programmatic auto-advance animation is in progress
      if (isAutoScrollingRef.current) return;

      if (!ticking) {
        requestAnimationFrame(() => {
          ticking = false;
          if (isAutoScrollingRef.current) return;

          const currentCtx = getContext();
          if (!currentCtx || currentCtx.cards.length <= 1) return;
          const { scroller: s, cards } = currentCtx;
          const sLeft = s.getBoundingClientRect().left;

          let bestIdx = 0;
          let minDiff = Infinity;

          cards.forEach((card, i) => {
            const r = card.getBoundingClientRect();
            // Card left relative to container padding (16px)
            const diff = Math.abs(r.left - sLeft - 16);
            if (diff < minDiff) {
              minDiff = diff;
              bestIdx = i;
            }
          });

          setActiveIndex(bestIdx);
          activeIndexRef.current = bestIdx;
        });
        ticking = true;
      }
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", handleScroll);
  }, [getContext, cardCount]);

  // Auto-advance loop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const interval = setInterval(() => {
      // Pause checks
      if (isPausedRef.current) return;
      if (document.hidden) return;
      if (window.innerWidth > 768) return;

      const ctx = getContext();
      if (!ctx || ctx.cards.length <= 1) return;

      const count = ctx.cards.length;
      const nextIdx = (activeIndexRef.current + 1) % count;

      if (nextIdx === 0) {
        // Smooth loop back to the first card
        isAutoScrollingRef.current = true;
        setActiveIndex(0);
        activeIndexRef.current = 0;
        ctx.scroller.scrollTo({ left: 0, behavior: "smooth" });
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 700);
      } else {
        scrollToCard(nextIdx);
      }
    }, autoScrollInterval);

    return () => {
      clearInterval(interval);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [getContext, autoScrollInterval, cardCount, scrollToCard]);

  return (
    <div className="hal-carousel-container">
      <div
        ref={scrollerRef}
        className={`hal-mobile-scroller-wrap ${className}`}
        onTouchStart={() => pause(6000)}
        onTouchEnd={() => resume(2500)}
        onTouchCancel={() => resume(2500)}
        onPointerDown={() => pause(6000)}
        onPointerUp={() => resume(2500)}
        onPointerCancel={() => resume(2500)}
        onMouseEnter={() => pause(0)}
        onMouseLeave={() => resume(2000)}
      >
        {children}
      </div>

      {cardCount > 1 && (
        <div
          className="hal-carousel-indicators"
          aria-label="Carousel slide indicators"
        >
          {Array.from({ length: cardCount }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`hal-carousel-dot ${idx === activeIndex ? "is-active" : ""}`}
              onClick={() => {
                pause(4000);
                scrollToCard(idx);
              }}
              aria-label={`Go to slide ${idx + 1} of ${cardCount}`}
              aria-current={idx === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
