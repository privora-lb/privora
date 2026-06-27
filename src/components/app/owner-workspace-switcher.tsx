"use client";

import { Building2, Check, ChevronDown } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { setOwnerVenueAction } from "@/app/(app)/actions";
import type { AppUser, Venue } from "@/lib/types";
import { cn } from "@/lib/ui";

export function OwnerWorkspaceSwitcher({
  compact,
  selectedVenueId,
  user,
  venues,
}: {
  compact?: boolean;
  selectedVenueId?: string;
  user: AppUser;
  venues: Venue[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const switcherRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const queryVenueId = searchParams.get("venue");
  const currentVenueId = queryVenueId ?? selectedVenueId ?? null;
  const [optimisticSelection, setOptimisticSelection] = useState<{
    baseVenueId: string | null;
    venueId: string;
  }>();
  const optimisticVenueId =
    optimisticSelection?.baseVenueId === currentVenueId
      ? optimisticSelection.venueId
      : undefined;
  const activeVenue =
    venues.find((venue) => venue.id === optimisticVenueId) ??
    venues.find((venue) => venue.id === queryVenueId) ??
    venues.find((venue) => venue.id === selectedVenueId) ??
    venues[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  if (!activeVenue) {
    return <OwnerSummary compact={compact} user={user} />;
  }

  return (
    <div className="relative" ref={switcherRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Select active venue"
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/14 bg-white/92 text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition hover:bg-[#e2f7fb] focus:outline-none focus:ring-2 focus:ring-white/30",
          compact ? "p-1.5 sm:px-2" : "px-3 py-1.5",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#007c92] text-white">
          <Building2 size={15} aria-hidden="true" />
        </span>
        <span className={cn("min-w-0 text-left", compact && "hidden sm:block")}>
          <span className="block max-w-56 truncate text-sm font-black leading-tight text-slate-950">
            {activeVenue.name}
          </span>
          <span className="block max-w-56 truncate text-[11px] font-bold leading-tight text-[#007c92]">
            {activeVenue.typeName}
          </span>
        </span>
        {venues.length > 1 ? (
          <ChevronDown
            className={cn(
              "shrink-0 text-[#0b4658] transition",
              isOpen && "rotate-180",
              compact && "hidden sm:block",
            )}
            size={15}
            aria-hidden="true"
          />
        ) : null}
      </button>

      {isOpen && venues.length > 1 ? (
        <div className="fixed left-1/2 top-[68px] z-50 w-[calc(100vw-24px)] max-w-[340px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:absolute sm:top-full sm:mt-2 sm:w-[min(320px,calc(100vw-24px))]">
          <div className="px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#007c92]">
              Active venue
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
              {user.email ?? user.phoneNumber}
            </p>
          </div>
          <div className="grid max-h-72 gap-1 overflow-y-auto">
            {venues.map((venue) => {
              const isSelected = venue.id === activeVenue.id;

              return (
                <form action={setOwnerVenueAction} key={venue.id}>
                  <input name="venueId" readOnly type="hidden" value={venue.id} />
                  <input
                    name="returnTo"
                    readOnly
                    type="hidden"
                    value={getReturnTo(pathname, searchParams, venue.id)}
                  />
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f5fbfd]",
                      isSelected && "bg-[#eefbfc]",
                    )}
                    onClick={() =>
                      setOptimisticSelection({
                        baseVenueId: currentVenueId,
                        venueId: venue.id,
                      })
                    }
                    type="submit"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[#007c92]">
                      <Building2 size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">
                        {venue.name}
                      </span>
                      <span className="block truncate text-xs font-bold text-slate-500">
                        {venue.typeName}
                      </span>
                    </span>
                    {isSelected ? (
                      <Check className="shrink-0 text-[#007c92]" size={16} />
                    ) : null}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OwnerSummary({
  compact,
  user,
}: {
  compact?: boolean;
  user: AppUser;
}) {
  const initials = getInitials(user.name);

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

function getReturnTo(
  pathname: string,
  searchParams: URLSearchParams,
  venueId: string,
) {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (pathname === "/calendar" || pathname === "/approvals") {
    nextParams.set("venue", venueId);
  }

  const query = nextParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
