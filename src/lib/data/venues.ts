import { query } from "@/lib/db";
import type { AppUser, UserRole, Venue } from "@/lib/types";

type VenueRow = {
  id: string;
  name: string;
  description: string;
  type_id: string;
  type_name: string;
  assigned_user_id: string;
  assigned_user_name: string;
  assigned_user_role: UserRole;
  assigned_user_is_active: boolean;
  is_active: boolean;
};

const venueSelect = `
  SELECT
    v.id,
    v.name,
    v.description,
    v.type_id,
    vt.name AS type_name,
    v.assigned_user_id,
    u.name AS assigned_user_name,
    u.role AS assigned_user_role,
    u.is_active AS assigned_user_is_active,
    v.is_active
  FROM venues v
  JOIN venue_types vt ON vt.id = v.type_id
  JOIN users u ON u.id = v.assigned_user_id
`;

export async function getVisibleVenues(user: AppUser) {
  const result = await query<VenueRow>(
    `${venueSelect}
     ${
       user.role === "superadmin"
         ? "WHERE v.is_active = true"
         : "WHERE v.assigned_user_id = $1 AND v.is_active = true"
     }
     ORDER BY v.name`,
    user.role === "superadmin" ? [] : [user.id],
  );

  return result.rows.map(mapVenue);
}

export async function getVenueForUser(venueId: string, user: AppUser) {
  const result = await query<VenueRow>(
    `${venueSelect}
     WHERE v.id = $1
       AND ($2 = 'superadmin' OR v.assigned_user_id = $3)
       AND v.is_active = true
     LIMIT 1`,
    [venueId, user.role, user.id],
  );

  return result.rows[0] ? mapVenue(result.rows[0]) : null;
}

export async function getAllVenues() {
  const result = await query<VenueRow>(`${venueSelect} ORDER BY v.name`);
  return result.rows.map(mapVenue);
}

export function userCanManageVenueDirectly(user: AppUser, venue: Venue) {
  return venue.assignedUserId === user.id && venue.isActive && user.isActive;
}

export function userCanRequestVenueChange(user: AppUser, venue: Venue) {
  return (
    user.role === "superadmin" &&
    venue.assignedUserId !== user.id &&
    venue.isActive &&
    venue.assignedUserIsActive
  );
}

function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    typeId: row.type_id,
    typeName: row.type_name,
    assignedUserId: row.assigned_user_id,
    assignedUserName: row.assigned_user_name,
    assignedUserRole: row.assigned_user_role,
    assignedUserIsActive: row.assigned_user_is_active,
    isActive: row.is_active,
  };
}
