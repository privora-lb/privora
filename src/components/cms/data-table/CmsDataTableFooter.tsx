import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { ReactNode } from "react";

import { CmsDataTableIconButton } from "./CmsDataTableIconButton";

type CmsDataTableFooterProps = {
  description?: string;
  eyebrow?: string;
  filteredTotal: number;
  firstPageLabel: string;
  firstRow: number;
  goToPage: (page: number) => void;
  lastPageLabel: string;
  lastRow: number;
  nextPageLabel: string;
  pageCount: number;
  pageInput: string;
  pageInputLabel: string;
  pageLabel: string;
  previousPageLabel: string;
  safePage: number;
  setPageInput: (value: string) => void;
  showingLabel?: (first: number, last: number, total: number) => ReactNode;
  title: string;
};

export function CmsDataTableFooter({
  description,
  eyebrow,
  filteredTotal,
  firstPageLabel,
  firstRow,
  goToPage,
  lastPageLabel,
  lastRow,
  nextPageLabel,
  pageCount,
  pageInput,
  pageInputLabel,
  pageLabel,
  previousPageLabel,
  safePage,
  setPageInput,
  showingLabel,
  title,
}: CmsDataTableFooterProps) {
  return (
    <div className="grid grid-cols-[minmax(130px,0.45fr)_minmax(220px,1fr)_auto] items-center gap-3 border-t border-[#EACC84]/35 bg-[#FCF7E8] px-4 py-3 max-[980px]:grid-cols-1 max-[680px]:gap-2 max-[680px]:px-3">
      <p className="m-0 text-[13px] font-black text-slate-500">
        {showingLabel ? (
          showingLabel(firstRow, lastRow, filteredTotal)
        ) : (
          <>
            Showing <span className="text-slate-950">{firstRow}-{lastRow}</span>{" "}
            of <span className="text-slate-950">{filteredTotal}</span>
          </>
        )}
      </p>
      <div className="min-w-0 text-center max-[980px]:text-left max-[680px]:hidden rtl:max-[980px]:text-right">
        <div className="flex min-w-0 items-baseline justify-center gap-2 max-[980px]:justify-start rtl:max-[980px]:justify-end">
          {eyebrow ? (
            <span className="shrink-0 text-[10px] font-black uppercase text-[#967230]">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="m-0 truncate text-[16px] font-black leading-none text-slate-950">
            {title}
          </h2>
        </div>
        {description ? (
          <p className="m-0 mt-1 truncate text-[11px] font-bold leading-[1.35] text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2 max-[680px]:justify-between max-[680px]:gap-1.5">
        <CmsDataTableIconButton
          label={firstPageLabel}
          onClick={() => goToPage(1)}
          disabled={safePage === 1}
        >
          <ChevronsLeft size={17} aria-hidden="true" />
        </CmsDataTableIconButton>
        <CmsDataTableIconButton
          label={previousPageLabel}
          onClick={() => goToPage(safePage - 1)}
          disabled={safePage === 1}
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </CmsDataTableIconButton>
        <label className="flex min-h-9 items-center gap-2 text-[12px] font-black text-slate-500 max-[680px]:gap-1">
          <span className="max-[680px]:sr-only">{pageLabel}</span>
          <input
            aria-label={pageInputLabel}
            className="min-h-8 w-16 rounded-md border border-[#EACC84]/45 bg-white px-2 text-center text-[13px] font-black text-slate-950 outline-none transition [appearance:textfield] focus:border-[#C0964E] focus:ring-2 focus:ring-[#EACC84]/25 max-[680px]:w-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            inputMode="numeric"
            max={pageCount}
            min={1}
            onBlur={() => goToPage(Number(pageInput))}
            onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                goToPage(Number(pageInput));
                event.currentTarget.blur();
              }
            }}
            type="number"
            value={pageInput}
          />
        </label>
        <CmsDataTableIconButton
          label={nextPageLabel}
          onClick={() => goToPage(safePage + 1)}
          disabled={safePage === pageCount}
        >
          <ChevronRight size={17} aria-hidden="true" />
        </CmsDataTableIconButton>
        <CmsDataTableIconButton
          label={lastPageLabel}
          onClick={() => goToPage(pageCount)}
          disabled={safePage === pageCount}
        >
          <ChevronsRight size={17} aria-hidden="true" />
        </CmsDataTableIconButton>
      </div>
    </div>
  );
}
