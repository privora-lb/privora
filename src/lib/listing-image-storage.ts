import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const listingImageMaximumFileSize = 4 * 1024 * 1024;
export const listingImageStorageBucket = "listing-images";
export const listingImageSupportedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const storageRequestTimeoutMs = 20_000;

type SupabaseStorageConfig = {
  key: string;
  keyType: "legacy" | "secret";
  url: string;
};

type ProviderError = {
  code: string;
  message: string;
};

export function getListingImageObjectPath(assetId: string, contentType: string) {
  const extension = listingImageSupportedTypes.get(contentType);

  if (!extension || !isUuid(assetId)) {
    throw new Error("Images must be JPG, PNG, or WebP.");
  }

  return `${assetId}.${extension}`;
}

export function getListingImageLocation(objectPath: string) {
  assertManagedObjectPath(objectPath);

  if (process.env.NODE_ENV !== "production") {
    return `/uploads/listings/${objectPath}`;
  }

  const config = getSupabaseStorageConfig();
  return `${config.url}/storage/v1/object/public/${listingImageStorageBucket}/${encodeURIComponent(objectPath)}`;
}

export async function uploadListingImageObject(
  objectPath: string,
  file: File,
) {
  assertManagedObjectPath(objectPath);

  if (process.env.NODE_ENV !== "production") {
    const uploadDirectory = getLocalUploadDirectory();
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(
      path.join(uploadDirectory, objectPath),
      Buffer.from(await file.arrayBuffer()),
    );
    return;
  }

  const config = getSupabaseStorageConfig();
  const response = await requestSupabaseStorage(
    `${config.url}/storage/v1/object/${listingImageStorageBucket}/${encodeURIComponent(objectPath)}`,
    {
      body: Buffer.from(await file.arrayBuffer()),
      headers: getSupabaseHeaders(config, {
        "cache-control": "31536000",
        "content-type": file.type,
        "x-upsert": "false",
      }),
      method: "POST",
    },
    "upload",
    1,
  );

  if (!response.ok) {
    await handleStorageRequestFailure(response, "upload", 1);
  }
}

export async function deleteListingImageObjects(objectPaths: string[]) {
  const managedPaths = [
    ...new Set(objectPaths.filter((objectPath) => isManagedObjectPath(objectPath))),
  ];

  if (!managedPaths.length) return;

  if (process.env.NODE_ENV !== "production") {
    const uploadDirectory = getLocalUploadDirectory();

    for (const objectPath of managedPaths) {
      try {
        await unlink(path.join(uploadDirectory, objectPath));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }

    return;
  }

  const config = getSupabaseStorageConfig();
  const response = await requestSupabaseStorage(
    `${config.url}/storage/v1/object/${listingImageStorageBucket}`,
    {
      body: JSON.stringify({ prefixes: managedPaths }),
      headers: getSupabaseHeaders(config, {
        "content-type": "application/json",
      }),
      method: "DELETE",
    },
    "delete",
    managedPaths.length,
  );

  if (!response.ok) {
    await handleStorageRequestFailure(
      response,
      "delete",
      managedPaths.length,
    );
  }
}

function getLocalUploadDirectory() {
  return path.join(process.cwd(), "public", "uploads", "listings");
}

function getSupabaseStorageConfig(): SupabaseStorageConfig {
  const rawUrl = getFirstNonEmptyEnvironmentValue([
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]).replace(/\/+$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const key = secretKey || legacyKey;
  const keyType = secretKey ? "secret" : "legacy";

  if (!rawUrl || !key || !isValidSupabaseUrl(rawUrl)) {
    throw new Error("Image storage is not configured.");
  }

  if (
    keyType === "secret"
      ? !key.startsWith("sb_secret_")
      : !isLegacyServiceRoleKey(key)
  ) {
    throw new Error("Image storage is not configured.");
  }

  return { key, keyType, url: rawUrl };
}

function getFirstNonEmptyEnvironmentValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return "";
}

function getSupabaseHeaders(
  config: SupabaseStorageConfig,
  additionalHeaders: Record<string, string> = {},
) {
  const headers: Record<string, string> = {
    apikey: config.key,
    ...additionalHeaders,
  };

  if (config.keyType === "legacy") {
    headers.Authorization = `Bearer ${config.key}`;
  }

  return headers;
}

async function requestSupabaseStorage(
  url: string,
  init: RequestInit,
  operation: "delete" | "upload",
  objectCount: number,
) {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(storageRequestTimeoutMs),
    });
  } catch (error) {
    console.error("Listing image storage request did not complete.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      objectCount,
      operation,
    });
    throw new Error(
      "Image storage is temporarily unavailable. Please try again.",
    );
  }
}

async function handleStorageRequestFailure(
  response: Response,
  operation: "delete" | "upload",
  objectCount: number,
) {
  const requestId =
    response.headers.get("sb-request-id") ??
    response.headers.get("x-request-id") ??
    undefined;
  const responseText = (await response.text()).slice(0, 2048);
  const providerError = parseProviderError(responseText);
  const normalizedError =
    `${providerError.code} ${providerError.message}`.toLowerCase();

  if (
    operation === "delete" &&
    response.status === 404 &&
    (normalizedError.includes("nosuchkey") ||
      normalizedError.includes("object not found"))
  ) {
    return;
  }

  console.error("Listing image storage request failed.", {
    bucket: listingImageStorageBucket,
    objectCount,
    operation,
    providerCode: providerError.code,
    providerMessage: providerError.message,
    requestId,
    status: response.status,
  });

  if (
    response.status === 401 ||
    response.status === 403 ||
    normalizedError.includes("invalidjwt") ||
    normalizedError.includes("invalid jwt") ||
    normalizedError.includes("accessdenied")
  ) {
    throw new Error("Image storage authorization failed. Please contact support.");
  }

  if (
    normalizedError.includes("nosuchbucket") ||
    normalizedError.includes("bucket not found")
  ) {
    throw new Error("Image storage is not ready. Please contact support.");
  }

  if (
    response.status === 402 ||
    response.status === 507 ||
    normalizedError.includes("exceeded_") ||
    normalizedError.includes("quota") ||
    normalizedError.includes("storage limit")
  ) {
    throw new Error("Image storage capacity has been reached. Please contact support.");
  }

  if (response.status === 429 || response.status >= 500) {
    throw new Error("Image storage is temporarily unavailable. Please try again.");
  }

  throw new Error(
    operation === "upload"
      ? "An image could not be stored. Please try again."
      : "An image could not be removed. Please try again.",
  );
}

function parseProviderError(responseText: string): ProviderError {
  try {
    const value = JSON.parse(responseText) as {
      code?: unknown;
      error?: unknown;
      errorCode?: unknown;
      message?: unknown;
      statusCode?: unknown;
    };

    return {
      code: String(
        value.code ?? value.errorCode ?? value.statusCode ?? value.error ?? "unknown",
      ),
      message: String(value.message ?? value.error ?? "Unknown storage error"),
    };
  } catch {
    return {
      code: "unknown",
      message: responseText || "Unknown storage error",
    };
  }
}

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    return (
      (url.protocol === "https:" || isLocal) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.pathname === "/" || url.pathname === "")
    );
  } catch {
    return false;
  }
}

function isLegacyServiceRoleKey(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3 || !parts[1]) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { role?: unknown };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function assertManagedObjectPath(objectPath: string) {
  if (!isManagedObjectPath(objectPath)) {
    throw new Error("Invalid listing image object path.");
  }
}

function isManagedObjectPath(objectPath: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
    objectPath,
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
