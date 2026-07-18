import { ListingForm } from "@/features/listings/admin/listing-form";
import { requireSuperadmin } from "@/lib/auth";
import { getCalendarVenueOptions } from "@/lib/data/listings";

export default async function NewListingPage() {
  await requireSuperadmin();
  const calendarVenues = await getCalendarVenueOptions();

  return <ListingForm calendarVenues={calendarVenues} />;
}
