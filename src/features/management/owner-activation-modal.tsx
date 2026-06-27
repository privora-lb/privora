"use client";

import { useState } from "react";

import { toggleOwnerActiveAction } from "@/app/(app)/management/actions";
import { ActiveSwitch } from "@/components/cms/active-switch";
import {
  CmsCreateModal,
  cmsSubmitButtonClassName,
} from "@/components/cms/cms-table-controls";
import type { AppUser, Venue } from "@/lib/types";

export function OwnerActivationModal({
  onClose,
  owner,
  venues,
}: {
  onClose: () => void;
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
      <form action={toggleOwnerActiveAction} className="grid gap-4">
        <input name="returnTo" type="hidden" value="/owners" />
        <input name="ownerId" type="hidden" value={owner.id} />
        <input name="isActive" type="hidden" value="true" />

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
                {checked ? (
                  <input name="venueIds" type="hidden" value={venue.id} />
                ) : null}
                <ActiveSwitch
                  checked={checked}
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
          disabled={!canSubmit}
          type="submit"
        >
          Activate selected venues
        </button>
      </form>
    </CmsCreateModal>
  );
}
