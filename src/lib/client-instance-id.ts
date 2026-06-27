"use client";

let clientInstanceId: string | null = null;

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

  if (!clientInstanceId) {
    clientInstanceId = createClientInstanceId();
  }

  return clientInstanceId;
}
