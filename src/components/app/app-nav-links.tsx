"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ApprovalPendingBadge } from "@/components/app/approval-pending-badge";
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
  initialPendingApprovalsCount,
  ownerSelectedVenueId,
  ownerVenueIds,
  role,
  whatsAppLink,
}: {
  initialPendingApprovalsCount: number;
  ownerSelectedVenueId?: string;
  ownerVenueIds: string[];
  role: UserRole;
  whatsAppLink?: ReactNode;
}) {
  const pathname = usePathname();
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
      className="relative z-50 order-1 lg:order-none lg:flex lg:min-w-0 lg:justify-center lg:px-4 xl:px-6"
    >
      <input className="peer sr-only" id="main-navigation-toggle" type="checkbox" />
      <label
        aria-label="Toggle navigation menu"
        className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[#EACC84]/35 bg-[#FCFCF0] text-[#123C36] shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:bg-[#F6E4AE] peer-checked:border-[#EACC84] peer-checked:bg-[#F6E4AE] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#EACC84]/50 lg:hidden"
        htmlFor="main-navigation-toggle"
      >
        <Menu size={19} strokeWidth={2.6} aria-hidden="true" />
      </label>
      <div
        className={cn(
          "invisible pointer-events-none fixed left-3 right-3 top-[74px] z-[70] max-h-0 -translate-y-2 overflow-hidden rounded-[18px] border border-[#EACC84]/20 bg-[#06302A] p-0 opacity-0 shadow-[0_24px_60px_rgba(18,60,54,0.24),inset_0_1px_0_rgba(252,252,240,0.06)] transition-[max-height,opacity,transform,padding,visibility] duration-300 ease-out peer-checked:visible peer-checked:pointer-events-auto peer-checked:max-h-80 peer-checked:translate-y-0 peer-checked:p-2 peer-checked:opacity-100 lg:visible lg:pointer-events-auto lg:static lg:flex lg:max-h-none lg:translate-y-0 lg:items-center lg:justify-center lg:gap-5 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100 lg:shadow-none lg:transition-none xl:gap-7",
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
                  "flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EACC84]/70 lg:inline-flex lg:h-12 lg:rounded-none lg:px-1 lg:text-[13px] lg:font-semibold xl:text-sm",
                  isActive
                    ? "bg-[#EACC84] text-[#123C36] shadow-[0_10px_24px_rgba(0,0,0,0.14)] lg:bg-transparent lg:font-black lg:text-[#FCFCF0] lg:shadow-none lg:[text-shadow:0_1px_18px_rgba(234,204,132,0.28)]"
                    : "text-[#EACC84]/78 hover:bg-white/10 hover:text-[#FCFCF0] lg:text-[#EACC84]/72 lg:hover:bg-transparent lg:hover:text-[#FCFCF0]",
                )}
                href={item.href}
                key={itemPath}
              >
                <span className="relative inline-flex items-center justify-center leading-none">
                  {item.label}
                  {itemPath === "/approvals" ? (
                    <ApprovalPendingBadge
                      initialCount={initialPendingApprovalsCount}
                      key={`${role}:${ownerSelectedVenueId ?? "all"}:${initialPendingApprovalsCount}`}
                      ownerSelectedVenueId={ownerSelectedVenueId}
                      ownerVenueIds={ownerVenueIds}
                      role={role}
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
          {whatsAppLink ? (
            <div className="lg:hidden">{whatsAppLink}</div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
