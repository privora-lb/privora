import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { logoutAction } from "@/app/(app)/actions";
import { AppNavLinks } from "@/components/app/app-nav-links";
import { OwnerWorkspaceSwitcher } from "@/components/app/owner-workspace-switcher";
import { RealtimeRouteRefresh } from "@/components/app/realtime-route-refresh";
import { SuperadminAccountButton } from "@/components/app/superadmin-account-button";
import type { AppUser, Venue } from "@/lib/types";
import { cn } from "@/lib/ui";
import privoraIcon from "../../../privora-icon.jpg.jpeg";

export function AppShell({
  children,
  initialOwnerPendingCountsByVenue,
  initialPendingApprovalsCount,
  ownerSelectedVenueId,
  ownerVenues = [],
  user,
}: {
  children: ReactNode;
  initialOwnerPendingCountsByVenue: Record<string, number>;
  initialPendingApprovalsCount: number;
  ownerSelectedVenueId?: string;
  ownerVenues?: Venue[];
  user: AppUser;
}) {
  return (
    <div className="min-h-screen bg-[#f4f2ea] text-slate-950">
      <Suspense fallback={null}>
        <RealtimeRouteRefresh
          ownerVenueIds={ownerVenues.map((venue) => venue.id)}
          userRole={user.role}
        />
      </Suspense>
      <header className="sticky top-0 z-[60] bg-transparent px-2 py-2 sm:px-4 lg:px-6 lg:py-3">
        <div className="mx-auto max-w-[1500px] rounded-[22px] border border-[#C0964E]/35 bg-[#123C36] p-2 shadow-[0_20px_54px_rgba(18,60,54,0.24)] ring-1 ring-[#FCFCF0]/10 sm:rounded-[28px] lg:rounded-[32px] lg:shadow-[0_24px_70px_rgba(18,60,54,0.26)]">
          <div className="flex flex-wrap items-center gap-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-3">
            <BrandMark />

            <AppNavLinks
              initialPendingApprovalsCount={initialPendingApprovalsCount}
              ownerSelectedVenueId={ownerSelectedVenueId}
              ownerVenueIds={ownerVenues.map((venue) => venue.id)}
              role={user.role}
              whatsAppLink={
                user.role === "owner" ? <WhatsAppButton mobileMenu /> : undefined
              }
            />

            <div className="relative z-50 order-2 ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 lg:hidden">
              <UserOrWorkspaceSummary
                compact
                initialPendingCountsByVenue={initialOwnerPendingCountsByVenue}
                ownerSelectedVenueId={ownerSelectedVenueId}
                ownerVenues={ownerVenues}
                user={user}
              />
              <LogoutButton iconOnly />
            </div>

            <div className="hidden items-center justify-end gap-2 lg:flex">
              <UserOrWorkspaceSummary
                initialPendingCountsByVenue={initialOwnerPendingCountsByVenue}
                ownerSelectedVenueId={ownerSelectedVenueId}
                ownerVenues={ownerVenues}
                user={user}
              />
              {user.role === "owner" ? <WhatsAppButton /> : null}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 py-5 sm:px-4 lg:px-6">{children}</main>
    </div>
  );
}

function UserOrWorkspaceSummary({
  compact,
  initialPendingCountsByVenue,
  ownerSelectedVenueId,
  ownerVenues,
  user,
}: {
  compact?: boolean;
  initialPendingCountsByVenue: Record<string, number>;
  ownerSelectedVenueId?: string;
  ownerVenues: Venue[];
  user: AppUser;
}) {
  if (user.role === "owner") {
    return (
      <Suspense fallback={<UserSummary compact={compact} user={user} />}>
        <OwnerWorkspaceSwitcher
          compact={compact}
          initialPendingCountsByVenue={initialPendingCountsByVenue}
          key={`${ownerSelectedVenueId ?? "none"}:${JSON.stringify(initialPendingCountsByVenue)}`}
          selectedVenueId={ownerSelectedVenueId}
          user={user}
          venues={ownerVenues}
        />
      </Suspense>
    );
  }

  return <SuperadminAccountButton compact={compact} user={user} />;
}

function BrandMark() {
  return (
    <Link
      aria-label="Privora calendar home"
      className="group hidden min-w-0 items-center gap-3 rounded-full transition lg:flex"
      href="/calendar"
    >
      <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#123C36] shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition group-hover:scale-[1.02] sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <Image
          alt=""
          className="scale-[1.72] object-cover"
          fill
          priority
          sizes="56px"
          src={privoraIcon}
        />
      </span>
      <span className="block min-w-0 pr-1 max-[420px]:hidden lg:hidden xl:block">
        <span
          className="block text-[19px] font-normal uppercase leading-none tracking-[0.18em] text-[#FCFCF0] lg:text-[21px]"
          style={{ fontFamily: "Didot, 'Bodoni 72', 'Times New Roman', serif" }}
        >
          Privora
        </span>
        <span className="mt-1 block truncate text-[8px] font-semibold uppercase leading-none tracking-[0.22em] text-[#EACC84] lg:text-[9px]">
          Preserve . Relax . Celebrate
        </span>
      </span>
    </Link>
  );
}

function UserSummary({
  compact,
  user,
}: {
  compact?: boolean;
  user: AppUser;
}) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/14 bg-white/92 text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.14)]",
        compact ? "p-1.5 sm:px-2" : "px-3 py-1.5",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#C0964E] text-[11px] font-black text-[#123C36]">
        {initials}
      </span>
      <span className={cn("min-w-0", compact && "hidden sm:block")}>
        <span className="block max-w-56 truncate text-sm font-black leading-tight text-slate-950">
          {user.email ?? user.phoneNumber}
        </span>
        <span className="block text-[11px] font-bold capitalize leading-tight text-[#967230]">
          {user.role}
        </span>
      </span>
    </div>
  );
}

function LogoutButton({ iconOnly }: { iconOnly?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        aria-label="Logout"
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#EACC84]/35 bg-[#FCFCF0] px-4 text-sm font-black text-[#123C36] shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-rose-200 hover:bg-[#fff1f2] hover:text-[#be123c] focus:outline-none focus:ring-2 focus:ring-[#EACC84]/40",
          iconOnly && "h-11 w-11 px-0 text-[#123C36]",
        )}
        type="submit"
      >
        <LogOut
          size={iconOnly ? 25 : 16}
          strokeWidth={iconOnly ? 3 : 2.4}
          aria-hidden="true"
        />
        {iconOnly ? <span className="sr-only">Logout</span> : "Logout"}
      </button>
    </form>
  );
}

function WhatsAppButton({
  iconOnly,
  mobileMenu,
}: {
  iconOnly?: boolean;
  mobileMenu?: boolean;
}) {
  const iconClassName = iconOnly
    ? "h-[23px] w-[23px]"
    : mobileMenu
      ? "h-5 w-5"
      : "h-[18px] w-[18px]";

  return (
    <a
      aria-label="Open WhatsApp chat"
      className={cn(
        mobileMenu
          ? "mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#86efac]/70 bg-[#16a34a] px-4 text-sm font-black text-white shadow-[0_12px_26px_rgba(22,163,74,0.28)] transition hover:border-[#bbf7d0] hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-[#bbf7d0]/70 lg:hidden"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#EACC84]/35 bg-[#FCFCF0] px-4 text-sm font-black text-[#123C36] shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-emerald-200 hover:bg-[#ecfdf3] hover:text-[#15803d] focus:outline-none focus:ring-2 focus:ring-[#EACC84]/40",
        iconOnly && !mobileMenu && "h-11 w-11 px-0",
      )}
      href="https://wa.me/96176702870"
      rel="noopener noreferrer"
      target="_blank"
      title="Open WhatsApp chat"
    >
      <WhatsAppIcon className={iconClassName} />
      {iconOnly ? <span className="sr-only">WhatsApp</span> : "WhatsApp"}
    </a>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12.04 2a9.9 9.9 0 0 0-8.56 14.88L2.4 22l5.25-1.38A9.96 9.96 0 1 0 12.04 2Zm0 18.21a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31A8.2 8.2 0 1 1 12.04 20.21Zm4.5-6.15c-.25-.12-1.47-.72-1.69-.8-.23-.09-.4-.12-.56.12-.16.25-.64.8-.78.96-.14.17-.29.18-.54.06-.25-.13-1.05-.39-2-1.24a7.48 7.48 0 0 1-1.39-1.73c-.14-.25-.02-.38.11-.51.12-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.02 2.58c.12.17 1.76 2.69 4.27 3.77.6.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}
