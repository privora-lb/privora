"use server";

import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getFormString } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/password";

type ChangePasswordField =
  | "confirmPassword"
  | "currentPassword"
  | "newPassword";

type ChangePasswordResult =
  | {
      message: string;
      ok: true;
    }
  | {
      field?: ChangePasswordField;
      message: string;
      ok: false;
    };

export async function changeCurrentPasswordAction(
  formData: FormData,
): Promise<ChangePasswordResult> {
  const user = await requireUser();

  if (user.role !== "superadmin") {
    return {
      message: "Only superadmins can change the account password here.",
      ok: false,
    };
  }

  const currentPassword = getFormString(formData, "currentPassword");
  const newPassword = getFormString(formData, "newPassword");
  const confirmPassword = getFormString(formData, "confirmPassword");

  if (!currentPassword) {
    return {
      field: "currentPassword",
      message: "Current password is required.",
      ok: false,
    };
  }

  if (!newPassword) {
    return {
      field: "newPassword",
      message: "New password is required.",
      ok: false,
    };
  }

  if (newPassword.length < 6) {
    return {
      field: "newPassword",
      message: "New password must be at least 6 characters.",
      ok: false,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      field: "confirmPassword",
      message: "New password and confirmation do not match.",
      ok: false,
    };
  }

  const result = await query<{ password_hash: string }>(
    `SELECT password_hash
     FROM users
     WHERE id = $1 AND role = 'superadmin' AND is_active = true
     LIMIT 1`,
    [user.id],
  );
  const currentUser = result.rows[0];

  if (
    !currentUser ||
    !(await verifyPassword(currentPassword, currentUser.password_hash))
  ) {
    return {
      field: "currentPassword",
      message: "Current password is incorrect.",
      ok: false,
    };
  }

  await query(
    `UPDATE users
     SET password_hash = $1,
         updated_at = now()
     WHERE id = $2 AND role = 'superadmin'`,
    [await hashPassword(newPassword), user.id],
  );

  return {
    message: "Password changed successfully.",
    ok: true,
  };
}
