import type { Metadata } from "next";
import type { ReactNode } from "react";

import LocalShell from "@/components/LocalShell";

export const metadata: Metadata = {
  title: "Local Dashboard | HireALocals",
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

      <LocalShell>
        {children}
      </LocalShell>
    </>
  );
}
