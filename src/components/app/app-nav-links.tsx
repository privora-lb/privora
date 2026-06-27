"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/ui";

const ownerLinks = [
  { href: "/calendar", label: "Calendar" },
  { href: "/approvals", label: "Approvals" },
];

const superadminLinks = [
  ...ownerLinks,
  { href: "/owners", label: "Owners" },
  { href: "/venues", label: "Venues" },
  { href: "/types", label: "Space Types" },
];

export function AppNavLinks({
  ownerSelectedVenueId,
  role,
}: {
  ownerSelectedVenueId?: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const links =
    role === "superadmin"
      ? superadminLinks
      : ownerLinks.map((link) => ({
          ...link,
          href: ownerSelectedVenueId
            ? `${link.href}?venue=${ownerSelectedVenueId}`
            : link.href,
        }));

  return (
    <nav
      aria-label="Main navigation"
      className="contents lg:flex lg:min-w-0 lg:justify-center lg:px-6"
    >
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className={cn(
          "order-1 grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-white/92 text-[#0b4658] shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:bg-[#e2f7fb] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 lg:hidden",
          isOpen && "border-[#9bdded] bg-[#e2f7fb] text-[#007c92]",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isOpen ? (
          <X size={18} strokeWidth={2.6} aria-hidden="true" />
        ) : (
          <Menu size={19} strokeWidth={2.6} aria-hidden="true" />
        )}
      </button>

      <div
        className={cn(
          "order-3 basis-full overflow-hidden rounded-[18px] border border-white/12 bg-[#0e4050] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[max-height,opacity,transform,margin] duration-300 ease-out lg:flex lg:max-h-none lg:basis-auto lg:translate-y-0 lg:items-center lg:justify-center lg:gap-9 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100 lg:shadow-none lg:transition-none",
          isOpen
            ? "mt-2 max-h-80 p-2 opacity-100 translate-y-0"
            : "mt-0 max-h-0 p-0 opacity-0 -translate-y-1 pointer-events-none lg:pointer-events-auto",
        )}
      >
        <div className="grid gap-1 lg:contents">
          {links.map((item) => {
            const itemPath = item.href.split("?")[0];
            const isActive =
              pathname === itemPath || pathname.startsWith(`${itemPath}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9bdded]/70 lg:inline-flex lg:h-12 lg:rounded-none lg:px-1 lg:text-base lg:font-semibold xl:text-lg",
                  isActive
                    ? "bg-[#e2f7fb] text-[#073947] shadow-[0_10px_24px_rgba(0,0,0,0.14)] lg:bg-transparent lg:font-black lg:text-white lg:shadow-none lg:[text-shadow:0_1px_18px_rgba(155,221,237,0.26)]"
                    : "text-[#c2dce3] hover:bg-white/10 hover:text-white lg:text-[#9bbdc8] lg:hover:bg-transparent lg:hover:text-[#e8fbfd]",
                )}
                href={item.href}
                key={itemPath}
                onClick={() => setIsOpen(false)}
              >
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
