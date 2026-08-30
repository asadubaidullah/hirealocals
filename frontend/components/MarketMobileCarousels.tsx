"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTORS=[
  ".home-service-grid",
  ".home-city-grid",
  ".home-local-grid",
  ".home-process-grid",
  ".home-trust-grid",
  ".home-guide-grid",

  ".experience-card-grid",
  ".destination-card-grid",
  ".market-value-grid",
  ".safety-feature-grid",
  ".become-benefit-grid",
  ".support-topic-grid"
];

export default function MarketMobileCarousels(){
  const pathname=usePathname();

  useEffect(()=>{
    const media=
      window.matchMedia("(max-width: 760px)");

    if(!media.matches)return;

    const cleanups:(()=>void)[]=[];

    SELECTORS.forEach(selector=>{
      const carousel=
        document.querySelector<HTMLElement>(selector);

      if(!carousel)return;

      /*
       * Homepage may already be enhanced by the existing
       * HomeMobileCarousels component.
       */
      if(
        carousel.closest(".hal-mobile-slider-shell")||
        carousel.closest(".market-mobile-slider-shell")
      ){
        return;
      }

      const cards=
        Array.from(carousel.children)
          .filter(
            child=>child instanceof HTMLElement
          ) as HTMLElement[];

      if(cards.length<2)return;

      const parent=carousel.parentElement;
      if(!parent)return;

      const shell=document.createElement("div");
      shell.className="market-mobile-slider-shell";

      parent.insertBefore(shell,carousel);
      shell.appendChild(carousel);

      const prev=document.createElement("button");
      prev.type="button";
      prev.className=
        "market-mobile-slider-arrow market-mobile-slider-prev";
      prev.setAttribute("aria-label","Previous card");
      prev.innerHTML="&#8249;";

      const next=document.createElement("button");
      next.type="button";
      next.className=
        "market-mobile-slider-arrow market-mobile-slider-next";
      next.setAttribute("aria-label","Next card");
      next.innerHTML="&#8250;";

      shell.appendChild(prev);
      shell.appendChild(next);

      const dots=document.createElement("div");
      dots.className="market-mobile-slider-dots";
      dots.setAttribute("aria-label","Carousel position");

      const dotButtons=cards.map((_,index)=>{
        const dot=document.createElement("button");

        dot.type="button";
        dot.className="market-mobile-slider-dot";
        dot.setAttribute(
          "aria-label",
          `Go to card ${index+1}`
        );

        dots.appendChild(dot);

        return dot;
      });

      shell.appendChild(dots);

      let pausedUntil=0;
      let timer:number|undefined;

      const cardStep=()=>{
        const first=cards[0];

        if(!first)return carousel.clientWidth*.82;

        const styles=getComputedStyle(carousel);

        const gap=
          parseFloat(styles.columnGap||styles.gap||"0")||
          0;

        return first.getBoundingClientRect().width+gap;
      };

      const activeIndex=()=>{
        const step=cardStep();

        if(step<=0)return 0;

        return Math.max(
          0,
          Math.min(
            cards.length-1,
            Math.round(carousel.scrollLeft/step)
          )
        );
      };

      const updateDots=()=>{
        const active=activeIndex();

        dotButtons.forEach((dot,index)=>{
          dot.classList.toggle(
            "is-active",
            index===active
          );

          dot.setAttribute(
            "aria-current",
            index===active?"true":"false"
          );
        });
      };

      const goTo=(index:number)=>{
        const safe=
          Math.max(
            0,
            Math.min(cards.length-1,index)
          );

        carousel.scrollTo({
          left:cardStep()*safe,
          behavior:"smooth"
        });
      };

      const nextCard=()=>{
        const current=activeIndex();
        const target=
          current>=cards.length-1
            ?0
            :current+1;

        goTo(target);
      };

      const previousCard=()=>{
        const current=activeIndex();
        const target=
          current<=0
            ?cards.length-1
            :current-1;

        goTo(target);
      };

      const pause=()=>{
        pausedUntil=Date.now()+9000;
      };

      const startTimer=()=>{
        if(
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches
        ){
          return;
        }

        timer=window.setInterval(()=>{
          if(Date.now()<pausedUntil)return;

          nextCard();
        },5200);
      };

      const onPrev=()=>{
        pause();
        previousCard();
      };

      const onNext=()=>{
        pause();
        nextCard();
      };

      const onScroll=()=>{
        window.requestAnimationFrame(updateDots);
      };

      prev.addEventListener("click",onPrev);
      next.addEventListener("click",onNext);

      carousel.addEventListener(
        "scroll",
        onScroll,
        {passive:true}
      );

      carousel.addEventListener(
        "pointerdown",
        pause,
        {passive:true}
      );

      carousel.addEventListener(
        "touchstart",
        pause,
        {passive:true}
      );

      dotButtons.forEach((dot,index)=>{
        const handler=()=>{
          pause();
          goTo(index);
        };

        dot.addEventListener("click",handler);

        cleanups.push(
          ()=>dot.removeEventListener("click",handler)
        );
      });

      updateDots();
      startTimer();

      cleanups.push(()=>{
        if(timer){
          window.clearInterval(timer);
        }

        prev.removeEventListener("click",onPrev);
        next.removeEventListener("click",onNext);
        carousel.removeEventListener("scroll",onScroll);
        carousel.removeEventListener("pointerdown",pause);
        carousel.removeEventListener("touchstart",pause);

        if(shell.parentElement){
          shell.parentElement.insertBefore(
            carousel,
            shell
          );

          shell.remove();
        }
      });
    });

    return()=>{
      cleanups.reverse().forEach(cleanup=>cleanup());
    };

  },[pathname]);

  return null;
}

