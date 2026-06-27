import { OwnersTable } from "@/features/management/owners-table";
import { requireSuperadmin } from "@/lib/auth";
import { getUsers } from "@/lib/data/users";
import { getAllVenues } from "@/lib/data/venues";

export default async function OwnersPage() {
  await requireSuperadmin();
  const [users, venues] = await Promise.all([getUsers(), getAllVenues()]);
  const owners = users.filter((item) => item.role === "owner");

  return <OwnersTable owners={owners} venues={venues} />;
}
