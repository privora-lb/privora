"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useState } from "react";

import { ListingImage } from "@/features/listings/listing-image";
import type { ListingImage as ListingImageType } from "@/features/listings/types";
import { cn } from "@/lib/ui";

export function ListingCarousel({ images, listingName }: { images: ListingImageType[]; listingName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  if (!activeImage) return null;

  function show(index: number) {
    setActiveIndex((index + images.length) % images.length);
  }

  return (
    <section aria-label={`${listingName} images`} className="grid gap-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-100 sm:aspect-[16/9] lg:max-h-[600px]">
        <ListingImage
          alt={activeImage.altText || `${listingName} image ${activeIndex + 1}`}
          priority
          sizes="(min-width: 1024px) 68vw, 100vw"
          src={activeImage.imageUrl}
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1.5 text-[11px] font-black text-white backdrop-blur-sm">
          <Expand size={13} aria-hidden="true" />
          {activeIndex + 1} / {images.length}
        </span>
        {images.length > 1 ? (
          <>
            <CarouselButton label="Previous image" position="left" onClick={() => show(activeIndex - 1)}>
              <ChevronLeft size={20} aria-hidden="true" />
            </CarouselButton>
            <CarouselButton label="Next image" position="right" onClick={() => show(activeIndex + 1)}>
              <ChevronRight size={20} aria-hidden="true" />
            </CarouselButton>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg border-2 bg-slate-100 transition",
                index === activeIndex
                  ? "border-[#C0964E]"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
              key={image.id || `${image.imageUrl}-${index}`}
              onClick={() => show(index)}
              type="button"
            >
              <ListingImage
                alt=""
                sizes="(min-width: 640px) 11vw, 24vw"
                src={image.imageUrl}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CarouselButton({ children, label, onClick, position }: { children: React.ReactNode; label: string; onClick: () => void; position: "left" | "right" }) {
  return (
    <button
      aria-label={label}
      className={cn(
        "absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#123C36] shadow-lg backdrop-blur-sm transition hover:bg-white",
        position === "left" ? "left-3" : "right-3",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
