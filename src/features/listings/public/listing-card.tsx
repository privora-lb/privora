import { ArrowUpRight, BedDouble, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";

import { ListingImage } from "@/features/listings/listing-image";
import type { PublicListing } from "@/features/listings/types";
import {
  formatListingPrice,
  getListingStartingPrice,
} from "@/features/listings/utils";

export function ListingCard({ listing, priority }: { listing: PublicListing; priority?: boolean }) {
  const cover = listing.images[0];

  return (
    <Link
      className="group grid overflow-hidden rounded-lg border border-[#ded8c8] bg-white shadow-[0_14px_34px_rgba(18,60,54,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#C0964E]/55 hover:shadow-[0_20px_46px_rgba(18,60,54,0.14)] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#C0964E]/45"
      href={`/listing/${listing.slug}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {cover ? (
          <ListingImage
            alt={cover.altText || listing.name}
            className="transition duration-500 group-hover:scale-[1.03]"
            priority={priority}
            sizes="(min-width: 1280px) 31vw, (min-width: 720px) 48vw, 100vw"
            src={cover.imageUrl}
          />
        ) : null}
        <span className="absolute right-3 top-3 rounded-md bg-[#123C36]/92 px-3 py-1.5 text-xs font-black text-white shadow-lg backdrop-blur-sm">
          From{" "}
          {formatListingPrice(
            getListingStartingPrice(listing),
            listing.priceCurrency,
          )}
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 truncate text-lg font-black text-[#123C36]">
              {listing.name}
            </h2>
            <p className="m-0 mt-1 flex items-center gap-1.5 truncate text-xs font-bold text-slate-500">
              <MapPin className="shrink-0 text-[#967230]" size={14} aria-hidden="true" />
              <span className="truncate">{listing.locationName}</span>
            </p>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#EACC84]/45 text-[#123C36] transition group-hover:bg-[#F6E4AE]">
            <ArrowUpRight size={16} aria-hidden="true" />
          </span>
        </div>
        <div className="flex items-center gap-5 border-t border-[#ebe4d4] pt-3 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <UsersRound size={15} className="text-[#967230]" aria-hidden="true" />
            {listing.poolCapacity} pool
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble size={15} className="text-[#967230]" aria-hidden="true" />
            {listing.stayCapacity} stay
          </span>
        </div>
      </div>
    </Link>
  );
}
