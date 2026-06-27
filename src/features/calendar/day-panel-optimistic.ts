import type {
  AppUser,
  CalendarEntry,
  CalendarStatus,
  ChangeRequest,
  Venue,
} from "@/lib/types";

function getStatus(formData: FormData): CalendarStatus {
  return formData.get("status") === "booked" ? "booked" : "available";
}

function getNote(formData: FormData) {
  const value = formData.get("note");
  return typeof value === "string" ? value.trim() : "";
}

export function createOptimisticEntry(
  formData: FormData,
  entry: CalendarEntry | undefined,
  user: AppUser,
  venue: Venue,
): CalendarEntry {
  const date = String(formData.get("date") ?? "");

  return {
    createdByName: entry?.createdByName ?? user.name,
    date,
    id: entry?.id ?? `optimistic-entry-${venue.id}-${date}`,
    note: getNote(formData),
    status: getStatus(formData),
    updatedByName: user.name,
    venueId: venue.id,
  };
}

export function createEntryFromRequest(
  request: ChangeRequest,
  entry?: CalendarEntry,
): CalendarEntry {
  return {
    createdByName: entry?.createdByName ?? request.requestedByName,
    date: request.date,
    id: entry?.id ?? `optimistic-entry-${request.venueId}-${request.date}`,
    note: request.requestedNote,
    status: request.requestedStatus,
    updatedByName: request.requestedByName,
    venueId: request.venueId,
  };
}

export function createOptimisticRequest(
  formData: FormData,
  entry: CalendarEntry | undefined,
  pendingRequest: ChangeRequest | undefined,
  user: AppUser,
  venue: Venue,
): ChangeRequest {
  const date = String(formData.get("date") ?? "");

  return {
    createdAt: pendingRequest?.createdAt ?? new Date(),
    date,
    decidedAt: null,
    decisionNote: "",
    id: pendingRequest?.id ?? `optimistic-request-${venue.id}-${date}`,
    ownerName: venue.assignedUserName,
    previousNote: entry?.note ?? null,
    previousStatus: entry?.status ?? null,
    requestedByName: user.name,
    requestedNote: getNote(formData),
    requestedStatus: getStatus(formData),
    status: "pending",
    venueId: venue.id,
    venueName: venue.name,
    venueTypeName: venue.typeName,
  };
}
