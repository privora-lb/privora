import { notFound } from "next/navigation";

import { ListingForm } from "@/features/listings/admin/listing-form";
import { requireSuperadmin } from "@/lib/auth";
import {
  getCalendarVenueOptions,
  getListingById,
} from "@/lib/data/listings";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperadmin();
  const { id } = await params;
  const [listing, calendarVenues] = await Promise.all([
    getListingById(id),
    getCalendarVenueOptions(id),
  ]);

  if (!listing) {
    notFound();
  }

  return (
    <ListingForm
      calendarVenues={calendarVenues}
      key={listing.updatedAt.toISOString()}
      listing={listing}
    />
  );
}
