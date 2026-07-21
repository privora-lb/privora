"use client";

import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ListingImage } from "@/features/listings/listing-image";
import type { ListingImage as SavedListingImage } from "@/features/listings/types";

import { listingInputClassName } from "./listing-form-controls";
import {
  readApiResult,
  removeUploadedListingImages,
  type ApiResult,
} from "./listing-image-api";

type EditableImage = {
  altText: string;
  imageUrl: string;
  isTemporary: boolean;
  storageAssetId: string | null;
};

type UploadResult = ApiResult & {
  images?: Array<{
    altText: string;
    imageUrl: string;
    storageAssetId: string;
  }>;
};

export function ListingImageManager({
  disabled,
  error,
  initialImages,
  onBusyChange,
  onError,
  onTemporaryAssetsChange,
}: {
  disabled?: boolean;
  error?: string;
  initialImages: SavedListingImage[];
  onBusyChange: (isBusy: boolean) => void;
  onError: (message: string) => void;
  onTemporaryAssetsChange: (storageAssetIds: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<EditableImage[]>(
    initialImages.map(({ altText, imageUrl, storageAssetId }) => ({
      altText,
      imageUrl,
      isTemporary: false,
      storageAssetId,
    })),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageUrl, setDeletingImageUrl] = useState("");

  useEffect(() => {
    onTemporaryAssetsChange(
      images
        .filter((image) => image.isTemporary && image.storageAssetId)
        .map((image) => image.storageAssetId!),
    );
  }, [images, onTemporaryAssetsChange]);

  useEffect(() => {
    onBusyChange(isUploading || Boolean(deletingImageUrl));
  }, [deletingImageUrl, isUploading, onBusyChange]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || disabled || isUploading || deletingImageUrl) return;
    const selectedFiles = Array.from(files).slice(
      0,
      Math.max(0, 12 - images.length),
    );

    if (!selectedFiles.length) return;
    setIsUploading(true);
    onBusyChange(true);
    const uploadedImages: EditableImage[] = [];

    try {
      for (const file of selectedFiles) {
        const body = new FormData();
        body.append("images", file);
        const response = await fetch("/api/listing-images", {
          body,
          method: "POST",
        });
        const result = await readApiResult<UploadResult>(response);

        if (!response.ok || !result?.images?.length) {
          throw new Error(result?.message ?? "Images could not be uploaded.");
        }

        uploadedImages.push(
          ...result.images.map((image) => ({ ...image, isTemporary: true })),
        );
      }
    } catch (uploadError) {
      onError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      if (uploadedImages.length) {
        setImages((current) => [...current, ...uploadedImages].slice(0, 12));
      }
      setIsUploading(false);
      onBusyChange(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateImage(index: number, patch: Partial<EditableImage>) {
    setImages((current) =>
      current.map((image, itemIndex) =>
        itemIndex === index ? { ...image, ...patch } : image,
      ),
    );
  }

  function moveImage(index: number, amount: number) {
    setImages((current) => {
      const nextIndex = index + amount;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function removeImage(index: number) {
    const image = images[index];
    if (!image || disabled || deletingImageUrl) return;

    if (image.isTemporary) {
      if (!image.storageAssetId) {
        onError("The uploaded image is no longer available.");
        return;
      }

      setDeletingImageUrl(image.imageUrl);
      onBusyChange(true);

      try {
        await removeUploadedListingImages([image.storageAssetId]);
      } catch (error) {
        onError(
          error instanceof Error
            ? `${error.message} Cleanup will retry automatically.`
            : "Image cleanup will retry automatically.",
        );
      } finally {
        setDeletingImageUrl("");
        onBusyChange(false);
      }
    }

    setImages((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <div className="grid gap-4">
      <input
        name="imagesJson"
        type="hidden"
        value={JSON.stringify(
          images.map(({ altText, imageUrl, storageAssetId }) => ({
            altText,
            imageUrl,
            storageAssetId,
          })),
        )}
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || isUploading || Boolean(deletingImageUrl)}
        multiple
        onChange={(event) => void uploadFiles(event.target.files)}
        ref={fileInputRef}
        type="file"
      />
      <div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123C36] px-4 text-xs font-black text-white transition hover:bg-[#0c2f2a] disabled:cursor-wait disabled:opacity-65"
          disabled={disabled || isUploading || Boolean(deletingImageUrl) || images.length >= 12}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {isUploading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
          {isUploading ? "Uploading..." : "Upload images"}
        </button>
      </div>
      {error ? <p className="m-0 text-xs font-bold text-rose-700">{error}</p> : null}
      {images.length ? (
        <div className="grid gap-3">
          {images.map((image, index) => (
            <div
              className="grid gap-3 border-b border-[#ebe4d4] pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center"
              key={`${image.imageUrl}-${index}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                {image.imageUrl ? (
                  <ListingImage
                    alt={image.altText || `Listing image ${index + 1}`}
                    sizes="128px"
                    src={image.imageUrl}
                  />
                ) : (
                  <span className="grid h-full place-items-center text-xs font-bold text-slate-400">
                    No preview
                  </span>
                )}
                {index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-md bg-[#123C36] px-2 py-1 text-[9px] font-black uppercase text-white">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="grid min-w-0 gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Image description
                </span>
                <input
                  aria-label={`Image ${index + 1} alternative text`}
                  className={listingInputClassName}
                  disabled={disabled || Boolean(deletingImageUrl)}
                  onChange={(event) => updateImage(index, { altText: event.target.value })}
                  placeholder="Image description"
                  value={image.altText}
                />
              </div>
              <div className="flex items-center gap-1 sm:grid">
                <ImageAction label="Move image up" disabled={disabled || index === 0 || Boolean(deletingImageUrl)} onClick={() => moveImage(index, -1)}>
                  <ArrowUp size={15} />
                </ImageAction>
                <ImageAction label="Move image down" disabled={disabled || index === images.length - 1 || Boolean(deletingImageUrl)} onClick={() => moveImage(index, 1)}>
                  <ArrowDown size={15} />
                </ImageAction>
                <ImageAction label="Remove image" danger disabled={disabled || Boolean(deletingImageUrl)} onClick={() => void removeImage(index)}>
                  {deletingImageUrl === image.imageUrl ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                </ImageAction>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-[#d9d5c9] bg-[#fffdf8] px-4 text-center text-sm font-bold text-slate-400">
          Upload the first image for this listing.
        </div>
      )}
    </div>
  );
}

function ImageAction({ children, danger, disabled, label, onClick }: { children: React.ReactNode; danger?: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-lg border bg-white transition disabled:opacity-35 ${danger ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-[#d9d5c9] text-slate-600 hover:bg-[#FCF7E8]"}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
