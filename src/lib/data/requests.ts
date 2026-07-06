import { query } from "@/lib/db";
import {
  type ChangeRequestRow,
  mapRequest,
  requestSelect,
} from "@/lib/data/calendar";
import type { UserRole } from "@/lib/types";

export async function getOwnerChangeRequests(ownerId: string) {
  const result = await query<ChangeRequestRow>(
    `${requestSelect}
     WHERE v.assigned_user_id = $1
       AND v.is_active = true
     ORDER BY
       CASE cr.status
         WHEN 'pending' THEN 0
         WHEN 'approved' THEN 1
         ELSE 2
       END,
       cr.created_at DESC`,
    [ownerId],
  );

  return result.rows.map(mapRequest);
}

export async function getLatestPendingRequestForOwner(ownerId: string) {
  const result = await query<ChangeRequestRow>(
    `${requestSelect}
     WHERE v.assigned_user_id = $1
       AND cr.status = 'pending'
       AND v.is_active = true
     ORDER BY cr.created_at DESC
     LIMIT 1`,
    [ownerId],
  );

  return result.rows[0] ? mapRequest(result.rows[0]) : null;
}

export async function getSuperadminChangeRequests(superadminId: string) {
  const result = await query<ChangeRequestRow>(
    `${requestSelect}
     WHERE cr.requested_by_id = $1
       AND v.is_active = true
     ORDER BY
       CASE cr.status
         WHEN 'pending' THEN 0
         WHEN 'approved' THEN 1
         ELSE 2
       END,
       cr.created_at DESC`,
    [superadminId],
  );

  return result.rows.map(mapRequest);
}

export async function getPendingApprovalCount({
  role,
  userId,
  venueId,
}: {
  role: UserRole;
  userId: string;
  venueId?: string;
}) {
  const result = await query<{ count: string }>(
    role === "superadmin"
      ? `SELECT count(*)::text
         FROM change_requests cr
         JOIN venues v ON v.id = cr.venue_id
         WHERE cr.requested_by_id = $1
           AND cr.status = 'pending'
           AND v.is_active = true`
      : `SELECT count(*)::text
         FROM change_requests cr
         JOIN venues v ON v.id = cr.venue_id
         WHERE v.assigned_user_id = $1
           AND cr.status = 'pending'
           AND v.is_active = true
           AND ($2::uuid IS NULL OR cr.venue_id = $2::uuid)`,
    role === "superadmin" ? [userId] : [userId, venueId ?? null],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function getOwnerPendingApprovalCountsByVenue(ownerId: string) {
  const result = await query<{ count: string; venue_id: string }>(
    `SELECT cr.venue_id, count(*)::text
     FROM change_requests cr
     JOIN venues v ON v.id = cr.venue_id
     WHERE v.assigned_user_id = $1
       AND cr.status = 'pending'
       AND v.is_active = true
     GROUP BY cr.venue_id`,
    [ownerId],
  );

  return Object.fromEntries(
    result.rows.map((row) => [row.venue_id, Number(row.count)]),
  );
}
