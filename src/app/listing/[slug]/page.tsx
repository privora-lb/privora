import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Camera,
  CirclePlay,
  Clock3,
  ExternalLink,
  Globe2,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Waves,
  Wifi,
  WifiOff,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ListingCarousel } from "@/features/listings/public/listing-carousel";
import { ListingDetailCalendar } from "@/features/listings/public/listing-detail-calendar";
import type { PublicListing } from "@/features/listings/types";
import {
  formatListingPrice,
  formatListingIsoDays,
  formatListingTime,
  formatPoolDimensions,
  getListingStartingPrice,
  getListingWeekdayIsoDays,
  getMapEmbedUrl,
  getWhatsAppUrl,
} from "@/features/listings/utils";
import { getMonthRange, todayKey } from "@/lib/dates";
import {
  getPublicCalendarStatuses,
  getPublishedListingBySlug,
} from "@/lib/data/listings";
import { getVenueRealtimeChannel } from "@/lib/realtime-channels";

export const dynamic = "force-dynamic";

const getListing = cache(getPublishedListingBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);

  return listing
    ? {
        description: listing.description,
        title: listing.name,
      }
    : { title: "Private pool" };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);

  if (!listing) notFound();

  const startingPrice = getListingStartingPrice(listing);
  const initialMonth = todayKey().slice(0, 7);
  const initialStatuses =
    listing.calendarVenueEligible && listing.calendarVenueId
      ? await getPublicCalendarStatuses(
          listing.calendarVenueId,
          getMonthRange(initialMonth).start,
          getMonthRange(initialMonth).end,
        )
      : [];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link
        className="mb-5 inline-flex items-center gap-2 text-xs font-black text-[#123C36] transition hover:text-[#967230]"
        href="/listing"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        All private pools
      </Link>

      <header className="mb-6 flex flex-col gap-3 border-b border-[#ded8c8] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-1.5 text-xs font-black text-[#967230]">
            <MapPin size={14} aria-hidden="true" />
            {listing.locationName}
          </p>
          <h1 className="m-0 mt-2 text-3xl font-black leading-tight text-[#123C36] sm:text-4xl">
            {listing.name}
          </h1>
        </div>
        <div className="text-left lg:text-right">
          <p className="m-0 text-[10px] font-black uppercase text-slate-400">
            Rates from
          </p>
          <p className="m-0 mt-1 text-2xl font-black text-[#123C36]">
            {formatListingPrice(startingPrice, listing.priceCurrency)}
          </p>
          <p className="m-0 mt-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Per session
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px]">
        <ListingCarousel images={listing.images} listingName={listing.name} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#ded8c8] bg-[#ded8c8] sm:grid-cols-3 lg:grid-cols-6">
        <Fact icon={UsersRound} label="Pool capacity" value={`${listing.poolCapacity} guests`} />
        <Fact icon={BedDouble} label="Stay capacity" value={`${listing.stayCapacity} guests`} />
        <Fact icon={BedDouble} label="Bedrooms" value={String(listing.bedrooms)} />
        <Fact icon={Bath} label="Toilets" value={String(listing.toilets)} />
        <Fact icon={Ruler} label="Pool dimensions" value={formatPoolDimensions(listing)} />
        <Fact icon={listing.hasWifi ? Wifi : WifiOff} label="Wi-Fi" value={listing.hasWifi ? "Available" : "Not available"} />
      </div>

      <section className="grid gap-8 border-b border-[#ded8c8] py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div>
          <SectionHeading icon={Waves} title="About this private" />
          <p className="m-0 mt-4 max-w-3xl whitespace-pre-line text-sm font-semibold leading-7 text-slate-600 sm:text-[15px]">
            {listing.description}
          </p>
          <ContactActions className="mt-5" listing={listing} />
        </div>
        <div>
          <ListingRates listing={listing} />
        </div>
      </section>

      <section className="border-b border-[#ded8c8] py-10">
        <SectionHeading icon={Sparkles} title="What is included" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listing.inclusions.map((item) => (
            <article className="rounded-lg border border-[#ded8c8] bg-white p-4" key={item.id}>
              <h3 className="m-0 text-sm font-black text-[#123C36]">{item.label}</h3>
              {item.details ? (
                <p className="m-0 mt-1.5 text-xs font-semibold leading-5 text-slate-500">
                  {item.details}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {listing.calendarVenueEligible && listing.calendarVenueId ? (
        <section className="border-b border-[#ded8c8] py-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading icon={Clock3} title="Availability" />
            <p className="m-0 text-xs font-bold text-slate-500">
              Calendar status updates live.
            </p>
          </div>
          <ListingDetailCalendar
            channelName={getVenueRealtimeChannel(listing.calendarVenueId)}
            initialMonth={initialMonth}
            initialStatuses={initialStatuses}
            listing={listing}
            slug={listing.slug}
          />
        </section>
      ) : null}

      <section className="grid gap-8 border-b border-[#ded8c8] py-10 lg:grid-cols-2">
        <div>
          <SectionHeading icon={ShieldCheck} title="Rules and regulations" />
          <ol className="m-0 mt-5 grid list-none gap-3 p-0">
            {listing.rules.map((rule, index) => (
              <li className="flex gap-3 text-sm font-semibold leading-6 text-slate-600" key={rule.id}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F6E4AE] text-[10px] font-black text-[#123C36]">
                  {index + 1}
                </span>
                <span>{rule.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionHeading icon={MapPin} title="Location" />
          <div className="mt-5 overflow-hidden rounded-lg border border-[#ded8c8] bg-white">
            <iframe
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={getMapEmbedUrl(listing.locationName)}
              title={`${listing.name} map`}
            />
            <a
              className="flex h-11 items-center justify-center gap-2 border-t border-[#ded8c8] text-xs font-black text-[#123C36] transition hover:bg-[#FCF7E8]"
              href={listing.googleMapsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open in Google Maps
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <SocialLinks listing={listing} />
    </main>
  );
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="grid min-h-24 place-items-center bg-white p-3 text-center"><Icon className="text-[#967230]" size={18} aria-hidden="true" /><span className="mt-2 text-[10px] font-black uppercase text-slate-400">{label}</span><strong className="mt-1 text-xs font-black text-[#123C36]">{value}</strong></div>;
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F6E4AE] text-[#123C36]"><Icon size={17} aria-hidden="true" /></span><h2 className="m-0 text-xl font-black text-[#123C36]">{title}</h2></div>;
}

function ListingRates({ listing }: { listing: PublicListing }) {
  const weekdayIsoDays = getListingWeekdayIsoDays(listing.weekendIsoDays);

  return (
    <>
      <SectionHeading icon={Clock3} title="Rates & hours" />
      <div className="mt-4 overflow-hidden rounded-lg border border-[#ded8c8] bg-white">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-[#f7f5ed]">
            <tr>
              <th className="w-[38%] border-b border-r border-[#ded8c8] px-3 py-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400" scope="col">
                Rate days
              </th>
              <RateHeader
                end={listing.dayCheckOut}
                label="Day use"
                start={listing.dayCheckIn}
              />
              <RateHeader
                end={listing.nightCheckOut}
                label="Night use"
                start={listing.nightCheckIn}
              />
            </tr>
          </thead>
          <tbody>
            <RateRow
              currency={listing.priceCurrency}
              dayPrice={listing.weekdayDayPriceAmount}
              days={formatListingIsoDays(weekdayIsoDays)}
              label="Weekday"
              nightPrice={listing.weekdayNightPriceAmount}
            />
            <RateRow
              currency={listing.priceCurrency}
              dayPrice={listing.weekendDayPriceAmount}
              days={formatListingIsoDays(listing.weekendIsoDays)}
              label="Weekend"
              nightPrice={listing.weekendNightPriceAmount}
            />
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-2 text-[10px] font-semibold leading-4 text-slate-400">
        Night rates follow the day on which the night session starts.
      </p>
    </>
  );
}

function RateHeader({
  end,
  label,
  start,
}: {
  end: string;
  label: string;
  start: string;
}) {
  return (
    <th className="border-b border-r border-[#ded8c8] px-2 py-3 text-center last:border-r-0" scope="col">
      <span className="block text-[11px] font-black text-[#123C36]">{label}</span>
      <span className="mt-0.5 block text-[9px] font-bold leading-4 text-slate-400">
        {formatListingTime(start)}–{formatListingTime(end)}
      </span>
    </th>
  );
}

function RateRow({
  currency,
  dayPrice,
  days,
  label,
  nightPrice,
}: {
  currency: string;
  dayPrice: number;
  days: string;
  label: string;
  nightPrice: number;
}) {
  return (
    <tr className="last:[&>*]:border-b-0">
      <th className="border-b border-r border-[#ded8c8] px-3 py-3" scope="row">
        <span className="block text-[11px] font-black text-slate-700">{label}</span>
        <span className="mt-0.5 block text-[9px] font-bold text-slate-400">{days}</span>
      </th>
      {[dayPrice, nightPrice].map((price, index) => (
        <td
          className="border-b border-r border-[#ded8c8] px-2 py-3 text-center text-xs font-black text-[#123C36] last:border-r-0"
          key={index === 0 ? "day" : "night"}
        >
          {formatListingPrice(price, currency)}
        </td>
      ))}
    </tr>
  );
}

function SocialLinks({ listing }: { listing: PublicListing }) {
  const links = [
    [listing.instagramUrl, "Instagram", Camera],
    [listing.facebookUrl, "Facebook", Users],
    [listing.tiktokUrl, "TikTok", Music2],
    [listing.youtubeUrl, "YouTube", CirclePlay],
    [listing.websiteUrl, "Website", Globe2],
  ] as const;
  const visible = links.filter(([url]) => Boolean(url));

  return (
    <section className="py-10">
      <SectionHeading icon={Globe2} title="Follow and explore" />
      {visible.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visible.map(([url, label, Icon]) => (
            <a className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9d5c9] bg-white px-3 text-xs font-black text-[#123C36] transition hover:bg-[#FCF7E8]" href={url} key={label} rel="noopener noreferrer" target="_blank">
              <Icon size={15} aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      ) : null}
      <ContactActions className="mt-3" listing={listing} />
    </section>
  );
}

function ContactActions({ className, listing }: { className?: string; listing: PublicListing }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <a
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1f9d55] px-4 text-sm font-black text-white transition hover:bg-[#178345]"
        href={getWhatsAppUrl(listing.whatsappNumber, listing.name)}
        rel="noopener noreferrer"
        target="_blank"
      >
        <MessageCircle size={17} aria-hidden="true" />
        WhatsApp
      </a>
      <a
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d9d5c9] bg-white px-4 text-sm font-black text-[#123C36] transition hover:bg-[#FCF7E8]"
        href={`tel:${listing.phoneNumber.replace(/[^+\d]/g, "")}`}
      >
        <Phone size={17} aria-hidden="true" />
        {listing.phoneNumber}
      </a>
    </div>
  );
}
