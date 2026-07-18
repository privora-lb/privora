export type ListingImage = {
  id: string;
  imageUrl: string;
  altText: string;
  position: number;
};

export type ListingInclusion = {
  id: string;
  label: string;
  details: string;
  position: number;
};

export type ListingRule = {
  id: string;
  text: string;
  position: number;
};

export type CalendarVenueOption = {
  id: string;
  name: string;
  ownerName: string;
  ownerRole: "owner" | "superadmin";
};

export type PublicListing = {
  id: string;
  name: string;
  slug: string;
  priceAmount: number;
  priceCurrency: string;
  locationName: string;
  googleMapsUrl: string;
  poolCapacity: number;
  stayCapacity: number;
  dayCheckIn: string;
  dayCheckOut: string;
  nightCheckIn: string;
  nightCheckOut: string;
  hasWifi: boolean;
  description: string;
  bedrooms: number;
  toilets: number;
  poolLengthM: number;
  poolWidthM: number;
  poolDepthM: number;
  phoneNumber: string;
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  youtubeUrl: string;
  calendarVenueId: string | null;
  calendarVenueName: string | null;
  calendarVenueEligible: boolean;
  isPublished: boolean;
  images: ListingImage[];
  inclusions: ListingInclusion[];
  rules: ListingRule[];
  createdAt: Date;
  updatedAt: Date;
};

export type PublicCalendarStatus = {
  date: string;
  status: "available" | "booked";
};

export type ListingFormState = {
  fieldErrors?: Record<string, string>;
  listingId?: string;
  message?: string;
  ok?: boolean;
};
