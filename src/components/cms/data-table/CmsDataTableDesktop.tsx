import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@/lib/ui";

import { CmsDataTableIconButton } from "./CmsDataTableIconButton";
import type {
  CmsDataTableAction,
  CmsDataTableBehavior,
  CmsDataTableColumn,
  SortState,
} from "./types";
import { getCellAlignment } from "./utils";

type CmsDataTableDesktopProps<Row> = {
  actions: CmsDataTableAction<Row>[];
  autoFitColumnTitle?: (column: string) => string;
  collapseColumnTitle?: (column: string) => string;
  emptyLabel: ReactNode;
  expandedColumns: Set<string>;
  getRowClassName?: (row: Row) => string | undefined;
  getRowKey: (row: Row) => string;
  gridTemplateColumns: string;
  noSearchResultsLabel?: ReactNode;
  onRowDoubleClick?: (row: Row) => void;
  pagedRows: Row[];
  resizeColumnLabel?: (column: string) => string;
  rowOpenBehavior: CmsDataTableBehavior;
  searchQuery: string;
  sortState: SortState | null;
  startColumnResize: (
    event: ReactPointerEvent<HTMLSpanElement>,
    columnIndex: number,
  ) => void;
  tableColumns: CmsDataTableColumn<Row>[];
  tableViewportRef: RefObject<HTMLDivElement | null>;
  toggleAutoFitColumn: (column: CmsDataTableColumn<Row>) => void;
  toggleColumnSort: (column: CmsDataTableColumn<Row>) => void;
  totalTableWidth: number;
};

export function CmsDataTableDesktop<Row>({
  actions,
  autoFitColumnTitle,
  collapseColumnTitle,
  emptyLabel,
  expandedColumns,
  getRowClassName,
  getRowKey,
  gridTemplateColumns,
  noSearchResultsLabel,
  onRowDoubleClick,
  pagedRows,
  resizeColumnLabel,
  rowOpenBehavior,
  searchQuery,
  sortState,
  startColumnResize,
  tableColumns,
  tableViewportRef,
  toggleAutoFitColumn,
  toggleColumnSort,
  totalTableWidth,
}: CmsDataTableDesktopProps<Row>) {
  return (
    <div ref={tableViewportRef} className="overflow-x-auto bg-white max-[680px]:hidden">
      <div className="min-w-full" style={{ width: `${Math.ceil(totalTableWidth)}px` }}>
        <div
          className="grid border-b border-[#EACC84]/35 bg-[#FCF7E8] text-left rtl:text-right"
          style={{ gridTemplateColumns }}
        >
          {tableColumns.map((column, index) => (
            <div
              className={cn(
                "relative flex min-h-9 items-center px-3",
                column.headerClassName,
              )}
              key={column.key}
              onDoubleClick={(event) => {
                if ((event.target as HTMLElement).closest("[data-resizer='true']")) {
                  return;
                }

                toggleAutoFitColumn(column);
              }}
            >
              <ColumnHeaderButton
                autoFitColumnTitle={autoFitColumnTitle}
                collapseColumnTitle={collapseColumnTitle}
                column={column}
                expandedColumns={expandedColumns}
                sortState={sortState}
                toggleColumnSort={toggleColumnSort}
              />
              {index < tableColumns.length - 1 ? (
                <span
                  aria-label={resizeColumnLabel?.(column.label) ?? `Resize ${column.label}`}
                  className="group absolute bottom-0 right-0 top-0 z-10 w-[9px] translate-x-1/2 cursor-col-resize touch-none transition hover:bg-[#EACC84]/20 rtl:left-0 rtl:right-auto rtl:-translate-x-1/2"
                  data-resizer="true"
                  onPointerDown={(event) => startColumnResize(event, index)}
                  role="separator"
                >
                  <span className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-[#EACC84]/45 transition group-hover:w-0.5 group-hover:bg-[#C0964E]" />
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="bg-white">
          {pagedRows.length ? (
            pagedRows.map((row, rowIndex) => (
              <DesktopRow
                actions={actions}
                columns={tableColumns}
                getRowClassName={getRowClassName}
                getRowKey={getRowKey}
                gridTemplateColumns={gridTemplateColumns}
                key={getRowKey(row)}
                onRowDoubleClick={onRowDoubleClick}
                row={row}
                rowIndex={rowIndex}
                rowOpenBehavior={rowOpenBehavior}
              />
            ))
          ) : (
            <div className="grid min-h-[120px] place-items-center px-4 text-center text-[14px] font-bold text-slate-500">
              {searchQuery.trim() ? noSearchResultsLabel ?? emptyLabel : emptyLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnHeaderButton<Row>({
  autoFitColumnTitle,
  collapseColumnTitle,
  column,
  expandedColumns,
  sortState,
  toggleColumnSort,
}: {
  autoFitColumnTitle?: (column: string) => string;
  collapseColumnTitle?: (column: string) => string;
  column: CmsDataTableColumn<Row>;
  expandedColumns: Set<string>;
  sortState: SortState | null;
  toggleColumnSort: (column: CmsDataTableColumn<Row>) => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 truncate text-left text-[12px] font-semibold text-[#123C36]/75 transition hover:text-[#967230] rtl:text-right",
        sortState?.key === column.key && "text-[#967230]",
      )}
      onClick={(event) => {
        if (event.detail > 1) {
          return;
        }

        toggleColumnSort(column);
      }}
      title={
        expandedColumns.has(column.key)
          ? collapseColumnTitle?.(column.label) ?? `Collapse ${column.label}`
          : autoFitColumnTitle?.(column.label) ?? `Fit ${column.label}`
      }
      type="button"
    >
      <span className="truncate">{column.label}</span>
      {column.sortable ? (
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded text-current/75" aria-hidden="true">
          {sortState?.key === column.key ? (
            sortState.direction === "asc" ? (
              <ArrowUp size={12} strokeWidth={2.6} />
            ) : (
              <ArrowDown size={12} strokeWidth={2.6} />
            )
          ) : (
            <ArrowUpDown size={12} strokeWidth={2.4} />
          )}
        </span>
      ) : null}
    </button>
  );
}

function DesktopRow<Row>({
  actions,
  columns,
  getRowClassName,
  getRowKey,
  gridTemplateColumns,
  onRowDoubleClick,
  row,
  rowIndex,
  rowOpenBehavior,
}: {
  actions: CmsDataTableAction<Row>[];
  columns: CmsDataTableColumn<Row>[];
  getRowClassName?: (row: Row) => string | undefined;
  getRowKey: (row: Row) => string;
  gridTemplateColumns: string;
  onRowDoubleClick?: (row: Row) => void;
  row: Row;
  rowIndex: number;
  rowOpenBehavior: CmsDataTableBehavior;
}) {
  return (
    <div
      className={cn(
        "grid min-h-[35px] cursor-pointer border-b border-[#F0D896]/25 text-[12px] font-bold text-slate-600 transition last:border-b-0 hover:bg-[#FCF7E8]",
        rowIndex % 2 === 0 ? "bg-white" : "bg-[#fffdf7]",
        getRowClassName?.(row),
      )}
      data-row-open-behavior={rowOpenBehavior}
      onDoubleClick={() => onRowDoubleClick?.(row)}
      style={{ gridTemplateColumns }}
    >
      {columns.map((column) => (
        <div
          className={cn(
            "flex min-w-0 items-center border-r border-[#F0D896]/25 px-3 rtl:border-l rtl:border-r-0",
            getCellAlignment(column.align as CmsDataTableColumn<unknown>["align"]),
            column.key === "__actions" && "justify-center",
            column.className,
          )}
          key={`${getRowKey(row)}-${column.key}`}
        >
          <DesktopCell actions={actions} column={column} row={row} />
        </div>
      ))}
    </div>
  );
}

function DesktopCell<Row>({
  actions,
  column,
  row,
}: {
  actions: CmsDataTableAction<Row>[];
  column: CmsDataTableColumn<Row>;
  row: Row;
}) {
  if (column.key === "__actions") {
    return (
      <div className="flex items-center justify-center gap-1.5">
        {actions
          .filter((action) => action.isVisible?.(row) ?? true)
          .map((action) => {
            if (action.render) {
              return <Fragment key={action.label}>{action.render(row)}</Fragment>;
            }

            if (!action.Icon || !action.onClick) {
              return null;
            }

            return (
              <CmsDataTableIconButton
                className={cn("h-7 w-7 rounded-md shadow-none", action.className)}
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

  if (column.render) {
    return column.render(row);
  }

  return (
    <span className="truncate" title={column.textValue?.(row)}>
      {column.textValue?.(row)}
    </span>
  );
}
