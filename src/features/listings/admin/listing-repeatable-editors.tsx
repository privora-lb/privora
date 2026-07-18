"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  CmsDataTable,
  type CmsDataTableAction,
  type CmsDataTableColumn,
} from "@/components/cms/CmsDataTable";
import {
  cmsTableInputClassName,
  cmsTableTextareaClassName,
} from "@/components/cms/cms-table-controls";
import type { ListingInclusion, ListingRule } from "@/features/listings/types";

type InclusionRow = {
  details: string;
  id: string;
  label: string;
};

type RuleRow = {
  id: string;
  text: string;
};

const mobileInputClassName =
  "h-10 w-full rounded-lg border border-[#EACC84]/45 bg-white px-3 text-center text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#C0964E] focus:ring-2 focus:ring-[#EACC84]/25";
const mobileTextareaClassName =
  "min-h-20 w-full resize-y rounded-lg border border-[#EACC84]/45 bg-white px-3 py-2.5 text-left text-xs font-bold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#C0964E] focus:ring-2 focus:ring-[#EACC84]/25";

let newRowSequence = 0;

export function ListingInclusionsEditor({ error, initialItems }: { error?: string; initialItems: ListingInclusion[] }) {
  const [items, setItems] = useState<InclusionRow[]>(
    initialItems.map(({ details, id, label }) => ({ details, id, label })),
  );
  const updateItem = useCallback((id: string, patch: Partial<InclusionRow>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);
  const columns = useMemo<CmsDataTableColumn<InclusionRow>[]>(
    () => [
      {
        key: "label",
        label: "Included item",
        baseWidth: 260,
        minWidth: 180,
        maxWidth: 420,
        grow: 0.5,
        textValue: (row) => row.label,
        render: (row) => (
          <input
            className={cmsTableInputClassName}
            onChange={(event) => updateItem(row.id, { label: event.target.value })}
            placeholder="Kitchen, speaker, parking..."
            value={row.label}
          />
        ),
        mobileRender: (row) => (
          <input
            className={mobileInputClassName}
            onChange={(event) => updateItem(row.id, { label: event.target.value })}
            placeholder="Included item"
            value={row.label}
          />
        ),
      },
      {
        key: "details",
        label: "Details",
        baseWidth: 520,
        minWidth: 260,
        maxWidth: 820,
        grow: 1,
        textValue: (row) => row.details,
        render: (row) => (
          <input
            className={cmsTableInputClassName}
            onChange={(event) => updateItem(row.id, { details: event.target.value })}
            placeholder="Describe what is provided"
            value={row.details}
          />
        ),
        mobileRender: (row) => (
          <textarea
            className={mobileTextareaClassName}
            onChange={(event) => updateItem(row.id, { details: event.target.value })}
            placeholder="Describe what is provided"
            value={row.details}
          />
        ),
      },
    ],
    [updateItem],
  );
  const actions = useMemo<CmsDataTableAction<InclusionRow>[]>(
    () => [
      {
        className: "text-rose-700 hover:border-rose-200 hover:bg-rose-50",
        Icon: Trash2,
        label: "Delete included item",
        onClick: (row) =>
          setItems((current) => current.filter((item) => item.id !== row.id)),
      },
    ],
    [],
  );

  return (
    <TableEditorShell
      addLabel="Add included item"
      actions={actions}
      columns={columns}
      description="Amenities and services shown on the public listing."
      error={error}
      emptyLabel="No included items have been added yet."
      hiddenName="inclusionsJson"
      onAdd={() => setItems((current) => [...current, { details: "", id: createRowId("included"), label: "" }])}
      rows={items}
      serialize={(rows) => rows.map(({ details, label }) => ({ details, label }))}
      title="Included items"
    />
  );
}

export function ListingRulesEditor({ error, initialRules }: { error?: string; initialRules: ListingRule[] }) {
  const [rules, setRules] = useState<RuleRow[]>(
    initialRules.map(({ id, text }) => ({ id, text })),
  );
  const updateRule = useCallback((id: string, text: string) => {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, text } : rule)),
    );
  }, []);
  const columns = useMemo<CmsDataTableColumn<RuleRow>[]>(
    () => [
      {
        key: "text",
        label: "Public rule",
        baseWidth: 760,
        minWidth: 360,
        maxWidth: 1100,
        grow: 1,
        textValue: (row) => row.text,
        render: (row) => (
          <textarea
            className={cmsTableTextareaClassName}
            onChange={(event) => updateRule(row.id, event.target.value)}
            placeholder="Rule or regulation guests should review"
            value={row.text}
          />
        ),
        mobileRender: (row) => (
          <textarea
            className={mobileTextareaClassName}
            onChange={(event) => updateRule(row.id, event.target.value)}
            placeholder="Rule or regulation"
            value={row.text}
          />
        ),
      },
    ],
    [updateRule],
  );
  const actions = useMemo<CmsDataTableAction<RuleRow>[]>(
    () => [
      {
        className: "text-rose-700 hover:border-rose-200 hover:bg-rose-50",
        Icon: Trash2,
        label: "Delete rule",
        onClick: (row) =>
          setRules((current) => current.filter((rule) => rule.id !== row.id)),
      },
    ],
    [],
  );

  return (
    <TableEditorShell
      addLabel="Add rule"
      actions={actions}
      columns={columns}
      description="Rules guests must review before booking."
      error={error}
      emptyLabel="No rules or regulations have been added yet."
      hiddenName="rulesJson"
      onAdd={() => setRules((current) => [...current, { id: createRowId("rule"), text: "" }])}
      rows={rules}
      serialize={(rows) => rows.map(({ text }) => ({ text }))}
      title="Public rules"
    />
  );
}

function TableEditorShell<Row>({
  actions,
  addLabel,
  columns,
  description,
  emptyLabel,
  error,
  hiddenName,
  onAdd,
  rows,
  serialize,
  title,
}: {
  actions: CmsDataTableAction<Row>[];
  addLabel: string;
  columns: CmsDataTableColumn<Row>[];
  description: string;
  emptyLabel: string;
  error?: string;
  hiddenName: string;
  onAdd: () => void;
  rows: Row[];
  serialize: (rows: Row[]) => unknown[];
  title: string;
}) {
  return (
    <div className="grid gap-2">
      <input name={hiddenName} type="hidden" value={JSON.stringify(serialize(rows))} />
      <CmsDataTable
        actionColumnLabel=""
        actions={actions}
        addLabel={addLabel}
        className={error ? "border-rose-300 ring-2 ring-rose-100" : undefined}
        columns={columns}
        description={description}
        emptyLabel={emptyLabel}
        getRowKey={(row) => String((row as { id: string }).id)}
        onAdd={onAdd}
        pageSize={30}
        rows={rows}
        title={title}
        toolbarSingleLine
      />
      {error ? <p className="m-0 text-xs font-bold text-rose-700">{error}</p> : null}
    </div>
  );
}

function createRowId(prefix: string) {
  newRowSequence += 1;
  return `${prefix}-new-${newRowSequence}`;
}
