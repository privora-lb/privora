import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import { getVisibleVenues } from "@/lib/data/venues";
import {
  getOwnerSelectedVenueId,
  getSelectedOwnerVenue,
} from "@/lib/owner-venue-selection";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const ownerVenues = user.role === "owner" ? await getVisibleVenues(user) : [];
  const storedVenueId =
    user.role === "owner" ? await getOwnerSelectedVenueId() : undefined;
  const selectedOwnerVenue = getSelectedOwnerVenue(ownerVenues, storedVenueId);

  return (
    <AppShell
      ownerSelectedVenueId={selectedOwnerVenue?.id}
      ownerVenues={ownerVenues}
      user={user}
    >
      {children}
    </AppShell>
  );
}
