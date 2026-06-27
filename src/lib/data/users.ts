import { query } from "@/lib/db";
import type { AppUser, UserRole } from "@/lib/types";

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
};

export async function getUsers() {
  const result = await query<UserRow>(
    `SELECT id, name, email, phone_number, role, is_active
     FROM users
     ORDER BY role, name`,
  );

  return result.rows.map(mapUser);
}

export async function getOwners() {
  const result = await query<UserRow>(
    `SELECT id, name, email, phone_number, role, is_active
     FROM users
     WHERE role = 'owner'
     ORDER BY name`,
  );

  return result.rows.map(mapUser);
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phoneNumber: row.phone_number,
    role: row.role,
    isActive: row.is_active,
  };
}
