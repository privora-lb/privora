"use client";

import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Venue } from "@/lib/types";
import { cn } from "@/lib/ui";

export function VenueSwitcher({
  venues,
  selectedVenueId,
  monthKey,
}: {
  venues: Venue[];
  selectedVenueId: string;
  monthKey: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const selectedVenue =
    venues.find((venue) => venue.id === selectedVenueId) ?? venues[0];
  const filteredVenues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return venues;
    }

    return venues.filter((venue) =>
      `${venue.name} ${venue.assignedUserName}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query, venues]);

  function selectVenue(venue: Venue) {
    setQuery("");
    setIsOpen(false);
    router.push(`/calendar?venue=${venue.id}&month=${monthKey}`);
  }

  return (
    <div className="relative w-full">
      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#EACC84]">
        Select venue or space
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#123C36]"
          size={17}
        />
        <input
          className="h-12 w-full rounded-xl border border-[#EACC84]/35 bg-white px-10 pr-11 text-sm font-bold text-[#123C36] shadow-[0_10px_24px_rgba(0,0,0,0.14)] outline-none transition placeholder:text-slate-400 focus:border-[#EACC84] focus:ring-2 focus:ring-[#EACC84]/30"
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 140);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={`${selectedVenue.name} - ${selectedVenue.assignedUserName}`}
          ref={inputRef}
          type="search"
          value={query}
        />
        <button
          aria-label="Open venue list"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#123C36] transition hover:bg-[#FCF7E8]"
          onClick={() => {
            setIsOpen((current) => !current);
            inputRef.current?.focus();
          }}
          type="button"
        >
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </div>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-30 mt-2 max-h-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[#EACC84]/45 bg-white p-2 shadow-[0_24px_60px_rgba(18,60,54,0.14)]"
          style={{
            width: "max(100%, min(560px, calc(100vw - 2rem)))",
          }}
        >
          {filteredVenues.length > 0 ? (
            filteredVenues.map((venue) => {
              const isSelected = venue.id === selectedVenue.id;

              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#FCF7E8]",
                    isSelected && "bg-[#FCF7E8]",
                  )}
                  key={venue.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectVenue(venue)}
                  type="button"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F6E4AE] text-[#123C36]">
                    <Building2 size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal break-words text-sm font-black leading-snug text-slate-950">
                      {venue.name}
                    </span>
                    <span className="block truncate text-xs font-bold text-slate-500">
                      Owner: {venue.assignedUserName}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check className="shrink-0 text-[#967230]" size={17} />
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm font-bold text-slate-500">
              No venues found.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
