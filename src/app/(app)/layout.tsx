import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";
import {
  getOwnerPendingApprovalCountsByVenue,
  getPendingApprovalCount,
} from "@/lib/data/requests";
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
  const initialPendingApprovalsCount = await getPendingApprovalCount({
    role: user.role,
    userId: user.id,
    venueId: user.role === "owner" ? selectedOwnerVenue?.id : undefined,
  });
  const initialOwnerPendingCountsByVenue =
    user.role === "owner"
      ? await getOwnerPendingApprovalCountsByVenue(user.id)
      : {};

  return (
    <AppShell
      initialOwnerPendingCountsByVenue={initialOwnerPendingCountsByVenue}
      initialPendingApprovalsCount={initialPendingApprovalsCount}
      ownerSelectedVenueId={selectedOwnerVenue?.id}
      ownerVenues={ownerVenues}
      user={user}
    >
      {children}
    </AppShell>
  );
}
