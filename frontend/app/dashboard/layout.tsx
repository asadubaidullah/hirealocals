import type { Metadata } from "next";
import type { ReactNode } from "react";

import TravelerShell from "@/components/TravelerShell";

export const metadata: Metadata = {
  title: "Traveler Dashboard | HireALocals",
  robots: {
    index: false,
    follow: false,
  },
};

const authenticatedWorkspaceChrome = `
  .header,
  .marketplace-status-banner,
  .footer,
  .back-to-top {
    display: none !important;
  }
`;

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: authenticatedWorkspaceChrome,
        }}
      />

      <TravelerShell>
        {children}
      </TravelerShell>
    </>
  );
}
