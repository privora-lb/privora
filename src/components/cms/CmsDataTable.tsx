"use client";

import type { KeyboardEvent } from "react";

import { cn } from "@/lib/ui";

import { CmsDataTableDesktop } from "./data-table/CmsDataTableDesktop";
import { CmsDataTableFooter } from "./data-table/CmsDataTableFooter";
import { CmsDataTableMobileCards } from "./data-table/CmsDataTableMobileCards";
import { CmsDataTableToolbar } from "./data-table/CmsDataTableToolbar";
import type { CmsDataTableProps } from "./data-table/types";
import { useCmsDataTableState } from "./data-table/useCmsDataTableState";

export type {
  CmsDataTableAction,
  CmsDataTableBehavior,
  CmsDataTableColumn,
  CmsDataTableProps,
  CmsDataTableSearchOption,
} from "./data-table/types";

export function CmsDataTable<Row>({
  rows,
  columns,
  getRowClassName,
  getRowKey,
  title,
  actionColumnLabel = "Action",
  actions = [],
  addBehavior = "modal",
  addLabel,
  autoFitColumnTitle,
  className,
  collapseColumnTitle,
  description,
  emptyLabel,
  eyebrow,
  firstPageLabel = "First page",
  lastPageLabel = "Last page",
  nextPageLabel = "Next page",
  notice,
  onAdd,
  onRowDoubleClick,
  pageInputLabel = "Page number",
  pageLabel = "Page",
  pageSize = 14,
  previousPageLabel = "Previous page",
  resizeColumnLabel,
  rowOpenBehavior = "modal",
  searchLabel = "Search table",
  searchOptions = [],
  searchPlaceholder = "Search...",
  searchSelectLabel = "Search by",
  toolbarExtra,
  toolbarSingleLine = false,
  noSearchResultsLabel,
  showingLabel,
}: CmsDataTableProps<Row>) {
  const table = useCmsDataTableState({
    actionColumnLabel,
    actions,
    columns,
    pageSize,
    rows,
    searchOptions,
  });

  function openRowFromKeyboard(event: KeyboardEvent<HTMLElement>, row: Row) {
    if (!onRowDoubleClick || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    onRowDoubleClick(row);
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[14px] border border-[#EACC84]/40 bg-white shadow-[0_18px_48px_rgba(18,60,54,0.1)]",
        className,
      )}
    >
      <CmsDataTableToolbar
        addBehavior={addBehavior}
        addLabel={addLabel}
        onAdd={onAdd}
        onSearchOptionChange={table.updateSearchOption}
        onSearchQueryChange={table.updateSearchQuery}
        searchLabel={searchLabel}
        searchOptions={searchOptions}
        searchPlaceholder={searchPlaceholder}
        searchQuery={table.searchQuery}
        searchSelectLabel={searchSelectLabel}
        selectedSearchOption={table.selectedSearchOption}
        tableDomId={table.tableDomId}
        toolbarExtra={toolbarExtra}
        toolbarSingleLine={toolbarSingleLine}
      />

      {notice ? (
        <div className="grid gap-2 border-b border-slate-200 bg-white px-4 py-3">
          {notice}
        </div>
      ) : null}

      <div>
        <CmsDataTableDesktop
          actions={actions}
          autoFitColumnTitle={autoFitColumnTitle}
          collapseColumnTitle={collapseColumnTitle}
          emptyLabel={emptyLabel}
          expandedColumns={table.expandedColumns}
          getRowClassName={getRowClassName}
          getRowKey={getRowKey}
          gridTemplateColumns={table.gridTemplateColumns}
          noSearchResultsLabel={noSearchResultsLabel}
          onRowDoubleClick={onRowDoubleClick}
          pagedRows={table.pagedRows}
          resizeColumnLabel={resizeColumnLabel}
          rowOpenBehavior={rowOpenBehavior}
          searchQuery={table.searchQuery}
          sortState={table.sortState}
          startColumnResize={table.startColumnResize}
          tableColumns={table.tableColumns}
          tableViewportRef={table.tableViewportRef}
          toggleAutoFitColumn={table.toggleAutoFitColumn}
          toggleColumnSort={table.toggleColumnSort}
          totalTableWidth={table.totalTableWidth}
        />
        <CmsDataTableMobileCards
          actions={actions}
          emptyLabel={emptyLabel}
          getMobileCellValue={table.getMobileCellValue}
          getRowClassName={getRowClassName}
          getRowKey={getRowKey}
          mobileColumns={table.mobileColumns}
          noSearchResultsLabel={noSearchResultsLabel}
          onRowDoubleClick={onRowDoubleClick}
          openRowFromKeyboard={openRowFromKeyboard}
          pagedRows={table.pagedRows}
          rowOpenBehavior={rowOpenBehavior}
          searchQuery={table.searchQuery}
          title={title}
        />
        <CmsDataTableFooter
          description={description}
          eyebrow={eyebrow}
          filteredTotal={table.filteredRows.length}
          firstPageLabel={firstPageLabel}
          firstRow={table.firstRow}
          goToPage={table.goToPage}
          lastPageLabel={lastPageLabel}
          lastRow={table.lastRow}
          nextPageLabel={nextPageLabel}
          pageCount={table.pageCount}
          pageInput={table.pageInput}
          pageInputLabel={pageInputLabel}
          pageLabel={pageLabel}
          previousPageLabel={previousPageLabel}
          safePage={table.safePage}
          setPageInput={table.setPageInput}
          showingLabel={showingLabel}
          title={title}
        />
      </div>
    </section>
  );
}
