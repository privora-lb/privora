import type { PublicListing } from "@/features/listings/types";

export function formatListingPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    style: "currency",
  }).format(amount);
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
