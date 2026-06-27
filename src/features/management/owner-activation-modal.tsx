"use client";

import { useState } from "react";

import { ActiveSwitch } from "@/components/cms/active-switch";
import {
  CmsCreateModal,
  cmsSubmitButtonClassName,
} from "@/components/cms/cms-table-controls";
import type { AppUser, Venue } from "@/lib/types";

export function OwnerActivationModal({
  isSubmitting,
  onClose,
  onSubmit,
  owner,
  venues,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (venueIds: string[]) => void;
  owner: AppUser;
  venues: Venue[];
}) {
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(
    () => new Set(),
  );
  const canSubmit = selectedVenueIds.size > 0;

  function toggleVenue(id: string) {
    setSelectedVenueIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <CmsCreateModal
      description="Choose which assigned venues should become active with this owner."
      onClose={onClose}
      title={`Activate ${owner.name}`}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(Array.from(selectedVenueIds));
        }}
      >
        <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
          {venues.map((venue) => {
            const checked = selectedVenueIds.has(venue.id);

            return (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:bg-[#f8fbff]"
                key={venue.id}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-950">
                    {venue.name}
                  </span>
                  <span className="block truncate text-xs font-bold text-slate-500">
                    {venue.typeName}
                  </span>
                </span>
                <ActiveSwitch
                  checked={checked}
                  disabled={isSubmitting}
                  label={`Activate ${venue.name}`}
                  onClick={() => toggleVenue(venue.id)}
                  type="button"
                />
              </div>
            );
          })}
        </div>

        <button
          className={cmsSubmitButtonClassName}
          disabled={!canSubmit || isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Activating..." : "Activate selected venues"}
        </button>
      </form>
    </CmsCreateModal>
  );
}
