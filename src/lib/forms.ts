import { redirect } from "next/navigation";

import {
  type ActionToast,
  toastIdParam,
  toastMessageParam,
  toastTypeParam,
} from "@/lib/toast";

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getRequiredFormString(formData: FormData, key: string) {
  const value = getFormString(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

export function redirectToReturnPath(
  formData: FormData,
  fallback = "/calendar",
  toast?: ActionToast,
): never {
  const returnTo = getFormString(formData, "returnTo");

  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    redirect(addToastToPath(returnTo, toast));
  }

  redirect(addToastToPath(fallback, toast));
}

export function addToastToPath(path: string, toast?: ActionToast) {
  if (!toast) {
    return path;
  }

  const url = new URL(path, "http://reservation-tracking.local");
  url.searchParams.set(toastTypeParam, toast.type);
  url.searchParams.set(toastMessageParam, toast.message);
  url.searchParams.set(toastIdParam, Date.now().toString());

  return `${url.pathname}${url.search}${url.hash}`;
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const requiredMatch = error.message.match(/^(.+) is required\.$/);

  if (requiredMatch) {
    const fieldLabels: Record<string, string> = {
      assignedUserId: "Assigned user",
      id: "Record",
      name: "Name",
      ownerId: "Owner",
      password: "Password",
      phoneNumber: "Phone number",
      typeId: "Space type",
      venueId: "Venue",
    };
    const fieldName = requiredMatch[1] ?? "";

    return `${fieldLabels[fieldName] ?? fieldName} is required.`;
  }

  if (error.message.includes("duplicate key")) {
    return "This record already exists. Use a different name, phone, or email.";
  }

  if (error.message.includes("violates foreign key constraint")) {
    return "This change cannot be completed because related records still use it.";
  }

  if (
    error.message.startsWith("Deposit ") ||
    error.message.startsWith("Phone number ") ||
    error.message.startsWith("Select ") ||
    error.message.startsWith("This ") ||
    error.message.endsWith("was not found.") ||
    error.message.endsWith("is no longer available.")
  ) {
    return error.message;
  }

  return fallback;
}
