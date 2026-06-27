import { useMemo } from "react";

import type {
  CmsDataTableAction,
  CmsDataTableColumn,
  CmsDataTableSearchOption,
  ColumnWidths,
  SortState,
} from "./types";
import {
  clamp,
  compareSortValues,
  getColumnSortType,
  getColumnSortValue,
  isEmptySortValue,
} from "./utils";

export function useTableColumns<Row>(
  columns: CmsDataTableColumn<Row>[],
  actions: CmsDataTableAction<Row>[],
  actionColumnLabel: string,
) {
  return useMemo(() => {
    if (!actions.length) {
      return columns;
    }

    return [
      ...columns,
      {
        key: "__actions",
        label: actionColumnLabel,
        baseWidth: Math.max(58, actions.length * 38 + 20),
        minWidth: Math.max(54, actions.length * 34 + 16),
        maxWidth: Math.max(78, actions.length * 42 + 24),
        grow: 0,
        align: "center" as const,
        textValue: () => "",
      },
    ];
  }, [actionColumnLabel, actions.length, columns]);
}

export function useFilteredRows<Row>(
  rows: Row[],
  columns: CmsDataTableColumn<Row>[],
  searchOptions: CmsDataTableSearchOption<Row>[],
  searchQuery: string,
  selectedSearchOption: string,
) {
  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query || !searchOptions.length) {
      return rows;
    }

    const activeSearchOption =
      searchOptions.find((option) => option.value === selectedSearchOption) ??
      searchOptions[0];

    return rows.filter((row) => {
      if (activeSearchOption.value === "__all") {
        const columnValues = columns.map(
          (column) => column.textValue?.(row) ?? "",
        );
        const optionValues = searchOptions
          .filter((option) => option.value !== "__all")
          .map(
            (option) =>
              option.getValue?.(row) ??
              columns.find((column) => column.key === option.value)?.textValue?.(
                row,
              ) ??
              "",
          );

        return [...columnValues, ...optionValues].some((value) =>
          value.toLowerCase().includes(query),
        );
      }

      const searchValue =
        activeSearchOption.getValue?.(row) ??
        columns.find((column) => column.key === activeSearchOption.value)
          ?.textValue?.(row) ??
        "";
      return searchValue.toLowerCase().includes(query);
    });
  }, [columns, rows, searchOptions, searchQuery, selectedSearchOption]);
}

export function useSortedRows<Row>(
  filteredRows: Row[],
  tableColumns: CmsDataTableColumn<Row>[],
  sortState: SortState | null,
) {
  return useMemo(() => {
    if (!sortState) {
      return filteredRows;
    }

    const activeColumn = tableColumns.find(
      (column) => column.key === sortState.key,
    );

    if (!activeColumn?.sortable) {
      return filteredRows;
    }

    const sortType = getColumnSortType(activeColumn, filteredRows);
    const directionMultiplier = sortState.direction === "asc" ? 1 : -1;

    return filteredRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const leftValue = getColumnSortValue(activeColumn, left.row);
        const rightValue = getColumnSortValue(activeColumn, right.row);

        if (isEmptySortValue(leftValue) && isEmptySortValue(rightValue)) {
          return left.index - right.index;
        }

        if (isEmptySortValue(leftValue)) {
          return 1;
        }

        if (isEmptySortValue(rightValue)) {
          return -1;
        }

        const comparison = compareSortValues(leftValue, rightValue, sortType);
        return comparison === 0
          ? left.index - right.index
          : comparison * directionMultiplier;
      })
      .map(({ row }) => row);
  }, [filteredRows, sortState, tableColumns]);
}

export function resizeAdjacentColumns<Row>(
  current: ColumnWidths,
  leftColumn: CmsDataTableColumn<Row>,
  rightColumn: CmsDataTableColumn<Row>,
  startLeftWidth: number,
  startRightWidth: number,
  delta: number,
) {
  if (delta >= 0) {
    const leftWidth = clamp(
      startLeftWidth + delta,
      leftColumn.minWidth,
      leftColumn.maxWidth,
    );
    const actualDelta = leftWidth - startLeftWidth;
    const rightShrink = Math.min(
      actualDelta,
      startRightWidth - rightColumn.minWidth,
    );
    return {
      ...current,
      [leftColumn.key]: leftWidth,
      [rightColumn.key]: startRightWidth - rightShrink,
    };
  }

  const distance = Math.abs(delta);
  const rightWidth = clamp(
    startRightWidth + distance,
    rightColumn.minWidth,
    rightColumn.maxWidth,
  );
  const actualDelta = rightWidth - startRightWidth;
  const leftShrink = Math.min(
    actualDelta,
    startLeftWidth - leftColumn.minWidth,
  );
  return {
    ...current,
    [leftColumn.key]: startLeftWidth - leftShrink,
    [rightColumn.key]: rightWidth,
  };
}
