import { createListingSlug } from "@/features/listings/utils";
import { getFormString } from "@/lib/forms";

export type ListingImageInput = {
  altText: string;
  imageUrl: string;
  storageAssetId: string;
};

export type ListingInclusionInput = {
  details: string;
  label: string;
};

export type ListingRuleInput = {
  text: string;
};

export type ListingInput = {
  id: string;
  name: string;
  slug: string;
  priceAmount: number;
  priceCurrency: "USD";
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
  calendarVenueId: string;
  isPublished: boolean;
  images: ListingImageInput[];
  inclusions: ListingInclusionInput[];
  rules: ListingRuleInput[];
};

export function parseListingInput(formData: FormData) {
  const errors: Record<string, string> = {};
  const name = requiredText(formData, "name", "Private pool name", errors);
  const suppliedSlug = getFormString(formData, "slug");
  const slug = createListingSlug(suppliedSlug || name);
  const images = parseImages(formData, errors);
  const inclusions = parseInclusions(formData, errors);
  const rules = parseRules(formData, errors);

  if (!slug) {
    errors.slug = "Enter a valid public URL slug.";
  }

  const input: ListingInput = {
    id: getFormString(formData, "id"),
    name,
    slug,
    priceAmount: numberField(formData, "priceAmount", "Price", errors, 0),
    priceCurrency: "USD",
    locationName: requiredText(
      formData,
      "locationName",
      "Location",
      errors,
    ),
    googleMapsUrl: requiredUrl(
      formData,
      "googleMapsUrl",
      "Google Maps link",
      errors,
    ),
    poolCapacity: integerField(
      formData,
      "poolCapacity",
      "Pool capacity",
      errors,
      1,
    ),
    stayCapacity: integerField(
      formData,
      "stayCapacity",
      "Stay capacity",
      errors,
      0,
    ),
    dayCheckIn: timeField(formData, "dayCheckIn", "Day check-in", errors),
    dayCheckOut: timeField(formData, "dayCheckOut", "Day check-out", errors),
    nightCheckIn: timeField(
      formData,
      "nightCheckIn",
      "Night check-in",
      errors,
    ),
    nightCheckOut: timeField(
      formData,
      "nightCheckOut",
      "Night check-out",
      errors,
    ),
    hasWifi: formData.get("hasWifi") === "on",
    description: requiredText(
      formData,
      "description",
      "Description",
      errors,
      20,
    ),
    bedrooms: integerField(formData, "bedrooms", "Bedrooms", errors, 0),
    toilets: integerField(formData, "toilets", "Toilets", errors, 0),
    poolLengthM: numberField(
      formData,
      "poolLengthM",
      "Pool length",
      errors,
      0.1,
    ),
    poolWidthM: numberField(
      formData,
      "poolWidthM",
      "Pool width",
      errors,
      0.1,
    ),
    poolDepthM: numberField(
      formData,
      "poolDepthM",
      "Pool depth",
      errors,
      0.1,
    ),
    phoneNumber: phoneField(formData, "phoneNumber", "Phone number", errors),
    whatsappNumber: phoneField(
      formData,
      "whatsappNumber",
      "WhatsApp number",
      errors,
    ),
    instagramUrl: optionalUrl(formData, "instagramUrl", "Instagram", errors),
    facebookUrl: optionalUrl(formData, "facebookUrl", "Facebook", errors),
    tiktokUrl: optionalUrl(formData, "tiktokUrl", "TikTok", errors),
    websiteUrl: optionalUrl(formData, "websiteUrl", "Website", errors),
    youtubeUrl: optionalUrl(formData, "youtubeUrl", "YouTube", errors),
    calendarVenueId: getFormString(formData, "calendarVenueId"),
    isPublished: formData.get("isPublished") === "on",
    images,
    inclusions,
    rules,
  };

  if (input.dayCheckOut && input.dayCheckIn >= input.dayCheckOut) {
    errors.dayCheckOut = "Day check-out must be after day check-in.";
  }

  return { errors, input };
}

function requiredText(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
  minimumLength = 1,
) {
  const value = getFormString(formData, key);

  if (value.length < minimumLength) {
    errors[key] =
      minimumLength > 1
        ? `${label} must be at least ${minimumLength} characters.`
        : `${label} is required.`;
  }

  return value;
}

function numberField(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
  minimum: number,
) {
  const value = Number(getFormString(formData, key));

  if (!Number.isFinite(value) || value < minimum) {
    errors[key] = `${label} must be ${minimum === 0 ? "zero or more" : `at least ${minimum}`}.`;
  }

  return value;
}

function integerField(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
  minimum: number,
) {
  const value = numberField(formData, key, label, errors, minimum);

  if (!Number.isInteger(value)) {
    errors[key] = `${label} must be a whole number.`;
  }

  return value;
}

function timeField(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
) {
  const value = getFormString(formData, key);

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    errors[key] = `${label} is required.`;
  }

  return value;
}

function phoneField(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
) {
  const value = getFormString(formData, key);
  const digits = value.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    errors[key] = `${label} must contain 7 to 15 digits.`;
  }

  return value;
}

function requiredUrl(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
) {
  const value = getFormString(formData, key);

  if (!isHttpUrl(value)) {
    errors[key] = `${label} must be a complete http or https URL.`;
  }

  return value;
}

function optionalUrl(
  formData: FormData,
  key: string,
  label: string,
  errors: Record<string, string>,
) {
  const value = getFormString(formData, key);

  if (value && !isHttpUrl(value)) {
    errors[key] = `${label} must be a complete http or https URL.`;
  }

  return value;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseImages(formData: FormData, errors: Record<string, string>) {
  const images = parseJsonArray<ListingImageInput>(formData, "imagesJson")
    .map((image) => ({
      imageUrl: String(image.imageUrl ?? "").trim(),
      altText: String(image.altText ?? "").trim(),
      storageAssetId: String(image.storageAssetId ?? "").trim(),
    }))
    .filter((image) => image.imageUrl);

  if (!images.length) {
    errors.images = "Add at least one listing image.";
  } else if (images.length > 12) {
    errors.images = "A listing can contain up to 12 images.";
  } else if (images.some((image) => !isImageLocation(image.imageUrl))) {
    errors.images = "Each image must use a local path or complete URL.";
  } else if (
    images.some(
      (image) => image.storageAssetId && !isUuid(image.storageAssetId),
    )
  ) {
    errors.images = "An uploaded image is no longer valid. Upload it again.";
  }

  return images;
}

function parseInclusions(
  formData: FormData,
  errors: Record<string, string>,
) {
  const inclusions = parseJsonArray<ListingInclusionInput>(
    formData,
    "inclusionsJson",
  )
    .map((item) => ({
      label: String(item.label ?? "").trim(),
      details: String(item.details ?? "").trim(),
    }))
    .filter((item) => item.label);

  if (!inclusions.length) {
    errors.inclusions = "Add at least one included item.";
  }

  return inclusions.slice(0, 30);
}

function parseRules(formData: FormData, errors: Record<string, string>) {
  const rules = parseJsonArray<ListingRuleInput>(formData, "rulesJson")
    .map((rule) => ({ text: String(rule.text ?? "").trim() }))
    .filter((rule) => rule.text);

  if (!rules.length) {
    errors.rules = "Add at least one rule or regulation.";
  }

  return rules.slice(0, 30);
}

function parseJsonArray<T>(formData: FormData, key: string): T[] {
  try {
    const parsed = JSON.parse(getFormString(formData, key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isImageLocation(value: string) {
  return value.startsWith("/") || isHttpUrl(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
