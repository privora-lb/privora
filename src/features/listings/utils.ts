import type {
  IsoWeekday,
  PublicListing,
} from "@/features/listings/types";

export const listingIsoWeekdays = [
  { label: "Monday", shortLabel: "Mon", value: 1 },
  { label: "Tuesday", shortLabel: "Tue", value: 2 },
  { label: "Wednesday", shortLabel: "Wed", value: 3 },
  { label: "Thursday", shortLabel: "Thu", value: 4 },
  { label: "Friday", shortLabel: "Fri", value: 5 },
  { label: "Saturday", shortLabel: "Sat", value: 6 },
  { label: "Sunday", shortLabel: "Sun", value: 7 },
] as const satisfies ReadonlyArray<{
  label: string;
  shortLabel: string;
  value: IsoWeekday;
}>;

export function formatListingPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    style: "currency",
  }).format(amount);
}

export function getListingPriceAmounts(
  listing: Pick<
    PublicListing,
    | "weekdayDayPriceAmount"
    | "weekdayNightPriceAmount"
    | "weekendDayPriceAmount"
    | "weekendNightPriceAmount"
  >,
) {
  return [
    listing.weekdayDayPriceAmount,
    listing.weekdayNightPriceAmount,
    listing.weekendDayPriceAmount,
    listing.weekendNightPriceAmount,
  ];
}

export function getListingStartingPrice(
  listing: Parameters<typeof getListingPriceAmounts>[0],
) {
  return Math.min(...getListingPriceAmounts(listing));
}

export function getListingMaximumPrice(
  listing: Parameters<typeof getListingPriceAmounts>[0],
) {
  return Math.max(...getListingPriceAmounts(listing));
}

export function formatListingPriceRange(
  listing: Parameters<typeof getListingPriceAmounts>[0] & {
    priceCurrency: string;
  },
) {
  const minimum = getListingStartingPrice(listing);
  const maximum = getListingMaximumPrice(listing);
  const formattedMinimum = formatListingPrice(minimum, listing.priceCurrency);

  return minimum === maximum
    ? formattedMinimum
    : `${formattedMinimum}–${formatListingPrice(maximum, listing.priceCurrency)}`;
}

export function getListingWeekdayIsoDays(weekendIsoDays: IsoWeekday[]) {
  const weekendDays = new Set(weekendIsoDays);
  return listingIsoWeekdays
    .map((day) => day.value)
    .filter((day) => !weekendDays.has(day));
}

export function formatListingIsoDays(days: IsoWeekday[]) {
  const normalizedDays = [...new Set(days)].sort((left, right) => left - right);
  const labels = normalizedDays.map(
    (day) =>
      listingIsoWeekdays.find((option) => option.value === day)?.shortLabel ?? "",
  );

  if (!labels.length) return "No days";
  if (labels.length === 1) return labels[0];

  const isConsecutive = normalizedDays.every(
    (day, index) => index === 0 || day === normalizedDays[index - 1]! + 1,
  );

  if (isConsecutive && labels.length >= 3) {
    return `${labels[0]}–${labels.at(-1)}`;
  }

  if (labels.length === 2) {
    return `${labels[0]} & ${labels[1]}`;
  }

  return labels.join(", ");
}

export function formatListingTime(value: string) {
  const [hour = "0", minute = "00"] = value.split(":");
  const date = new Date(2000, 0, 1, Number(hour), Number(minute));

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatPoolDimensions(listing: PublicListing) {
  return `${formatMeters(listing.poolLengthM)} x ${formatMeters(
    listing.poolWidthM,
  )} x ${formatMeters(listing.poolDepthM)} m`;
}

export function getMapEmbedUrl(locationName: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    locationName,
  )}&output=embed`;
}

export function getWhatsAppUrl(phoneNumber: string, listingName?: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  const text = listingName
    ? `Hello, I would like to ask about ${listingName}.`
    : "Hello, I would like more information.";

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function createListingSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatMeters(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
