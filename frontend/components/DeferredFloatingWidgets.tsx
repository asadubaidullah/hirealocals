"use client";

import dynamic from "next/dynamic";

const HelpChat = dynamic(() => import("@/components/HelpChat"), { ssr: false });
const BackToTop = dynamic(() => import("@/components/BackToTop"), { ssr: false });
const ScrollReveal = dynamic(() => import("@/components/ScrollReveal"), { ssr: false });

export default function DeferredFloatingWidgets() {
  return (
    <>
      <HelpChat />
      <BackToTop />
      <ScrollReveal />
    </>
  );
}
