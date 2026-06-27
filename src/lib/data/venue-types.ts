import { query } from "@/lib/db";
import type { VenueType } from "@/lib/types";

type VenueTypeRow = {
  id: string;
  name: string;
  description: string;
  venue_count: string;
};

export async function getVenueTypes() {
  const result = await query<VenueTypeRow>(
    `SELECT
       vt.id,
       vt.name,
       vt.description,
       count(v.id)::text AS venue_count
     FROM venue_types vt
     LEFT JOIN venues v ON v.type_id = vt.id
     GROUP BY vt.id, vt.name, vt.description
     ORDER BY vt.name`,
  );

  return result.rows.map(mapVenueType);
}

function mapVenueType(row: VenueTypeRow): VenueType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    venueCount: Number(row.venue_count),
  };
}
