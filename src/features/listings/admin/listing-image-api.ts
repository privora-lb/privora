export type ApiResult = {
  message?: string;
  ok?: boolean;
};

export async function removeUploadedListingImages(storageAssetIds: string[]) {
  if (!storageAssetIds.length) return;

  const response = await fetch("/api/listing-images", {
    body: JSON.stringify({ storageAssetIds }),
    headers: { "content-type": "application/json" },
    method: "DELETE",
  });
  const result = await readApiResult(response);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.message ?? "Images could not be removed.");
  }
}

export async function readApiResult<T extends ApiResult = ApiResult>(
  response: Response,
) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
