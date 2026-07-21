import "server-only";

import crypto from "node:crypto";

import { query, transaction } from "@/lib/db";
import {
  deleteListingImageObjects,
  getListingImageLocation,
  getListingImageObjectPath,
  uploadListingImageObject,
} from "@/lib/listing-image-storage";

type ImageAssetRow = {
  id: string;
  object_path: string;
};

const cleanupBatchSize = 100;
const cleanupMaximumBatches = 20;
const cleanupMaximumRuntimeMs = 45_000;

export async function createPendingListingImage(
  file: File,
  uploadedById: string,
) {
  const assetId = crypto.randomUUID();
  const objectPath = getListingImageObjectPath(assetId, file.type);
  const imageUrl = getListingImageLocation(objectPath);

  await query(
    `INSERT INTO listing_image_assets (
       id, object_path, image_url, content_type, uploaded_by_id, state
     ) VALUES ($1, $2, $3, $4, $5, 'uploading')`,
    [assetId, objectPath, imageUrl, file.type, uploadedById],
  );

  try {
    await uploadListingImageObject(objectPath, file);
    const result = await query<{ id: string }>(
      `UPDATE listing_image_assets
       SET state = 'pending', updated_at = now()
       WHERE id = $1 AND state = 'uploading'
       RETURNING id`,
      [assetId],
    );

    if (!result.rows[0]) {
      throw new Error("The uploaded image is no longer available.");
    }

    return {
      altText: getImageAltText(file.name),
      imageUrl,
      storageAssetId: assetId,
    };
  } catch (error) {
    try {
      await queueAssetsForDeletion([assetId], uploadedById);
    } catch (cleanupError) {
      console.error("Failed listing image upload could not be queued for cleanup.", {
        assetId,
        message:
          cleanupError instanceof Error
            ? cleanupError.message
            : "Unknown cleanup error",
      });
    }
    throw error;
  }
}

export async function abandonPendingListingImages(
  assetIds: string[],
  uploadedById: string,
) {
  const queuedIds = await queueAssetsForDeletion(assetIds, uploadedById);

  return {
    queuedIds,
    queuedCount: queuedIds.length,
  };
}

export async function cleanUpStaleListingImageAssets() {
  const staleAssets = await query<{ id: string }>(
    `UPDATE listing_image_assets
     SET state = 'delete_pending', listing_id = NULL, updated_at = now()
     WHERE (state = 'uploading' AND updated_at < now() - interval '1 hour')
        OR (state = 'pending' AND updated_at < now() - interval '24 hours')
        OR (state = 'deleting' AND updated_at < now() - interval '30 minutes')
        OR (
          state = 'attached'
          AND updated_at < now() - interval '1 hour'
          AND NOT EXISTS (
            SELECT 1
            FROM public_listing_images image
            WHERE image.storage_asset_id = listing_image_assets.id
          )
        )
     RETURNING id`,
  );
  const cleanupStartedAt = Date.now();
  let deletedCount = 0;
  let failedCount = 0;
  let processedCount = 0;

  for (let batch = 0; batch < cleanupMaximumBatches; batch += 1) {
    const purgeResult = await purgeDeletePendingImageAssets();
    deletedCount += purgeResult.deletedCount;
    failedCount += purgeResult.failedCount;
    processedCount += purgeResult.processedCount;

    if (
      purgeResult.failedCount ||
      purgeResult.processedCount < cleanupBatchSize ||
      Date.now() - cleanupStartedAt >= cleanupMaximumRuntimeMs
    ) {
      break;
    }
  }

  const remainingResult = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM listing_image_assets WHERE state = 'delete_pending'",
  );

  return {
    deletedCount,
    failedCount,
    processedCount,
    remainingCount: Number(remainingResult.rows[0]?.count ?? 0),
    staleCount: staleAssets.rowCount ?? staleAssets.rows.length,
  };
}

export async function purgeDeletePendingImageAssets(assetIds?: string[]) {
  if (assetIds && !assetIds.some((assetId) => isUuid(assetId))) {
    return { deletedCount: 0, failedCount: 0, processedCount: 0 };
  }

  try {
    return await purgeDeletePendingImageAssetsUnsafe(assetIds);
  } catch (error) {
    console.error("Listing image asset cleanup could not start.", {
      assetCount: assetIds?.length,
      message: error instanceof Error ? error.message : "Unknown cleanup error",
    });

    return {
      deletedCount: 0,
      failedCount: assetIds?.length ?? 1,
      processedCount: 0,
    };
  }
}

async function purgeDeletePendingImageAssetsUnsafe(assetIds?: string[]) {
  const normalizedIds = assetIds
    ? [...new Set(assetIds.filter((assetId) => isUuid(assetId)))]
    : [];
  const assets = await transaction(async (client) => {
    const result = normalizedIds.length
      ? await client.query<ImageAssetRow>(
          `SELECT asset.id, asset.object_path
           FROM listing_image_assets asset
           WHERE asset.state = 'delete_pending'
             AND asset.id = ANY($1::uuid[])
             AND NOT EXISTS (
               SELECT 1
               FROM public_listing_images image
               WHERE image.storage_asset_id = asset.id
             )
           FOR UPDATE OF asset SKIP LOCKED`,
          [normalizedIds],
        )
      : await client.query<ImageAssetRow>(
          `SELECT asset.id, asset.object_path
           FROM listing_image_assets asset
           WHERE asset.state = 'delete_pending'
             AND NOT EXISTS (
               SELECT 1
               FROM public_listing_images image
               WHERE image.storage_asset_id = asset.id
             )
           ORDER BY asset.updated_at, asset.id
           LIMIT ${cleanupBatchSize}
           FOR UPDATE OF asset SKIP LOCKED`,
        );

    if (!result.rows.length) return [];

    await client.query(
      `UPDATE listing_image_assets
       SET state = 'deleting', updated_at = now()
       WHERE id = ANY($1::uuid[])`,
      [result.rows.map((row) => row.id)],
    );

    return result.rows;
  });

  if (!assets.length) {
    return { deletedCount: 0, failedCount: 0, processedCount: 0 };
  }

  const selectedIds = assets.map((asset) => asset.id);

  try {
    await deleteListingImageObjects(
      assets.map((asset) => asset.object_path),
    );
    const deleted = await query(
      `DELETE FROM listing_image_assets
       WHERE state = 'deleting'
         AND id = ANY($1::uuid[])`,
      [selectedIds],
    );

    return {
      deletedCount: deleted.rowCount ?? selectedIds.length,
      failedCount: 0,
      processedCount: selectedIds.length,
    };
  } catch (error) {
    await query(
      `UPDATE listing_image_assets
       SET state = 'delete_pending', updated_at = now()
       WHERE state = 'deleting'
         AND id = ANY($1::uuid[])`,
      [selectedIds],
    );
    console.error("Listing image asset deletion will be retried.", {
      assetCount: selectedIds.length,
      message: error instanceof Error ? error.message : "Unknown cleanup error",
    });

    return {
      deletedCount: 0,
      failedCount: selectedIds.length,
      processedCount: selectedIds.length,
    };
  }
}

async function queueAssetsForDeletion(
  assetIds: string[],
  uploadedById: string,
) {
  const normalizedIds = [
    ...new Set(assetIds.filter((assetId) => isUuid(assetId))),
  ];

  if (!normalizedIds.length) return [];

  return transaction(async (client) => {
    const assets = await client.query<{ id: string }>(
      `SELECT id
       FROM listing_image_assets
       WHERE id = ANY($1::uuid[])
         AND uploaded_by_id = $2
         AND state IN ('uploading', 'pending')
       FOR UPDATE`,
      [normalizedIds, uploadedById],
    );
    const queuedIds = assets.rows.map((asset) => asset.id);

    if (queuedIds.length) {
      await client.query(
        `UPDATE listing_image_assets
         SET state = 'delete_pending', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [queuedIds],
      );
    }

    return queuedIds;
  });
}

function getImageAltText(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
