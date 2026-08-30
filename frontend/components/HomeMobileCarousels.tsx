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
    const mobile = window.matchMedia(
      "(max-width: 760px)"
    );

    if (!mobile.matches) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cleanups: Array<() => void> = [];

    for (const selector of selectors) {
      const found =
        document.querySelector<HTMLElement>(
          selector
        );

      if (
        !found ||
        found.children.length < 2 ||
        found.dataset.proCarousel === "1"
      ) {
        continue;
      }

      const rail: HTMLElement = found;
      const parent = rail.parentElement;

      if (!parent) {
        continue;
      }

      rail.dataset.proCarousel = "1";


      // ======================================================
      // SHELL
      // ======================================================

      const shell =
        document.createElement("div");

      shell.className =
        "hal-pro-home-slider";

      parent.insertBefore(shell, rail);
      shell.appendChild(rail);


      // ======================================================
      // ARROW CONTROLS
      // ======================================================

      const controls =
        document.createElement("div");

      controls.className =
        "hal-pro-home-slider-controls";


      const prev =
        document.createElement("button");

      prev.type = "button";

      prev.className =
        "hal-pro-home-slider-arrow " +
        "hal-pro-home-slider-prev";

      prev.setAttribute(
        "aria-label",
        "Previous cards"
      );

      prev.innerHTML = "&#8249;";


      const next =
        document.createElement("button");

      next.type = "button";

      next.className =
        "hal-pro-home-slider-arrow " +
        "hal-pro-home-slider-next";

      next.setAttribute(
        "aria-label",
        "Next cards"
      );

      next.innerHTML = "&#8250;";


      controls.appendChild(prev);
      controls.appendChild(next);
      shell.appendChild(controls);


      // ======================================================
      // DOT INDICATORS
      // ======================================================

      const dots =
        document.createElement("div");

      dots.className =
        "hal-pro-home-slider-dots";

      dots.setAttribute(
        "aria-label",
        "Carousel position"
      );


      const dotButtons: HTMLButtonElement[] = [];


      for (
        let index = 0;
        index < rail.children.length;
        index++
      ) {
        const dot =
          document.createElement("button");

        dot.type = "button";

        dot.className =
          "hal-pro-home-slider-dot" +
          (index === 0 ? " is-active" : "");

        dot.setAttribute(
          "aria-label",
          `Go to card ${index + 1}`
        );

        dot.dataset.index =
          String(index);

        dots.appendChild(dot);
        dotButtons.push(dot);
      }


      shell.appendChild(dots);


      // ======================================================
      // CARD SIZE
      // ======================================================

      function getStep(): number {
        const first =
          rail.firstElementChild;

        if (!(first instanceof HTMLElement)) {
          return Math.max(
            rail.clientWidth * 0.8,
            220
          );
        }

        const computed =
          window.getComputedStyle(rail);

        const rawGap =
          computed.columnGap ||
          computed.gap ||
          "12";

        const parsed =
          Number.parseFloat(rawGap);

        const gap =
          Number.isFinite(parsed)
            ? parsed
            : 12;

        return (
          first.getBoundingClientRect().width +
          gap
        );
      }


      // ======================================================
      // ACTIVE DOT
      // ======================================================

      function setActiveDot(
        requestedIndex: number
      ) {
        const last =
          dotButtons.length - 1;

        const index =
          Math.max(
            0,
            Math.min(requestedIndex, last)
          );

        dotButtons.forEach(
          (dot, dotIndex) => {
            dot.classList.toggle(
              "is-active",
              dotIndex === index
            );

            dot.setAttribute(
              "aria-current",
              dotIndex === index
                ? "true"
                : "false"
            );
          }
        );
      }


      function getCurrentIndex(): number {
        const step =
          getStep();

        if (step <= 0) {
          return 0;
        }

        return Math.round(
          rail.scrollLeft / step
        );
      }


      // ======================================================
      // MOVEMENT
      // ======================================================

      function goTo(
        index: number
      ) {
        const last =
          rail.children.length - 1;

        const target =
          Math.max(
            0,
            Math.min(index, last)
          );

        rail.scrollTo({
          left:
            getStep() *
            target,

          behavior:
            reducedMotion
              ? "auto"
              : "smooth",
        });

        setActiveDot(target);
      }


      function move(
        direction: number
      ) {
        goTo(
          getCurrentIndex() +
          direction
        );
      }


      function previousCard() {
        const current =
          getCurrentIndex();

        if (current <= 0) {
          goTo(
            rail.children.length - 1
          );
        } else {
          move(-1);
        }
      }


      function nextCard() {
        const current =
          getCurrentIndex();

        if (
          current >=
          rail.children.length - 1
        ) {
          goTo(0);
        } else {
          move(1);
        }
      }


      prev.addEventListener(
        "click",
        previousCard
      );

      next.addEventListener(
        "click",
        nextCard
      );


      // ======================================================
      // DOT CLICK EVENTS
      // ======================================================

      const dotHandlers:
        Array<() => void> = [];


      dotButtons.forEach(
        (dot, index) => {
          const handler =
            () => goTo(index);

          dot.addEventListener(
            "click",
            handler
          );

          dotHandlers.push(handler);
        }
      );


      // ======================================================
      // SYNC DOT AFTER FINGER SWIPE
      // ======================================================

      let scrollFrame:
        number | null = null;


      function syncDots() {
        if (scrollFrame !== null) {
          return;
        }

        scrollFrame =
          window.requestAnimationFrame(
            () => {
              scrollFrame = null;

              setActiveDot(
                getCurrentIndex()
              );
            }
          );
      }


      rail.addEventListener(
        "scroll",
        syncDots,
        { passive: true }
      );


      // ======================================================
      // AUTOPLAY
      // ======================================================

      let intervalId:
        number | null = null;

      let resumeId:
        number | null = null;

      let interacting = false;


      function startAuto() {
        if (
          reducedMotion ||
          intervalId !== null
        ) {
          return;
        }

        intervalId =
          window.setInterval(
            nextCard,
            4300
          );
      }


      function stopAuto() {
        if (intervalId === null) {
          return;
        }

        window.clearInterval(
          intervalId
        );

        intervalId = null;
      }


      function pauseAuto() {
        interacting = true;

        stopAuto();

        if (resumeId !== null) {
          window.clearTimeout(
            resumeId
          );

          resumeId = null;
        }
      }


      function resumeAuto() {
        interacting = false;

        if (resumeId !== null) {
          window.clearTimeout(
            resumeId
          );
        }

        resumeId =
          window.setTimeout(
            () => {
              resumeId = null;

              if (!interacting) {
                startAuto();
              }
            },
            1800
          );
      }


      rail.addEventListener(
        "pointerdown",
        pauseAuto
      );

      rail.addEventListener(
        "pointerup",
        resumeAuto
      );

      rail.addEventListener(
        "pointercancel",
        resumeAuto
      );


      dots.addEventListener(
        "pointerdown",
        pauseAuto
      );

      dots.addEventListener(
        "pointerup",
        resumeAuto
      );


      startAuto();


      // ======================================================
      // CLEANUP
      // ======================================================

      cleanups.push(() => {
        stopAuto();

        if (resumeId !== null) {
          window.clearTimeout(
            resumeId
          );
        }

        if (scrollFrame !== null) {
          window.cancelAnimationFrame(
            scrollFrame
          );
        }

        rail.removeEventListener(
          "scroll",
          syncDots
        );

        rail.removeEventListener(
          "pointerdown",
          pauseAuto
        );

        rail.removeEventListener(
          "pointerup",
          resumeAuto
        );

        rail.removeEventListener(
          "pointercancel",
          resumeAuto
        );

        dots.removeEventListener(
          "pointerdown",
          pauseAuto
        );

        dots.removeEventListener(
          "pointerup",
          resumeAuto
        );

        prev.removeEventListener(
          "click",
          previousCard
        );

        next.removeEventListener(
          "click",
          nextCard
        );


        dotButtons.forEach(
          (dot, index) => {
            dot.removeEventListener(
              "click",
              dotHandlers[index]
            );
          }
        );


        delete rail.dataset.proCarousel;


        const currentParent =
          shell.parentElement;

        if (currentParent) {
          currentParent.insertBefore(
            rail,
            shell
          );

          shell.remove();
        }
      });
    }


    return () => {
      for (
        let index =
          cleanups.length - 1;

        index >= 0;

        index--
      ) {
        cleanups[index]();
      }
    };
  }, []);


  return null;
}
