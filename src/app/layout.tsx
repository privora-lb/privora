import type { Metadata } from "next";
import { Suspense } from "react";

import "@/app/globals.css";
import { CmsToastRouteListener } from "@/components/cms/cms-toast-route-listener";

export const metadata: Metadata = {
  title: "Reservation Tracking",
  description: "Internal venue and space reservation calendar system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <CmsToastRouteListener />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
