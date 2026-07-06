import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

import type { CmsDataTableBehavior, CmsDataTableSearchOption } from "./types";

type CmsDataTableToolbarProps<Row> = {
  addBehavior: CmsDataTableBehavior;
  addLabel?: string;
  onAdd?: () => void;
  onSearchOptionChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  searchLabel: string;
  searchOptions: CmsDataTableSearchOption<Row>[];
  searchPlaceholder: string;
  searchQuery: string;
  searchSelectLabel: string;
  selectedSearchOption: string;
  tableDomId: string;
  toolbarExtra?: ReactNode;
  toolbarSingleLine: boolean;
};

export function CmsDataTableToolbar<Row>({
  addBehavior,
  addLabel,
  onAdd,
  onSearchOptionChange,
  onSearchQueryChange,
  searchLabel,
  searchOptions,
  searchPlaceholder,
  searchQuery,
  searchSelectLabel,
  selectedSearchOption,
  tableDomId,
  toolbarExtra,
  toolbarSingleLine,
}: CmsDataTableToolbarProps<Row>) {
  return (
    <div
      className={cn(
        "overflow-visible border-b border-[#C0964E]/35 bg-[#123C36] px-4 py-3 text-[#FCFCF0] max-[640px]:px-3",
        toolbarSingleLine && "overflow-visible",
      )}
    >
      <div
        className={cn(
          toolbarSingleLine
            ? "flex min-h-12 min-w-0 flex-wrap items-center gap-2 max-[640px]:grid max-[640px]:grid-cols-1"
            : "flex min-h-12 min-w-0 items-center gap-3 max-[920px]:grid max-[920px]:grid-cols-[auto_minmax(0,1fr)] max-[640px]:grid-cols-1",
        )}
      >
        {onAdd && addLabel ? (
          <button
            className={cn(
              "inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#EACC84] bg-[#C0964E] px-3.5 py-2 text-[12px] font-black text-[#123C36] shadow-[0_16px_30px_rgba(192,150,78,0.2)] transition hover:-translate-y-px hover:bg-[#EACC84] disabled:cursor-not-allowed disabled:opacity-60 max-[640px]:w-full",
              toolbarSingleLine && "min-h-9 rounded-lg px-2.5 text-[11px] max-[640px]:min-h-10",
            )}
            data-add-behavior={addBehavior}
            onClick={onAdd}
            type="button"
          >
            <Plus size={16} aria-hidden="true" />
            {addLabel}
          </button>
        ) : null}

        {searchOptions.length ? (
          <div
            aria-label={searchLabel}
            className={cn(
              toolbarSingleLine
                ? "flex min-h-9 min-w-0 flex-[1_1_420px] items-center overflow-hidden rounded-lg border border-[#EACC84]/35 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition focus-within:border-[#EACC84] focus-within:ring-3 focus-within:ring-[#EACC84]/20 max-[900px]:w-full max-[640px]:min-h-10"
                : "flex min-h-10 min-w-0 flex-[1_1_480px] items-center overflow-hidden rounded-xl border border-[#EACC84]/35 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition focus-within:border-[#EACC84] focus-within:ring-3 focus-within:ring-[#EACC84]/20 max-[920px]:w-full",
            )}
            role="search"
          >
            <label className="sr-only" htmlFor={`${tableDomId}-search-by`}>
              {searchSelectLabel}
            </label>
            <select
              className={cn(
                toolbarSingleLine
                  ? "min-h-9 w-[92px] shrink-0 cursor-pointer border-0 bg-transparent px-2 text-[11px] font-semibold text-[#123C36] outline-none max-[640px]:min-h-10 max-[390px]:w-[82px]"
                  : "min-h-10 w-[140px] shrink-0 cursor-pointer border-0 bg-transparent px-3 text-[12px] font-semibold text-[#123C36] outline-none max-[520px]:w-[112px] max-[390px]:w-[92px]",
              )}
              id={`${tableDomId}-search-by`}
              onChange={(event) => onSearchOptionChange(event.target.value)}
              value={selectedSearchOption}
            >
              {searchOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="h-6 w-px shrink-0 bg-[#EACC84]/45" aria-hidden="true" />
            <label className="sr-only" htmlFor={`${tableDomId}-search-query`}>
              {searchLabel}
            </label>
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
              <Search
                size={15}
                className="shrink-0 text-[#123C36]"
                aria-hidden="true"
              />
              <input
                className={cn(
                  toolbarSingleLine
                    ? "min-h-9 min-w-0 flex-1 border-0 bg-transparent text-[11px] font-bold text-[#123C36] outline-none placeholder:text-[#123C36]/55"
                    : "min-h-10 min-w-0 flex-1 border-0 bg-transparent text-[12px] font-bold text-[#123C36] outline-none placeholder:text-[#123C36]/55",
                )}
                id={`${tableDomId}-search-query`}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={searchQuery}
              />
            </div>
          </div>
        ) : null}

        {toolbarExtra ? (
          <div
            className={cn(
              toolbarSingleLine
                ? "flex min-h-9 shrink-0 flex-wrap items-center gap-1.5 max-[900px]:w-full max-[640px]:min-h-10"
                : "flex min-h-10 flex-[0_1_auto] flex-wrap items-center gap-1.5 max-[640px]:w-full",
            )}
          >
            {toolbarExtra}
          </div>
        ) : null}
      </div>
    </div>
  );
}
