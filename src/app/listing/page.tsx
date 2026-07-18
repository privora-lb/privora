import { ListingCard } from "@/features/listings/public/listing-card";
import { getPublishedListings } from "@/lib/data/listings";

export const dynamic = "force-dynamic";

export default async function PublicListingsPage() {
  const listings = await getPublishedListings();

  return (
    <main>
      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {listings.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} priority={index < 3} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-lg border border-[#ded8c8] bg-white px-5 text-center text-sm font-bold text-slate-500">
            No private pools are currently published.
          </div>
        )}
      </section>
    </main>
  );
}
