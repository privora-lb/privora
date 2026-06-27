import {
  Building2,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { logoutAction } from "@/app/(app)/actions";
import { AppNavLinks } from "@/components/app/app-nav-links";
import { OwnerWorkspaceSwitcher } from "@/components/app/owner-workspace-switcher";
import { RealtimeRouteRefresh } from "@/components/app/realtime-route-refresh";
import type { AppUser, Venue } from "@/lib/types";
import { cn } from "@/lib/ui";

export function AppShell({
  children,
  ownerSelectedVenueId,
  ownerVenues = [],
  user,
}: {
  children: ReactNode;
  ownerSelectedVenueId?: string;
  ownerVenues?: Venue[];
  user: AppUser;
}) {
  return (
    <div className="min-h-screen bg-[#eef5f6] text-slate-950">
      <Suspense fallback={null}>
        <RealtimeRouteRefresh
          ownerVenueIds={ownerVenues.map((venue) => venue.id)}
          userRole={user.role}
        />
      </Suspense>
      <header className="sticky top-0 z-40 bg-transparent px-2 py-2 sm:px-4 lg:px-6 lg:py-3">
        <div className="mx-auto max-w-[1500px] rounded-[22px] border border-[#0f6f7d]/45 bg-[#123342] p-2 shadow-[0_20px_54px_rgba(15,23,42,0.18)] ring-1 ring-white/10 sm:rounded-[28px] lg:rounded-[32px] lg:shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
          <div className="flex flex-wrap items-center gap-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-3">
            <BrandMark />

            <AppNavLinks
              ownerSelectedVenueId={ownerSelectedVenueId}
              role={user.role}
            />

            <div className="order-2 ml-auto flex min-w-0 items-center gap-2 lg:hidden">
              <UserOrWorkspaceSummary
                compact
                ownerSelectedVenueId={ownerSelectedVenueId}
                ownerVenues={ownerVenues}
                user={user}
              />
              <LogoutButton iconOnly />
            </div>

            <div className="hidden items-center justify-end gap-2 lg:flex">
              <UserOrWorkspaceSummary
                ownerSelectedVenueId={ownerSelectedVenueId}
                ownerVenues={ownerVenues}
                user={user}
              />
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
  ownerSelectedVenueId,
  ownerVenues,
  user,
}: {
  compact?: boolean;
  ownerSelectedVenueId?: string;
  ownerVenues: Venue[];
  user: AppUser;
}) {
  if (user.role === "owner") {
    return (
      <Suspense fallback={<UserSummary compact={compact} user={user} />}>
        <OwnerWorkspaceSwitcher
          compact={compact}
          selectedVenueId={ownerSelectedVenueId}
          user={user}
          venues={ownerVenues}
        />
      </Suspense>
    );
  }

  return <UserSummary compact={compact} user={user} />;
}

function BrandMark() {
  return (
    <Link
      aria-label="Reservation calendar home"
      className="group hidden min-w-0 items-center gap-3 rounded-full transition lg:flex"
      href="/calendar"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e2f7fb] text-[#007c92] shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition group-hover:scale-[1.02] sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <Building2 size={20} aria-hidden="true" />
      </span>
      <span className="block min-w-0 pr-1 max-[420px]:hidden lg:hidden xl:block">
        <span className="block text-[14px] font-black leading-tight text-white lg:text-[15px]">
          Reservation
        </span>
        <span className="block truncate text-[11px] font-bold text-[#bdebf2] lg:text-[12px]">
          Calendar workspace
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
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#007c92] text-[11px] font-black text-white">
        {initials}
      </span>
      <span className={cn("min-w-0", compact && "hidden sm:block")}>
        <span className="block max-w-56 truncate text-sm font-black leading-tight text-slate-950">
          {user.email ?? user.phoneNumber}
        </span>
        <span className="block text-[11px] font-bold capitalize leading-tight text-[#007c92]">
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
          "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/92 px-4 text-sm font-black text-[#0b4658] shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:border-rose-200 hover:bg-[#fff1f2] hover:text-[#be123c] focus:outline-none focus:ring-2 focus:ring-white/30",
          iconOnly && "h-11 w-11 px-0 text-[#083746]",
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
