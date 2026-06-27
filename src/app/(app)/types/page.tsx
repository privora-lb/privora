import { VenueTypesTable } from "@/features/types/venue-types-table";
import { requireSuperadmin } from "@/lib/auth";
import { getVenueTypes } from "@/lib/data/venue-types";

export default async function TypesPage() {
  await requireSuperadmin();
  const types = await getVenueTypes();

  return <VenueTypesTable types={types} />;
}
