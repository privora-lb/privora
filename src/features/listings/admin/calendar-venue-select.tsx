"use client";

import { Check, ChevronDown, Search, Unlink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarVenueOption } from "@/features/listings/types";
import { cn } from "@/lib/ui";

import { ListingField, listingInputClassName } from "./listing-form-controls";

export function CalendarVenueSelect({
  defaultValue,
  venues,
}: {
  defaultValue?: string | null;
  venues: CalendarVenueOption[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(() =>
    venues.some((venue) => venue.id === defaultValue) ? defaultValue! : "",
  );
  const selected = venues.find((venue) => venue.id === selectedId);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? venues.filter((venue) =>
          `${venue.name} ${venue.ownerName}`.toLowerCase().includes(normalized),
        )
      : venues;
  }, [query, venues]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <ListingField label="Operational calendar" optional>
      <div className="relative" ref={rootRef}>
        <input name="calendarVenueId" type="hidden" value={selectedId} />
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#123C36]"
          size={16}
          aria-hidden="true"
        />
        <input
          aria-controls="calendar-venue-options"
          aria-expanded={isOpen}
          aria-label="Search eligible calendars by venue or owner"
          className={cn(listingInputClassName, "px-10 pr-11 text-[#123C36]")}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            selected
              ? `${selected.name} - ${selected.ownerName}`
              : "No calendar linked"
          }
          role="combobox"
          type="search"
          value={query}
        />
        <button
          aria-label="Open calendar list"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#123C36] hover:bg-[#FCF7E8]"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {isOpen ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 overflow-y-auto rounded-xl border border-[#EACC84]/45 bg-white p-2 shadow-[0_22px_52px_rgba(18,60,54,0.16)]"
            id="calendar-venue-options"
            role="listbox"
          >
            <OptionButton
              icon={<Unlink size={15} aria-hidden="true" />}
              isSelected={!selectedId}
              label="No calendar"
              onClick={() => {
                setSelectedId("");
                setQuery("");
                setIsOpen(false);
              }}
            />
            {filtered.map((venue) => (
              <OptionButton
                isSelected={venue.id === selectedId}
                key={venue.id}
                label={venue.name}
                secondaryLabel={`${venue.ownerRole === "owner" ? "Owner pool" : "Superadmin pool"} · ${venue.ownerName}`}
                onClick={() => {
                  setSelectedId(venue.id);
                  setQuery("");
                  setIsOpen(false);
                }}
              />
            ))}
            {!filtered.length ? (
              <p className="m-0 px-3 py-4 text-sm font-bold text-slate-500">
                No eligible calendars found.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </ListingField>
  );
}

function OptionButton({
  icon,
  isSelected,
  label,
  onClick,
  secondaryLabel,
}: {
  icon?: React.ReactNode;
  isSelected: boolean;
  label: string;
  onClick: () => void;
  secondaryLabel?: string;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-[#FCF7E8]",
        isSelected && "bg-[#FCF7E8] text-[#123C36]",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F6E4AE] text-[#123C36]">
        {icon ?? label.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {secondaryLabel ? (
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
            {secondaryLabel}
          </span>
        ) : null}
      </span>
      {isSelected ? <Check size={16} className="text-[#967230]" /> : null}
    </button>
  );
}
