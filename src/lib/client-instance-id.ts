"use client";

const storageKey = "reservation_tracking_client_id";

function createClientInstanceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getClientInstanceId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.sessionStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const nextId = createClientInstanceId();
  window.sessionStorage.setItem(storageKey, nextId);
  return nextId;
}
