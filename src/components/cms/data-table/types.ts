import type { LucideIcon } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

export type CmsDataTableColumn<Row> = {
  key: string;
  label: string;
  baseWidth: number;
  minWidth: number;
  maxWidth: number;
  grow?: number;
  align?: "start" | "center" | "end";
  className?: string;
  headerClassName?: string;
  mobileRender?: (row: Row) => ReactNode;
  render?: (row: Row) => ReactNode;
  textValue?: (row: Row) => string;
  sortable?: boolean;
  sortType?: "date" | "number" | "text";
  sortValue?: (row: Row) => Date | number | string | null | undefined;
  defaultSortDirection?: "asc" | "desc";
};

export type CmsDataTableAction<Row> = {
  label: string;
  Icon?: LucideIcon;
  onClick?: (row: Row, event: MouseEvent<HTMLButtonElement>) => void;
  render?: (row: Row) => ReactNode;
  className?: string;
  isVisible?: (row: Row) => boolean;
};

export type CmsDataTableBehavior = "modal" | "page";

export type CmsDataTableSearchOption<Row> = {
  value: string;
  label: string;
  getValue?: (row: Row) => string;
};

export type CmsDataTableProps<Row> = {
  rows: Row[];
  columns: CmsDataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  getRowClassName?: (row: Row) => string | undefined;
  title: string;
  actionColumnLabel?: string;
  actions?: CmsDataTableAction<Row>[];
  addBehavior?: CmsDataTableBehavior;
  addLabel?: string;
  autoFitColumnTitle?: (column: string) => string;
  className?: string;
  collapseColumnTitle?: (column: string) => string;
  description?: string;
  emptyLabel: ReactNode;
  eyebrow?: string;
  firstPageLabel?: string;
  lastPageLabel?: string;
  nextPageLabel?: string;
  notice?: ReactNode;
  onAdd?: () => void;
  onRowDoubleClick?: (row: Row) => void;
  pageInputLabel?: string;
  pageLabel?: string;
  pageSize?: number;
  previousPageLabel?: string;
  resizeColumnLabel?: (column: string) => string;
  rowOpenBehavior?: CmsDataTableBehavior;
  searchLabel?: string;
  searchOptions?: CmsDataTableSearchOption<Row>[];
  searchPlaceholder?: string;
  searchSelectLabel?: string;
  toolbarExtra?: ReactNode;
  toolbarSingleLine?: boolean;
  noSearchResultsLabel?: ReactNode;
  showingLabel?: (first: number, last: number, total: number) => ReactNode;
};

export type ColumnWidths = Record<string, number>;
export type SortDirection = "asc" | "desc";

export type SortState = {
  key: string;
  direction: SortDirection;
};
