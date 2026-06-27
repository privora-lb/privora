import type { CmsDataTableColumn, ColumnWidths } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function buildInitialColumnWidths<Row>(
  columns: CmsDataTableColumn<Row>[],
) {
  return columns.reduce((widths, column) => {
    widths[column.key] = column.baseWidth;
    return widths;
  }, {} as ColumnWidths);
}

export function fitColumnWidthsToViewport<Row>(
  columns: CmsDataTableColumn<Row>[],
  initialColumnWidths: ColumnWidths,
  viewportWidth: number,
) {
  const baseTotal = columns.reduce(
    (total, column) => total + initialColumnWidths[column.key],
    0,
  );
  const next = { ...initialColumnWidths };

  if (viewportWidth <= baseTotal) {
    return next;
  }

  const extra = viewportWidth - baseTotal;
  const growColumns = columns.filter((column) => (column.grow ?? 0) > 0);
  const totalGrow = growColumns.reduce(
    (total, column) => total + (column.grow ?? 0),
    0,
  );

  if (totalGrow <= 0) {
    return next;
  }

  growColumns.forEach((column) => {
    next[column.key] += (extra * (column.grow ?? 0)) / totalGrow;
  });

  return next;
}

export function getAutoColumnWidth<Row>(
  rows: Row[],
  column: CmsDataTableColumn<Row>,
  actionLabels: string[],
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return column.baseWidth;
  }

  context.font = "800 13px Arial";

  const values =
    column.key === "__actions"
      ? [column.label, ...actionLabels]
      : [column.label, ...rows.map((row) => column.textValue?.(row) ?? "")];
  const widest = values.reduce(
    (max, value) => Math.max(max, context.measureText(value).width),
    0,
  );
  const padding = column.key === "__actions" ? 44 : 58;

  return clamp(Math.ceil(widest + padding), column.minWidth, column.maxWidth);
}

export function getCellAlignment(
  align?: CmsDataTableColumn<unknown>["align"],
) {
  if (align === "center") {
    return "justify-center text-center";
  }

  if (align === "end") {
    return "justify-end text-right rtl:text-left";
  }

  return "";
}

export function getColumnSortType<Row>(
  column: CmsDataTableColumn<Row>,
  rows: Row[],
) {
  if (column.sortType) {
    return column.sortType;
  }

  const sampleValue = rows
    .map((row) => column.sortValue?.(row) ?? column.textValue?.(row))
    .find(
      (value) =>
        value !== null && value !== undefined && String(value).length > 0,
    );

  if (typeof sampleValue === "number") {
    return "number";
  }

  if (sampleValue instanceof Date) {
    return "date";
  }

  return "text";
}

export function getColumnSortValue<Row>(
  column: CmsDataTableColumn<Row>,
  row: Row,
) {
  return column.sortValue?.(row) ?? column.textValue?.(row) ?? "";
}

export function isEmptySortValue(
  value: Date | number | string | null | undefined,
) {
  return value === null || value === undefined || String(value).trim() === "";
}

export function compareSortValues(
  leftValue: Date | number | string | null | undefined,
  rightValue: Date | number | string | null | undefined,
  sortType: "date" | "number" | "text",
) {
  if (sortType === "number") {
    const leftNumber =
      typeof leftValue === "number" ? leftValue : Number(leftValue);
    const rightNumber =
      typeof rightValue === "number" ? rightValue : Number(rightValue);

    if (Number.isNaN(leftNumber) && Number.isNaN(rightNumber)) {
      return 0;
    }

    if (Number.isNaN(leftNumber)) {
      return 1;
    }

    if (Number.isNaN(rightNumber)) {
      return -1;
    }

    return leftNumber - rightNumber;
  }

  if (sortType === "date") {
    const leftTime =
      leftValue instanceof Date
        ? leftValue.getTime()
        : new Date(leftValue ?? "").getTime();
    const rightTime =
      rightValue instanceof Date
        ? rightValue.getTime()
        : new Date(rightValue ?? "").getTime();

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return 0;
    }

    if (Number.isNaN(leftTime)) {
      return 1;
    }

    if (Number.isNaN(rightTime)) {
      return -1;
    }

    return leftTime - rightTime;
  }

  return String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
