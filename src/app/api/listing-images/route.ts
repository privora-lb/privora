import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  abandonPendingListingImages,
  createPendingListingImage,
  purgeDeletePendingImageAssets,
} from "@/lib/listing-image-assets";
import {
  listingImageMaximumFileSize,
  listingImageSupportedTypes,
} from "@/lib/listing-image-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

const maximumDeleteCount = 12;
const publicStorageErrorMessages = new Set([
  "An image could not be removed. Please try again.",
  "An image could not be stored. Please try again.",
  "Image storage authorization failed. Please contact support.",
  "Image storage capacity has been reached. Please contact support.",
  "Image storage is not configured.",
  "Image storage is not ready. Please contact support.",
  "Image storage is temporarily unavailable. Please try again.",
  "The uploaded image is no longer available.",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { message: "Select at least one image." },
        { status: 400 },
      );
    }

    const validationError = await validateFiles(files);

    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const image = await createPendingListingImage(files[0]!, user.id);
    return NextResponse.json({ images: [image] });
  } catch (error) {
    return storageErrorResponse(error, "Images could not be uploaded.");
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { storageAssetIds?: unknown };
    const storageAssetIds = Array.isArray(payload.storageAssetIds)
      ? [
          ...new Set(
            payload.storageAssetIds
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.trim())
              .filter((value) => isUuid(value)),
          ),
        ]
      : [];

    if (
      !storageAssetIds.length ||
      storageAssetIds.length > maximumDeleteCount
    ) {
      return NextResponse.json(
        { message: "Select between 1 and 12 images to remove." },
        { status: 400 },
      );
    }

    const result = await abandonPendingListingImages(
      storageAssetIds,
      user.id,
    );

    if (result.queuedIds.length) {
      after(() => purgeDeletePendingImageAssets(result.queuedIds));
    }

    return NextResponse.json(
      { ok: true, queuedCount: result.queuedCount },
      { status: 202 },
    );
  } catch (error) {
    return storageErrorResponse(error, "Images could not be removed.");
  }
}

async function validateFiles(files: File[]) {
  if (files.length > 1) {
    return "Upload one image at a time.";
  }

  for (const file of files) {
    if (!listingImageSupportedTypes.has(file.type)) {
      return "Images must be JPG, PNG, or WebP.";
    }

    if (!file.size) {
      return "Images cannot be empty.";
    }

    if (file.size > listingImageMaximumFileSize) {
      return "Each image must be 4 MB or smaller.";
    }

    if (!(await hasExpectedImageSignature(file))) {
      return "The selected file is not a valid JPG, PNG, or WebP image.";
    }
  }

  return "";
}

async function hasExpectedImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }

  return (
    file.type === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

function storageErrorResponse(error: unknown, fallback: string) {
  const message =
    error instanceof Error && publicStorageErrorMessages.has(error.message)
      ? error.message
      : fallback;

  if (!publicStorageErrorMessages.has(message)) {
    console.error("Unexpected listing image storage error.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return NextResponse.json({ message }, { status: 503 });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
