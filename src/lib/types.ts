export type UserRole = "superadmin" | "owner";
export type CalendarStatus = "booked" | "available";
export type RequestStatus = "pending" | "approved" | "rejected";

export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
};

export type VenueType = {
  id: string;
  name: string;
  description: string;
  venueCount: number;
};

export type Venue = {
  id: string;
  name: string;
  description: string;
  typeId: string;
  typeName: string;
  assignedUserId: string;
  assignedUserName: string;
  assignedUserRole: UserRole;
  assignedUserIsActive: boolean;
  isActive: boolean;
};

export type CalendarEntry = {
  id: string;
  venueId: string;
  date: string;
  status: CalendarStatus;
  note: string;
  createdByName: string;
  updatedByName: string;
};

export type ChangeRequest = {
  id: string;
  venueId: string;
  venueName: string;
  venueTypeName: string;
  date: string;
  requestedStatus: CalendarStatus;
  requestedNote: string;
  previousStatus: CalendarStatus | null;
  previousNote: string | null;
  requestedByName: string;
  ownerName: string;
  status: RequestStatus;
  decisionNote: string;
  createdAt: Date;
  decidedAt: Date | null;
};
