import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  resizeAdjacentColumns,
  useFilteredRows,
  useSortedRows,
  useTableColumns,
} from "./hooks";
import type {
  CmsDataTableAction,
  CmsDataTableColumn,
  CmsDataTableSearchOption,
  ColumnWidths,
  SortState,
} from "./types";
import {
  buildInitialColumnWidths,
  clamp,
  fitColumnWidthsToViewport,
  getAutoColumnWidth,
} from "./utils";

type UseCmsDataTableStateProps<Row> = {
  actionColumnLabel: string;
  actions: CmsDataTableAction<Row>[];
  columns: CmsDataTableColumn<Row>[];
  pageSize: number;
  rows: Row[];
  searchOptions: CmsDataTableSearchOption<Row>[];
};

export function useCmsDataTableState<Row>({
  actionColumnLabel,
  actions,
  columns,
  pageSize,
  rows,
  searchOptions,
}: UseCmsDataTableStateProps<Row>) {
  const tableColumns = useTableColumns(columns, actions, actionColumnLabel);
  const mobileColumns = useMemo(
    () => tableColumns.filter((column) => column.key !== "__actions"),
    [tableColumns],
  );
  const initialColumnWidths = useMemo(
    () => buildInitialColumnWidths(tableColumns),
    [tableColumns],
  );
  const [columnWidths, setColumnWidths] =
    useState<ColumnWidths>(initialColumnWidths);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    () => new Set(),
  );
  const [hasUserSizedColumns, setHasUserSizedColumns] = useState(false);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchOption, setSelectedSearchOption] = useState(
    searchOptions[0]?.value ?? "__all",
  );
  const [sortState, setSortState] = useState<SortState | null>(null);
  const tableDomId = useId();
  const tableViewportRef = useRef<HTMLDivElement>(null);

  const filteredRows = useFilteredRows(
    rows,
    columns,
    searchOptions,
    searchQuery,
    selectedSearchOption,
  );
  const sortedRows = useSortedRows(filteredRows, tableColumns, sortState);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedRows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, sortedRows],
  );
  const gridTemplateColumns = tableColumns
    .map((column) => `${columnWidths[column.key] ?? column.baseWidth}px`)
    .join(" ");
  const totalTableWidth = tableColumns.reduce(
    (total, column) => total + (columnWidths[column.key] ?? column.baseWidth),
    0,
  );
  const firstRow = sortedRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(safePage * pageSize, sortedRows.length);

  useLayoutEffect(() => {
    const node = tableViewportRef.current;

    if (!node) {
      return;
    }

    const updateWidth = () => {
      if (!hasUserSizedColumns) {
        setColumnWidths(
          fitColumnWidthsToViewport(
            tableColumns,
            initialColumnWidths,
            node.clientWidth,
          ),
        );
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [hasUserSizedColumns, initialColumnWidths, tableColumns]);

  function resetToFirstPage() {
    setPage(1);
    setPageInput("1");
  }

  return {
    columnWidths,
    expandedColumns,
    filteredRows,
    firstRow,
    getMobileCellValue,
    goToPage: (nextPage: number) => {
      const safeNextPage = clamp(
        Number.isFinite(nextPage) ? nextPage : safePage,
        1,
        pageCount,
      );
      setPage(safeNextPage);
      setPageInput(String(safeNextPage));
    },
    gridTemplateColumns,
    lastRow,
    mobileColumns,
    pageCount,
    pageInput,
    pagedRows,
    safePage,
    searchQuery,
    selectedSearchOption,
    setPageInput,
    sortState,
    startColumnResize,
    tableColumns,
    tableDomId,
    tableViewportRef,
    toggleAutoFitColumn,
    toggleColumnSort,
    totalTableWidth,
    updateSearchOption: (value: string) => {
      setSelectedSearchOption(value);
      resetToFirstPage();
    },
    updateSearchQuery: (value: string) => {
      setSearchQuery(value);
      resetToFirstPage();
    },
  };

  function toggleColumnSort(column: CmsDataTableColumn<Row>) {
    if (!column.sortable) {
      return;
    }

    setSortState((current) => {
      if (current?.key === column.key) {
        return {
          key: column.key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      const direction =
        column.defaultSortDirection ??
        (column.sortType === "number" || column.sortType === "date"
          ? "desc"
          : "asc");
      return { key: column.key, direction };
    });
    resetToFirstPage();
  }

  function applyColumnWidth(key: string, width: number) {
    const targetColumn = tableColumns.find((column) => column.key === key);

    if (!targetColumn) {
      return;
    }

    setColumnWidths((current) => {
      const currentWidth = current[key] ?? targetColumn.baseWidth;
      const targetWidth = clamp(
        width,
        targetColumn.minWidth,
        targetColumn.maxWidth,
      );
      return Math.abs(targetWidth - currentWidth) < 1
        ? current
        : { ...current, [key]: targetWidth };
    });
    setHasUserSizedColumns(true);
  }

  function toggleAutoFitColumn(column: CmsDataTableColumn<Row>) {
    const isExpanded = expandedColumns.has(column.key);
    const actionLabels = actions.map((action) => action.label);

    applyColumnWidth(
      column.key,
      isExpanded
        ? column.baseWidth
        : getAutoColumnWidth(rows, column, actionLabels),
    );
    setExpandedColumns((current) => {
      const next = new Set(current);
      if (isExpanded) {
        next.delete(column.key);
      } else {
        next.add(column.key);
      }
      return next;
    });
  }

  function startColumnResize(
    event: ReactPointerEvent<HTMLSpanElement>,
    columnIndex: number,
  ) {
    const leftColumn = tableColumns[columnIndex];
    const rightColumn = tableColumns[columnIndex + 1];

    if (!leftColumn || !rightColumn) {
      return;
    }

    event.preventDefault();
    setHasUserSizedColumns(true);

    const startX = event.clientX;
    const startLeftWidth = columnWidths[leftColumn.key] ?? leftColumn.baseWidth;
    const startRightWidth =
      columnWidths[rightColumn.key] ?? rightColumn.baseWidth;
    const minDelta = -(rightColumn.maxWidth - startRightWidth);
    const maxDelta = leftColumn.maxWidth - startLeftWidth;

    function handlePointerMove(pointerEvent: PointerEvent) {
      const delta = clamp(pointerEvent.clientX - startX, minDelta, maxDelta);
      setColumnWidths((current) =>
        resizeAdjacentColumns(
          current,
          leftColumn,
          rightColumn,
          startLeftWidth,
          startRightWidth,
          delta,
        ),
      );
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setExpandedColumns((current) => {
        const next = new Set(current);
        next.delete(leftColumn.key);
        next.delete(rightColumn.key);
        return next;
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }
}

function getMobileCellValue<Row>(
  column: CmsDataTableColumn<Row>,
  row: Row,
) {
  const textValue = column.textValue?.(row);
  return textValue !== null &&
    textValue !== undefined &&
    String(textValue).trim().length > 0
    ? String(textValue)
    : "";
}
