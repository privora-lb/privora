import Image from "next/image";
import Link from "next/link";

import privoraIcon from "../../../../privora-icon.jpg.jpeg";

export function PublicListingHeader() {
  return (
    <header className="border-b border-[#EACC84]/25 bg-[#123C36] text-white">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3" href="/listing">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#123C36]">
            <Image
              alt=""
              className="scale-[1.72] object-cover"
              fill
              priority
              sizes="44px"
              src={privoraIcon}
            />
          </span>
          <span className="min-w-0">
            <span
              className="block text-[18px] uppercase leading-none tracking-[0.16em] text-[#FCFCF0]"
              style={{ fontFamily: "Didot, 'Bodoni 72', 'Times New Roman', serif" }}
            >
              Privora
            </span>
            <span className="mt-1 block truncate text-[8px] font-bold uppercase tracking-[0.18em] text-[#EACC84]">
              Preserve . Relax . Celebrate
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
