import { ListingsTable } from "@/features/listings/admin/listings-table";
import { requireSuperadmin } from "@/lib/auth";
import { getAllPublicListings } from "@/lib/data/listings";

export default async function ListingsPage() {
  await requireSuperadmin();
  const listings = await getAllPublicListings();

  return <ListingsTable listings={listings} />;
}
