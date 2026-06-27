"use client";

import { Building2, Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { RequestStatus } from "@/lib/types";
import { cn } from "@/lib/ui";

export type ApprovalVenueFilterOption = {
  id: string;
  name: string;
  typeName: string;
};

export function ApprovalsTableFilters({
  selectedStatus,
  selectedVenueId,
  showVenueFilter = true,
  venues,
  onStatusChange,
  onVenueChange,
}: {
  selectedStatus: RequestStatus | "all";
  selectedVenueId: string;
  showVenueFilter?: boolean;
  venues: ApprovalVenueFilterOption[];
  onStatusChange: (status: RequestStatus | "all") => void;
  onVenueChange: (venueId: string) => void;
}) {
  return (
    <>
      <select
        aria-label="Filter requests by status"
        className="h-9 w-[132px] shrink-0 rounded-lg border border-white/18 bg-white/92 px-2.5 text-[12px] font-semibold text-[#123342] outline-none shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition focus:border-[#9bdded] focus:ring-3 focus:ring-[#9bdded]/20 max-[640px]:w-full"
        onChange={(event) =>
          onStatusChange(event.target.value as RequestStatus | "all")
        }
        value={selectedStatus}
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
      {showVenueFilter ? (
        <ApprovalVenueFilter
          onChange={onVenueChange}
          selectedVenueId={selectedVenueId}
          venues={venues}
        />
      ) : null}
    </>
  );
}

function ApprovalVenueFilter({
  selectedVenueId,
  venues,
  onChange,
}: {
  selectedVenueId: string;
  venues: ApprovalVenueFilterOption[];
  onChange: (venueId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId);
  const filteredVenues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return venues;
    }

    return venues.filter((venue) =>
      `${venue.name} ${venue.typeName}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query, venues]);

  function selectVenue(venueId: string) {
    setQuery("");
    setIsOpen(false);
    onChange(venueId);
  }

  return (
    <div className="relative w-[260px] shrink-0 max-[640px]:w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0b6f7d]"
        size={15}
      />
      <input
        aria-label="Filter requests by venue"
        className="h-9 w-full rounded-lg border border-white/18 bg-white/92 px-8 pr-9 text-[12px] font-semibold text-[#123342] outline-none shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition placeholder:text-[#6b8c98]/75 focus:border-[#9bdded] focus:ring-3 focus:ring-[#9bdded]/20"
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 140);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={selectedVenue ? selectedVenue.name : "All venues"}
        ref={inputRef}
        type="search"
        value={query}
      />
      <button
        aria-label="Open venue filter"
        className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#0b4658] transition hover:bg-[#eefbfc]"
        onClick={() => {
          setIsOpen((current) => !current);
          inputRef.current?.focus();
        }}
        type="button"
      >
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#d8e9ee] bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
          <VenueFilterOption
            isSelected={selectedVenueId === "all"}
            label="All venues"
            onSelect={() => selectVenue("all")}
            typeName="Every request"
          />
          {filteredVenues.length > 0 ? (
            filteredVenues.map((venue) => (
              <VenueFilterOption
                isSelected={venue.id === selectedVenueId}
                key={venue.id}
                label={venue.name}
                onSelect={() => selectVenue(venue.id)}
                typeName={venue.typeName}
              />
            ))
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

function VenueFilterOption({
  isSelected,
  label,
  onSelect,
  typeName,
}: {
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  typeName: string;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#f5fbfd]",
        isSelected && "bg-[#eefbfc]",
      )}
      onClick={onSelect}
      onMouseDown={(event) => event.preventDefault()}
      type="button"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[#007c92]">
        <Building2 size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">
          {label}
        </span>
        <span className="block truncate text-xs font-bold text-slate-500">
          {typeName}
        </span>
      </span>
      {isSelected ? (
        <Check className="shrink-0 text-[#007c92]" size={16} />
      ) : null}
    </button>
  );
}
