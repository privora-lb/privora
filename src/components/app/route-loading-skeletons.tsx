import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/ui";

const monthRows = Array.from({ length: 35 }, (_, index) => index);
const tableRows = Array.from({ length: 14 }, (_, index) => index);
const mobileCards = Array.from({ length: 4 }, (_, index) => index);
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarRouteSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading calendar"
      className="overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-4 border-b border-[#d8e9ee] bg-[#f5fbfd] px-5 py-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(320px,1fr)_auto] lg:items-end max-[760px]:px-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e2f7fb] text-[#007c92] ring-1 ring-[#c4edf4]">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-2.5 w-36 rounded-full" />
              <SkeletonBlock className="mt-2 h-6 w-44 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <LegendSkeleton widthClassName="w-20" />
            <LegendSkeleton widthClassName="w-16" />
            <LegendSkeleton widthClassName="w-28" />
          </div>
        </div>

        <div className="min-w-0">
          <SkeletonBlock className="mb-2 h-2.5 w-32 rounded-full" />
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#c6e9ef] bg-white px-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <SkeletonBlock className="h-4 w-4 rounded-full" />
            <SkeletonBlock className="h-3.5 flex-1 rounded-full" />
            <SkeletonBlock className="h-4 w-14 rounded-full" />
          </div>
        </div>

        <div className="min-w-0 lg:justify-self-end">
          <SkeletonBlock className="mb-2 h-2.5 w-24 rounded-full" />
          <div className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#c6e9ef] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
            <SkeletonBlock className="h-9 w-28 rounded-lg" />
            <SkeletonBlock className="h-9 w-9 rounded-lg bg-[#cdeff4]" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 max-[760px]:px-3">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] max-[760px]:hidden">
          <CalendarGridSkeleton />
          <DayPanelSkeleton />
        </div>
        <MobileCalendarSkeleton />
      </div>
    </section>
  );
}

export function CmsTableRouteSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading table"
      className="overflow-hidden rounded-[14px] border border-[#EACC84]/40 bg-white shadow-[0_18px_48px_rgba(18,60,54,0.1)]"
    >
      <div className="overflow-visible border-b border-[#C0964E]/35 bg-[#123C36] px-4 py-3 text-white max-[640px]:px-3">
        <div className="flex min-h-12 min-w-0 flex-wrap items-center gap-2 max-[640px]:grid max-[640px]:grid-cols-1">
          <SkeletonBlock className="h-9 w-28 rounded-lg bg-[#EACC84]/25 max-[640px]:w-full" />
          <div className="flex min-h-9 min-w-0 flex-[1_1_420px] items-center overflow-hidden rounded-lg border border-[#EACC84]/35 bg-white/95 shadow-[0_10px_24px_rgba(0,0,0,0.12)] max-[900px]:w-full max-[640px]:min-h-10">
            <SkeletonBlock className="mx-2 h-3 w-20 shrink-0 rounded-full" />
            <span className="h-6 w-px shrink-0 bg-[#EACC84]/45" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
              <SkeletonBlock className="h-4 w-4 rounded-full" />
              <SkeletonBlock className="h-3.5 flex-1 rounded-full" />
            </div>
          </div>
          <SkeletonBlock className="h-9 w-28 rounded-lg bg-[#EACC84]/25 max-[640px]:w-full" />
          <SkeletonBlock className="h-9 w-32 rounded-lg bg-[#EACC84]/25 max-[640px]:w-full" />
        </div>
      </div>

      <div className="overflow-x-auto bg-white max-[680px]:hidden">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_0.8fr_88px] border-b border-[#EACC84]/35 bg-[#FCF7E8]">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="flex min-h-9 items-center border-r border-[#EACC84]/35 px-3 last:border-r-0"
                key={index}
              >
                <SkeletonBlock className="h-3 w-20 rounded-full" />
              </div>
            ))}
          </div>

          <div className="bg-white">
            {tableRows.map((row) => (
              <div
                className={cn(
                  "grid min-h-[35px] grid-cols-[1.1fr_1fr_1fr_1fr_0.8fr_88px] border-b border-[#F6E4AE]/45 last:border-b-0",
                  row % 2 === 0 ? "bg-white" : "bg-[#FCFBF4]",
                )}
                key={row}
              >
                {Array.from({ length: 6 }, (_, cell) => (
                  <div
                    className="flex min-w-0 items-center border-r border-[#F6E4AE]/45 px-3 last:border-r-0"
                    key={`${row}-${cell}`}
                  >
                    {cell === 5 ? (
                      <div className="flex w-full justify-center gap-1.5">
                        <SkeletonBlock className="h-7 w-7 rounded-md" />
                        <SkeletonBlock className="h-7 w-7 rounded-md" />
                      </div>
                    ) : (
                      <SkeletonBlock
                        className={cn(
                          "h-3 rounded-full",
                          cell === 0 && "w-32",
                          cell === 1 && "w-24",
                          cell === 2 && "w-28",
                          cell === 3 && "w-20",
                          cell === 4 && "w-16",
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden gap-3 bg-[#FCFBF4] p-3 max-[680px]:grid">
        {mobileCards.map((card) => (
          <article
            className="overflow-hidden rounded-2xl border border-[#EACC84]/40 bg-white shadow-[0_16px_36px_rgba(18,60,54,0.08)]"
            key={card}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#F6E4AE]/50 bg-[#FCF7E8] px-3 py-3">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-2.5 w-20 rounded-full" />
                <SkeletonBlock className="mt-2 h-4 w-36 rounded-full" />
              </div>
              <div className="flex gap-1.5">
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
              </div>
            </div>
            <div className="grid gap-1.5 p-3">
              {Array.from({ length: 4 }, (_, row) => (
                <div
                  className="grid gap-1.5 rounded-xl border border-[#F6E4AE]/50 bg-white px-3 py-2.5"
                  key={row}
                >
                  <SkeletonBlock className="mx-auto h-2.5 w-16 rounded-full" />
                  <SkeletonBlock className="mx-auto h-3.5 w-28 rounded-full" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(130px,0.45fr)_minmax(220px,1fr)_auto] items-center gap-3 border-t border-[#EACC84]/35 bg-[#FCF7E8] px-4 py-3 max-[980px]:grid-cols-1 max-[680px]:gap-2 max-[680px]:px-3">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <div className="grid justify-items-center gap-2 max-[980px]:justify-items-start max-[680px]:hidden">
          <SkeletonBlock className="h-4 w-44 rounded-full" />
          <SkeletonBlock className="h-3 w-64 rounded-full" />
        </div>
        <div className="flex items-center justify-end gap-2 max-[680px]:justify-between max-[680px]:gap-1.5">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-8 w-16 rounded-md" />
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </section>
  );
}

export function RedirectRouteSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.09)]"
    >
      <SkeletonBlock className="h-10 w-full rounded-xl" />
    </div>
  );
}

function CalendarGridSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white">
      <div className="grid grid-cols-7 border-b border-[#d8e9ee] bg-[#eefbfc]">
        {weekdays.map((day) => (
          <div
            className="grid min-h-9 place-items-center border-r border-[#d8e9ee] px-2 last:border-r-0"
            key={day}
          >
            <SkeletonBlock className="h-2.5 w-8 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthRows.map((day) => (
          <div
            className={cn(
              "min-h-[128px] border-b border-r border-[#d8e9ee] p-2.5 last:border-r-0",
              day % 7 === 6 && "border-r-0",
              day > 27 && "border-b-0",
              day % 5 === 0 ? "bg-[#ecfdf3]" : "bg-white",
            )}
            key={day}
          >
            <SkeletonBlock className="h-8 w-8 rounded-lg bg-white" />
            {day % 3 === 0 ? (
              <div className="mt-8 grid justify-items-center gap-2">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-3 w-24 rounded-full" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayPanelSkeleton() {
  return (
    <aside className="overflow-hidden rounded-2xl border border-[#d8e9ee] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)]">
      <div className="border-b border-[#d8e9ee] bg-[#eefbfc] px-4 py-3">
        <SkeletonBlock className="h-5 w-44 rounded-full" />
        <SkeletonBlock className="mt-2 h-3 w-48 rounded-full" />
      </div>
      <div className="grid gap-4 p-4">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <SkeletonBlock className="h-32 w-full rounded-xl" />
        <div className="mt-2 flex gap-2">
          <SkeletonBlock className="h-10 flex-1 rounded-xl" />
          <SkeletonBlock className="h-10 flex-1 rounded-xl bg-[#cdeff4]" />
        </div>
      </div>
    </aside>
  );
}

function MobileCalendarSkeleton() {
  return (
    <div className="hidden max-[760px]:grid max-[760px]:gap-3">
      <div className="rounded-2xl border border-[#d8e9ee] bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-10 flex-1 rounded-xl" />
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {weekdays.map((day) => (
            <div className="grid min-h-[52px] place-items-center gap-1 rounded-xl border border-[#d8e9ee] bg-[#f5fbfd] p-1" key={day}>
              <SkeletonBlock className="h-2 w-6 rounded-full" />
              <SkeletonBlock className="h-6 w-6 rounded-md bg-white" />
              <SkeletonBlock className="h-1.5 w-1.5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <DayPanelSkeleton />
    </div>
  );
}

function LegendSkeleton({ widthClassName }: { widthClassName: string }) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-[#c6e9ef] bg-white px-2.5">
      <SkeletonBlock className="h-1.5 w-1.5 rounded-full" />
      <SkeletonBlock className={cn("h-2.5 rounded-full", widthClassName)} />
    </span>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <span
      className={cn(
        "block animate-pulse bg-slate-200/80 motion-reduce:animate-none",
        className,
      )}
    />
  );
}
