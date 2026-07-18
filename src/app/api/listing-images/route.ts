import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maximumFileSize = 4 * 1024 * 1024;
const storageBucket = "listing-images";
const supportedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

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

  const validationError = validateFiles(files);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  try {
    const images =
      process.env.NODE_ENV === "production"
        ? await uploadToSupabase(files)
        : await uploadLocally(files);
    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Images could not be uploaded.",
      },
      { status: 503 },
    );
  }
}

function validateFiles(files: File[]) {
  for (const file of files.slice(0, 12)) {
    if (!supportedTypes.has(file.type)) {
      return "Images must be JPG, PNG, or WebP.";
    }

    if (file.size > maximumFileSize) {
      return "Each image must be 4 MB or smaller.";
    }
  }

  return "";
}

async function uploadLocally(files: File[]) {
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "listings",
  );
  await mkdir(uploadDirectory, { recursive: true });
  const uploaded: Array<{ altText: string; imageUrl: string }> = [];

  for (const file of files.slice(0, 12)) {
    const extension = supportedTypes.get(file.type)!;

    const fileName = `${crypto.randomUUID()}.${extension}`;
    await writeFile(
      path.join(uploadDirectory, fileName),
      Buffer.from(await file.arrayBuffer()),
    );
    uploaded.push({
      altText: getImageAltText(file.name),
      imageUrl: `/uploads/listings/${fileName}`,
    });
  }

  return uploaded;
}

async function uploadToSupabase(files: File[]) {
  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  ).replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "";

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Image storage is not configured.");
  }

  const uploaded: Array<{ altText: string; imageUrl: string }> = [];

  for (const file of files.slice(0, 12)) {
    const extension = supportedTypes.get(file.type)!;
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const objectUrl = `${supabaseUrl}/storage/v1/object/${storageBucket}/${fileName}`;
    const response = await fetch(objectUrl, {
      body: Buffer.from(await file.arrayBuffer()),
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "cache-control": "31536000",
        "content-type": file.type,
        "x-upsert": "false",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("An image could not be stored. Please try again.");
    }

    uploaded.push({
      altText: getImageAltText(file.name),
      imageUrl: `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${fileName}`,
    });
  }

  return uploaded;
}

function getImageAltText(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}
