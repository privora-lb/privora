import { cookies } from "next/headers";

import type { Venue } from "@/lib/types";

export const ownerVenueCookieName = "owner_selected_venue";

export async function getOwnerSelectedVenueId() {
  return (await cookies()).get(ownerVenueCookieName)?.value;
}

export function getSelectedOwnerVenue(
  venues: Venue[],
  preferredVenueId?: string | null,
) {
  if (venues.length === 0) {
    return null;
  }

  return (
    venues.find((venue) => venue.id === preferredVenueId) ??
    venues[0]
  );
}

export async function setOwnerSelectedVenueId(venueId: string) {
  (await cookies()).set(ownerVenueCookieName, venueId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}
