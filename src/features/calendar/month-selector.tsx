"use client";

import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { addMonths, getMonthLabel, todayKey } from "@/lib/dates";
import { cn } from "@/lib/ui";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthSelector({
  monthKey,
  selectedVenueId,
  view = "compact",
}: {
  monthKey: string;
  selectedVenueId: string;
  view?: "compact" | "full";
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => getMonthParts(monthKey).year);
  const currentMonthKey = todayKey().slice(0, 7);
  const yearOptions = useMemo(
    () => buildYearOptions(currentMonthKey, monthKey, viewYear),
    [currentMonthKey, monthKey, viewYear],
  );
  const months = useMemo(
    () =>
      monthNames.map((label, index) => ({
        label,
        value: buildMonthKey(viewYear, index),
      })),
    [viewYear],
  );
  function getMonthHref(nextMonthKey: string) {
    const params = new URLSearchParams({
      month: nextMonthKey,
      venue: selectedVenueId,
      view,
    });

    return `/calendar?${params.toString()}`;
  }

  function navigateToMonth(nextMonthKey: string) {
    setIsOpen(false);
    setIsYearOpen(false);
    router.push(getMonthHref(nextMonthKey), { scroll: false });
  }

  function navigateToThisMonth() {
    setIsOpen(false);
    setIsYearOpen(false);
    router.push(getMonthHref(currentMonthKey), { scroll: false });
  }

  return (
    <>
    <form
      action="/calendar"
      className="hidden w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#EACC84]/35 bg-white/10 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.16)] max-[760px]:flex"
      method="GET"
    >
      <input name="venue" type="hidden" value={selectedVenueId} />
      <input name="view" type="hidden" value={view} />
      <Link
        aria-label="Previous month"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#EACC84]/35 bg-white/95 text-[#123C36] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#EACC84]/35"
        href={getMonthHref(addMonths(monthKey, -1))}
        prefetch={false}
        scroll={false}
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </Link>
      <label className="sr-only" htmlFor="mobile-month-selector">
        Select month
      </label>
      <select
        className="h-10 min-w-[132px] flex-1 rounded-xl border border-[#EACC84]/35 bg-white/95 px-3 text-center text-sm font-black text-[#123C36] outline-none focus:border-[#EACC84] focus:ring-2 focus:ring-[#EACC84]/30"
        defaultValue={monthKey}
        id="mobile-month-selector"
        name="month"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label} {viewYear}
          </option>
        ))}
      </select>
      <button
        className="h-10 shrink-0 rounded-xl bg-[#EACC84] px-3 text-xs font-black text-[#123C36] shadow-[0_10px_22px_rgba(234,204,132,0.2)]"
        type="submit"
      >
        Go
      </button>
      <Link
        aria-label="Next month"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EACC84] text-[#123C36] shadow-[0_12px_26px_rgba(234,204,132,0.22)] transition hover:bg-[#F6E4AE] focus:outline-none focus:ring-2 focus:ring-[#EACC84]/35"
        href={getMonthHref(addMonths(monthKey, 1))}
        prefetch={false}
        scroll={false}
      >
        <ChevronRight size={17} aria-hidden="true" />
      </Link>
      <Link
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#EACC84]/35 bg-white/95 px-3 text-[11px] font-bold text-[#123C36] shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
        href={getMonthHref(currentMonthKey)}
        prefetch={false}
        scroll={false}
      >
        <RotateCcw size={13} aria-hidden="true" />
        This month
      </Link>
    </form>
    <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#EACC84]/35 bg-white/10 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.16)] min-[460px]:flex-nowrap sm:w-auto max-[760px]:hidden">
      <MonthIconButton
        label="Previous month"
        onClick={() => navigateToMonth(addMonths(monthKey, -1))}
        variant="outline"
      >
        <ChevronLeft size={17} aria-hidden="true" />
      </MonthIconButton>

      <div
        className="relative min-w-0 flex-1 min-[460px]:max-w-[230px] sm:min-w-[250px] sm:max-w-none"
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
      >
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#EACC84]/35 bg-white/95 px-3 text-sm font-black text-[#123C36] outline-none transition hover:bg-white focus:border-[#EACC84] focus:ring-2 focus:ring-[#EACC84]/30 min-[520px]:justify-start min-[520px]:px-4"
          onClick={() => {
            setViewYear(getMonthParts(monthKey).year);
            setIsYearOpen(false);
            setIsOpen((current) => !current);
          }}
          type="button"
        >
          <CalendarRange
            aria-hidden="true"
            className="shrink-0 text-[#967230]"
            size={17}
          />
          <span className="hidden min-w-0 flex-1 truncate min-[520px]:block">
            {getMonthLabel(monthKey)}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "hidden shrink-0 text-[#123C36] transition min-[520px]:block",
              isOpen && "rotate-180",
            )}
            size={16}
          />
        </button>

        {isOpen ? (
          <div className="absolute left-1/2 top-full z-50 mt-3 w-[360px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#EACC84]/45 bg-white shadow-[0_24px_60px_rgba(18,60,54,0.16)] max-[640px]:fixed max-[640px]:bottom-4 max-[640px]:left-3 max-[640px]:right-3 max-[640px]:top-auto max-[640px]:w-auto max-[640px]:translate-x-0">
            <div className="flex items-center justify-between gap-3 border-b border-[#EACC84]/45 bg-[#FCF7E8] px-3 py-3">
              <div className="min-w-0">
                <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-[#967230]">
                  Select month
                </p>
                <p className="m-0 mt-0.5 text-sm font-bold text-slate-500">
                  Showing 12 months for the selected year
                </p>
              </div>
              <div className="relative shrink-0">
                <button
                  aria-expanded={isYearOpen}
                  aria-haspopup="listbox"
                  className="inline-flex h-10 min-w-[118px] items-center justify-between gap-3 rounded-xl border border-[#EACC84]/50 bg-white px-3 text-sm font-black text-[#123C36] shadow-[0_8px_18px_rgba(18,60,54,0.04)] transition hover:bg-[#FCF7E8] focus:outline-none focus:ring-2 focus:ring-[#EACC84]/30"
                  onClick={() => setIsYearOpen((current) => !current)}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  {viewYear}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "text-[#123C36] transition",
                      isYearOpen && "rotate-180",
                    )}
                    size={15}
                  />
                </button>

                {isYearOpen ? (
                  <div
                    className="absolute right-0 top-full z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-[#EACC84]/45 bg-white p-1 shadow-[0_18px_42px_rgba(18,60,54,0.14)]"
                    role="listbox"
                  >
                    {yearOptions.map((year) => {
                      const isSelected = year === viewYear;

                      return (
                        <button
                          aria-selected={isSelected}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-black transition hover:bg-[#FCF7E8]",
                            isSelected
                              ? "bg-[#FCF7E8] text-[#967230]"
                              : "text-slate-700",
                          )}
                          key={year}
                          onClick={() => {
                            setViewYear(year);
                            setIsYearOpen(false);
                          }}
                          onMouseDown={(event) => event.preventDefault()}
                          role="option"
                          type="button"
                        >
                          {year}
                          {isSelected ? <Check size={14} aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3">
              {months.map((month) => {
                const isSelected = month.value === monthKey;
                const isCurrent = month.value === currentMonthKey;
                const isPast = month.value < currentMonthKey;

                return (
                  <button
                    className={cn(
                      "relative min-h-[66px] rounded-xl border px-2 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#EACC84]/35",
                      isSelected
                        ? "border-[#C0964E] bg-[#FCF7E8] text-[#123C36] shadow-[0_10px_24px_rgba(192,150,78,0.14)]"
                        : isPast
                          ? "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          : "border-[#EACC84]/40 bg-white text-slate-900 hover:bg-[#FCF7E8]",
                    )}
                    key={month.value}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigateToMonth(month.value)}
                    type="button"
                  >
                    <span className="block text-sm font-black">{month.label}</span>
                    <span
                      className={cn(
                        "mt-1 block text-[10px] font-black uppercase tracking-[0.08em]",
                        isPast ? "text-slate-400" : "text-[#967230]",
                      )}
                    >
                      {isCurrent ? "Current" : isPast ? "Display only" : "Editable"}
                    </span>
                    {isSelected ? (
                      <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#C0964E] text-[#123C36]">
                        <Check size={12} aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#EACC84]/45 bg-[#FCF7E8] px-3 py-2 text-[11px] font-bold text-slate-500">
              Previous months are view only. Current and future months can be updated.
            </div>
          </div>
        ) : null}
      </div>

      <MonthIconButton
        label="Next month"
        onClick={() => navigateToMonth(addMonths(monthKey, 1))}
        variant="solid"
      >
        <ChevronRight size={17} aria-hidden="true" />
      </MonthIconButton>

      <button
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#EACC84]/35 bg-white/95 px-3 text-[12px] font-bold text-[#123C36] shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition hover:border-[#EACC84] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#EACC84]/30 max-[420px]:px-2 max-[420px]:text-[11px] max-[360px]:h-9"
        onClick={navigateToThisMonth}
        type="button"
      >
        <RotateCcw size={14} aria-hidden="true" />
        <span className="max-[360px]:sr-only">This month</span>
      </button>
    </div>
    </>
  );
}

function getMonthParts(monthKey: string) {
  const [year = "0"] = monthKey.split("-");

  return {
    year: Number(year),
  };
}

function buildMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function buildYearOptions(
  currentMonthKey: string,
  selectedMonthKey: string,
  viewYear: number,
) {
  const currentYear = getMonthParts(currentMonthKey).year;
  const selectedYear = getMonthParts(selectedMonthKey).year;
  const years = new Set<number>([selectedYear, viewYear]);

  for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
    years.add(year);
  }

  return Array.from(years).sort((a, b) => a - b);
}

function MonthIconButton({
  children,
  label,
  onClick,
  variant,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  variant: "outline" | "solid";
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#EACC84]/35",
        variant === "solid"
          ? "bg-[#EACC84] text-[#123C36] shadow-[0_12px_26px_rgba(234,204,132,0.22)] hover:bg-[#F6E4AE]"
          : "border border-[#EACC84]/35 bg-white/95 text-[#123C36] hover:bg-white",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
