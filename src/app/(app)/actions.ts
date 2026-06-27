"use server";

import { redirect } from "next/navigation";

import { requireUser, signOut } from "@/lib/auth";
import { getVenueForUser } from "@/lib/data/venues";
import { getFormString, getRequiredFormString } from "@/lib/forms";
import { setOwnerSelectedVenueId } from "@/lib/owner-venue-selection";

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

export async function setOwnerVenueAction(formData: FormData) {
  const user = await requireUser();
  const venueId = getRequiredFormString(formData, "venueId");
  const returnTo = getFormString(formData, "returnTo") || "/calendar";
  const venue = await getVenueForUser(venueId, user);

  if (user.role !== "owner" || !venue) {
    redirect(normalizeOwnerVenueReturnTo(returnTo));
  }

  await setOwnerSelectedVenueId(venue.id);
  redirect(normalizeOwnerVenueReturnTo(returnTo, venue.id));
}

function normalizeOwnerVenueReturnTo(returnTo: string, venueId?: string) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/calendar";
  const url = new URL(safeReturnTo, "http://reservation.local");

  if (venueId && (url.pathname === "/calendar" || url.pathname === "/approvals")) {
    url.searchParams.set("venue", venueId);
  }

  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}`;
}
