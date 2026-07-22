export type UserRole = "superadmin" | "owner";
export type CalendarStatus = "booked" | "available";
export type CalendarSlot = "day" | "night";
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
  slot: CalendarSlot;
  status: CalendarStatus;
  note: string;
  customerName: string;
  customerPhone: string;
  depositAmount: number | null;
  fromTime: string | null;
  toTime: string | null;
  bookingPriceAmount: number | null;
  bookingPriceCurrency: string | null;
  createdByName: string;
  updatedByName: string;
};

export type ChangeRequest = {
  id: string;
  venueId: string;
  venueName: string;
  venueTypeName: string;
  date: string;
  slot: CalendarSlot | null;
  requestedStatus: CalendarStatus;
  requestedNote: string;
  requestedCustomerName: string;
  requestedCustomerPhone: string;
  requestedDepositAmount: number | null;
  requestedFromTime: string | null;
  requestedToTime: string | null;
  requestedBookingPriceAmount: number | null;
  requestedBookingPriceCurrency: string | null;
  previousStatus: CalendarStatus | null;
  previousNote: string | null;
  previousCustomerName: string | null;
  previousCustomerPhone: string | null;
  previousDepositAmount: number | null;
  previousFromTime: string | null;
  previousToTime: string | null;
  previousBookingPriceAmount: number | null;
  previousBookingPriceCurrency: string | null;
  requestedByName: string;
  requestedById: string;
  ownerName: string;
  status: RequestStatus;
  decisionNote: string;
  createdAt: Date;
  decidedAt: Date | null;
};
