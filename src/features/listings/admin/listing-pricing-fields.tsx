"use client";

import { useState } from "react";

import {
  ListingField,
  listingInputClassName,
} from "@/features/listings/admin/listing-form-controls";
import type {
  IsoWeekday,
  PublicListing,
} from "@/features/listings/types";
import {
  formatListingIsoDays,
  getListingWeekdayIsoDays,
  listingIsoWeekdays,
} from "@/features/listings/utils";
import { cn } from "@/lib/ui";

const defaultWeekendIsoDays: IsoWeekday[] = [6, 7];

export function ListingPricingFields({
  errors,
  listing,
}: {
  errors: Record<string, string>;
  listing?: PublicListing;
}) {
  const [weekendIsoDays, setWeekendIsoDays] = useState<IsoWeekday[]>(() =>
    listing?.weekendIsoDays.length
      ? listing.weekendIsoDays
      : defaultWeekendIsoDays,
  );
  const weekdayIsoDays = getListingWeekdayIsoDays(weekendIsoDays);

  function toggleWeekendDay(day: IsoWeekday) {
    setWeekendIsoDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right),
    );
  }

  return (
    <div className="grid gap-5">
      <fieldset
        aria-describedby={
          errors.weekendIsoDays ? "weekendIsoDays-error" : "weekendIsoDays-help"
        }
        aria-invalid={Boolean(errors.weekendIsoDays)}
        className="grid gap-3 rounded-xl border border-[#d9d5c9] bg-[#fffdf8] p-4"
      >
        <legend className="sr-only">Weekend-rate days</legend>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <span className="text-xs font-black text-slate-800">
              Weekend-rate days
            </span>
            <p
              className="m-0 mt-1 text-[11px] font-semibold leading-5 text-slate-500"
              id="weekendIsoDays-help"
            >
              Selected days use weekend prices. Every other day uses weekday
              prices.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[#EACC84]/55 bg-[#F6E4AE]/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#123C36]">
            USD pricing
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {listingIsoWeekdays.map((day) => {
            const isSelected = weekendIsoDays.includes(day.value);

            return (
              <label className="cursor-pointer" key={day.value}>
                <input
                  checked={isSelected}
                  className="peer sr-only"
                  name="weekendIsoDays"
                  onChange={() => toggleWeekendDay(day.value)}
                  type="checkbox"
                  value={day.value}
                />
                <span className="grid min-h-10 place-items-center rounded-lg border border-[#d9d5c9] bg-white px-2 text-xs font-black text-slate-600 transition peer-checked:border-[#C0964E] peer-checked:bg-[#123C36] peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-[#EACC84]/45">
                  <span className="sm:hidden">{day.shortLabel.slice(0, 2)}</span>
                  <span className="hidden sm:inline">{day.shortLabel}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
          <span>
            <strong className="text-slate-700">Weekday:</strong>{" "}
            {formatListingIsoDays(weekdayIsoDays)}
          </span>
          <span>
            <strong className="text-slate-700">Weekend:</strong>{" "}
            {formatListingIsoDays(weekendIsoDays)}
          </span>
        </div>

        {errors.weekendIsoDays ? (
          <span
            className="text-xs font-bold text-rose-700"
            id="weekendIsoDays-error"
          >
            {errors.weekendIsoDays}
          </span>
        ) : null}
      </fieldset>

      <div className="grid gap-3 lg:grid-cols-2">
        <RateGroup
          dayPrice={listing?.weekdayDayPriceAmount ?? 0}
          dayPriceError={errors.weekdayDayPriceAmount}
          dayPriceName="weekdayDayPriceAmount"
          days={formatListingIsoDays(weekdayIsoDays)}
          nightPrice={listing?.weekdayNightPriceAmount ?? 0}
          nightPriceError={errors.weekdayNightPriceAmount}
          nightPriceName="weekdayNightPriceAmount"
          title="Weekday rates"
        />
        <RateGroup
          dayPrice={listing?.weekendDayPriceAmount ?? 0}
          dayPriceError={errors.weekendDayPriceAmount}
          dayPriceName="weekendDayPriceAmount"
          days={formatListingIsoDays(weekendIsoDays)}
          nightPrice={listing?.weekendNightPriceAmount ?? 0}
          nightPriceError={errors.weekendNightPriceAmount}
          nightPriceName="weekendNightPriceAmount"
          title="Weekend rates"
        />
      </div>
    </div>
  );
}

function RateGroup({
  dayPrice,
  dayPriceError,
  dayPriceName,
  days,
  nightPrice,
  nightPriceError,
  nightPriceName,
  title,
}: {
  dayPrice: number;
  dayPriceError?: string;
  dayPriceName: string;
  days: string;
  nightPrice: number;
  nightPriceError?: string;
  nightPriceName: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-[#d9d5c9] bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-sm font-black text-[#123C36]">{title}</h3>
          <p className="m-0 mt-1 text-[11px] font-bold text-slate-500">{days}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PriceInput
          defaultValue={dayPrice}
          error={dayPriceError}
          label="Day use"
          name={dayPriceName}
        />
        <PriceInput
          defaultValue={nightPrice}
          error={nightPriceError}
          label="Night use"
          name={nightPriceName}
        />
      </div>
    </section>
  );
}

function PriceInput({
  defaultValue,
  error,
  label,
  name,
}: {
  defaultValue: number;
  error?: string;
  label: string;
  name: string;
}) {
  return (
    <ListingField error={error} label={label} name={name}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
          $
        </span>
        <input
          aria-invalid={Boolean(error)}
          className={cn(
            listingInputClassName,
            "pl-8",
            error &&
              "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100",
          )}
          defaultValue={defaultValue}
          id={name}
          inputMode="decimal"
          min="0"
          name={name}
          required
          step="0.01"
          type="number"
        />
      </div>
    </ListingField>
  );
}
