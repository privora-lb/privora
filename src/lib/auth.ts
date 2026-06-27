import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { AppUser, UserRole } from "@/lib/types";

const sessionCookieName = "reservation_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function signIn(identifier: string, password: string) {
  const result = await query<UserRow & { password_hash: string }>(
    `SELECT id, name, email, phone_number, role, is_active, password_hash
     FROM users
     WHERE phone_number = $1
        OR (email IS NOT NULL AND lower(email) = lower($1))
        OR lower(name) = lower($1)
     LIMIT 2`,
    [identifier],
  );

  if (result.rows.length !== 1) {
    return null;
  }

  const user = result.rows[0];

  if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
    return null;
  }

  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  await query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash, user.id, expiresAt],
  );

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return mapUser(user);
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }

  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const result = await query<UserRow>(
    `SELECT u.id, u.name, u.email, u.phone_number, u.role, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active = true
     LIMIT 1`,
    [hashToken(token)],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireSuperadmin() {
  const user = await requireUser();

  if (user.role !== "superadmin") {
    redirect("/calendar");
  }

  return user;
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
