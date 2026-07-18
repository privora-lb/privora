import type { Metadata } from "next";

import { PublicListingHeader } from "@/features/listings/public/public-listing-header";

export const metadata: Metadata = {
  title: {
    default: "Private Pools | Privora",
    template: "%s | Privora",
  },
  description: "Explore private pools and stays curated by Privora.",
};

export default function PublicListingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f2ea] text-slate-950">
      <PublicListingHeader />
      {children}
      <footer className="mt-16 border-t border-[#ded8c8] bg-[#123C36] px-4 py-8 text-center text-xs font-bold text-[#FCFCF0]/70">
        Privora · Preserve . Relax . Celebrate
      </footer>
    </div>
  );
}
