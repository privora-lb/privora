import { Fragment, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/ui";

import { CmsDataTableIconButton } from "./CmsDataTableIconButton";
import type {
  CmsDataTableAction,
  CmsDataTableBehavior,
  CmsDataTableColumn,
} from "./types";

type CmsDataTableMobileCardsProps<Row> = {
  actions: CmsDataTableAction<Row>[];
  emptyLabel: ReactNode;
  getMobileCellValue: (column: CmsDataTableColumn<Row>, row: Row) => string;
  getRowClassName?: (row: Row) => string | undefined;
  getRowKey: (row: Row) => string;
  mobileColumns: CmsDataTableColumn<Row>[];
  noSearchResultsLabel?: ReactNode;
  onRowDoubleClick?: (row: Row) => void;
  openRowFromKeyboard: (event: KeyboardEvent<HTMLElement>, row: Row) => void;
  pagedRows: Row[];
  rowOpenBehavior: CmsDataTableBehavior;
  searchQuery: string;
  title: string;
};

export function CmsDataTableMobileCards<Row>({
  actions,
  emptyLabel,
  getMobileCellValue,
  getRowClassName,
  getRowKey,
  mobileColumns,
  noSearchResultsLabel,
  onRowDoubleClick,
  openRowFromKeyboard,
  pagedRows,
  rowOpenBehavior,
  searchQuery,
  title,
}: CmsDataTableMobileCardsProps<Row>) {
  return (
    <div className="hidden gap-3 bg-[#f8fbff] p-3 max-[680px]:grid">
      {pagedRows.length ? (
        pagedRows.map((row, rowIndex) => (
          <MobileRow
            actions={actions}
            getMobileCellValue={getMobileCellValue}
            getRowClassName={getRowClassName}
            getRowKey={getRowKey}
            key={getRowKey(row)}
            mobileColumns={mobileColumns}
            onRowDoubleClick={onRowDoubleClick}
            openRowFromKeyboard={openRowFromKeyboard}
            row={row}
            rowIndex={rowIndex}
            rowOpenBehavior={rowOpenBehavior}
            title={title}
          />
        ))
      ) : (
        <div className="grid min-h-[140px] place-items-center rounded-2xl border border-slate-200 bg-white px-4 text-center text-[14px] font-bold text-slate-500 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          {searchQuery.trim() ? noSearchResultsLabel ?? emptyLabel : emptyLabel}
        </div>
      )}
    </div>
  );
}

function MobileRow<Row>({
  actions,
  getMobileCellValue,
  getRowClassName,
  getRowKey,
  mobileColumns,
  onRowDoubleClick,
  openRowFromKeyboard,
  row,
  rowIndex,
  rowOpenBehavior,
  title,
}: Omit<
  CmsDataTableMobileCardsProps<Row>,
  "emptyLabel" | "noSearchResultsLabel" | "pagedRows" | "searchQuery"
> & {
  row: Row;
  rowIndex: number;
}) {
  const primaryColumn = mobileColumns[0];
  const primaryValue = primaryColumn ? getMobileCellValue(primaryColumn, row) : "";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition",
        onRowDoubleClick && "cursor-pointer active:scale-[0.995]",
        rowIndex % 2 === 0 ? "bg-white" : "bg-[#fbfdff]",
        getRowClassName?.(row),
      )}
      data-row-open-behavior={rowOpenBehavior}
      onClick={() => onRowDoubleClick?.(row)}
      onKeyDown={(event) => openRowFromKeyboard(event, row)}
      role={onRowDoubleClick ? "button" : undefined}
      tabIndex={onRowDoubleClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#f5fbfd] px-3 py-3">
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.08em] text-[#0b6f7d]">
            {primaryColumn?.label ?? title}
          </p>
          <p className="m-0 mt-1 break-words text-[14px] font-black leading-snug text-slate-950">
            {primaryValue || getRowKey(row)}
          </p>
        </div>
        <MobileActions actions={actions} row={row} />
      </div>

      <dl className="grid gap-1.5 p-3">
        {mobileColumns.map((column) => {
          const value = getMobileCellValue(column, row);

          return (
            <div
              className="grid gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5"
              key={column.key}
            >
              <dt className="min-w-0 text-center text-[10px] font-black uppercase leading-snug text-slate-400">
                {column.label}
              </dt>
              <dd className="m-0 min-w-0 break-words text-center text-[12px] font-extrabold leading-snug text-slate-700">
                {column.mobileRender
                  ? column.mobileRender(row)
                  : column.render
                    ? column.render(row)
                    : value || "-"}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}

function MobileActions<Row>({
  actions,
  row,
}: {
  actions: CmsDataTableAction<Row>[];
  row: Row;
}) {
  const visibleActions = actions.filter((action) => action.isVisible?.(row) ?? true);

  if (!visibleActions.length) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      {visibleActions.map((action) => {
        if (action.render) {
          return <Fragment key={action.label}>{action.render(row)}</Fragment>;
        }

        if (!action.Icon || !action.onClick) {
          return null;
        }

        return (
          <CmsDataTableIconButton
            className={cn("h-8 w-8 rounded-lg shadow-none", action.className)}
            key={action.label}
            label={action.label}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick?.(row, event);
            }}
          >
            <action.Icon size={15} aria-hidden="true" />
          </CmsDataTableIconButton>
        );
      })}
    </div>
  );
}
