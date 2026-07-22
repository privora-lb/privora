import {
  ApprovalsTable,
  type ApprovalTableRow,
} from "@/features/approvals/approvals-table";
import { requireUser } from "@/lib/auth";
import {
  getOwnerChangeRequests,
  getSuperadminChangeRequests,
} from "@/lib/data/requests";
import { getVisibleVenues } from "@/lib/data/venues";
import {
  getOwnerSelectedVenueId,
  getSelectedOwnerVenue,
} from "@/lib/owner-venue-selection";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const ownerVenues = user.role === "owner" ? await getVisibleVenues(user) : [];
  const storedOwnerVenueId =
    user.role === "owner" ? await getOwnerSelectedVenueId() : undefined;
  const selectedOwnerVenue =
    user.role === "owner"
      ? getSelectedOwnerVenue(ownerVenues, params.venue ?? storedOwnerVenueId)
      : null;
  const requests =
    user.role === "superadmin"
      ? await getSuperadminChangeRequests(user.id)
      : await getOwnerChangeRequests(user.id);
  const visibleRequests = selectedOwnerVenue
    ? requests.filter((request) => request.venueId === selectedOwnerVenue.id)
    : requests;
  const rows: ApprovalTableRow[] = visibleRequests.map((request) => ({
    id: request.id,
    venueId: request.venueId,
    venueName: request.venueName,
    venueTypeName: request.venueTypeName,
    date: request.date,
    slot: request.slot,
    requestedStatus: request.requestedStatus,
    requestedNote: request.requestedNote,
    requestedCustomerName: request.requestedCustomerName,
    requestedCustomerPhone: request.requestedCustomerPhone,
    requestedDepositAmount: request.requestedDepositAmount,
    requestedBookingPriceAmount: request.requestedBookingPriceAmount,
    requestedBookingPriceCurrency: request.requestedBookingPriceCurrency,
    requestedFromTime: request.requestedFromTime,
    requestedToTime: request.requestedToTime,
    previousStatus: request.previousStatus,
    previousNote: request.previousNote,
    previousCustomerName: request.previousCustomerName,
    previousCustomerPhone: request.previousCustomerPhone,
    previousDepositAmount: request.previousDepositAmount,
    previousBookingPriceAmount: request.previousBookingPriceAmount,
    previousBookingPriceCurrency: request.previousBookingPriceCurrency,
    previousFromTime: request.previousFromTime,
    previousToTime: request.previousToTime,
    requestedByName: request.requestedByName,
    ownerName: request.ownerName,
    status: request.status,
    decisionNote: request.decisionNote,
    canDecide: user.role === "owner" && request.status === "pending",
    canDelete: user.role === "superadmin" && request.status === "pending",
  }));

  return (
    <ApprovalsTable
      requests={rows}
      showVenueFilter={user.role === "superadmin"}
    />
  );
}
