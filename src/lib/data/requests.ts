import { query } from "@/lib/db";
import {
  type ChangeRequestRow,
  mapRequest,
  requestSelect,
} from "@/lib/data/calendar";

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
