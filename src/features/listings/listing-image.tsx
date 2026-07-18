"use client";

import Image, { type ImageLoader } from "next/image";

import { cn } from "@/lib/ui";

const passthroughLoader: ImageLoader = ({ src }) => src;

export function ListingImage({
  alt,
  className,
  priority,
  sizes,
  src,
}: {
  alt: string;
  className?: string;
  priority?: boolean;
  sizes: string;
  src: string;
}) {
  return (
    <Image
      alt={alt}
      className={cn("object-cover", className)}
      fill
      loader={passthroughLoader}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      sizes={sizes}
      src={src}
      unoptimized
    />
  );
}
