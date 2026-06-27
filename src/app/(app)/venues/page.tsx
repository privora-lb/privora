import { VenuesTable } from "@/features/management/venues-table";
import { requireSuperadmin } from "@/lib/auth";
import { getUsers } from "@/lib/data/users";
import { getVenueTypes } from "@/lib/data/venue-types";
import { getAllVenues } from "@/lib/data/venues";

export default async function VenuesPage() {
  const user = await requireSuperadmin();
  const [users, types, venues] = await Promise.all([
    getUsers(),
    getVenueTypes(),
    getAllVenues(),
  ]);

  return (
    <VenuesTable
      currentUserId={user.id}
      types={types}
      users={users}
      venues={venues}
    />
  );
}
