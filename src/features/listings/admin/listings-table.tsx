"use client";

import {
  Eye,
  Globe2,
  Loader2,
  PencilLine,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  deleteListingInlineAction,
  toggleListingPublishedInlineAction,
} from "@/app/(app)/listings/actions";
import { CmsDataTable } from "@/components/cms/CmsDataTable";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { CmsDataTableIconButton } from "@/components/cms/data-table/CmsDataTableIconButton";
import { DeleteConfirmationModal } from "@/components/cms/delete-confirmation-modal";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import { ListingImage } from "@/features/listings/listing-image";
import type { PublicListing } from "@/features/listings/types";
import {
  formatListingPriceRange,
  getListingStartingPrice,
} from "@/features/listings/utils";

export function ListingsTable({ listings }: { listings: PublicListing[] }) {
  const router = useRouter();
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [rows, setRows] = useState(listings);
  const [deleteTarget, setDeleteTarget] = useState<PublicListing | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Private pool",
        baseWidth: 290,
        minWidth: 230,
        maxWidth: 420,
        grow: 1,
        sortable: true,
        textValue: (row: PublicListing) => row.name,
        render: (row: PublicListing) => (
          <div className="flex min-w-0 items-center gap-3 py-1.5">
            <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {row.images[0] ? (
                <ListingImage
                  alt={row.images[0].altText || row.name}
                  sizes="56px"
                  src={row.images[0].imageUrl}
                />
              ) : null}
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-[13px] text-slate-950">
                {row.name}
              </strong>
              <span className="block truncate text-[10px] font-bold text-slate-400">
                /listing/{row.slug}
              </span>
            </span>
          </div>
        ),
      },
      {
        key: "locationName",
        label: "Location",
        baseWidth: 190,
        minWidth: 150,
        maxWidth: 300,
        sortable: true,
        textValue: (row: PublicListing) => row.locationName,
      },
      {
        key: "priceRange",
        label: "Rates",
        align: "end" as const,
        baseWidth: 160,
        minWidth: 135,
        maxWidth: 210,
        sortable: true,
        sortType: "number" as const,
        sortValue: (row: PublicListing) => getListingStartingPrice(row),
        textValue: (row: PublicListing) =>
          formatListingPriceRange(row),
      },
      {
        key: "capacity",
        label: "Capacity",
        align: "center" as const,
        baseWidth: 150,
        minWidth: 125,
        maxWidth: 190,
        textValue: (row: PublicListing) =>
          `${row.poolCapacity} pool / ${row.stayCapacity} stay`,
        render: (row: PublicListing) => (
          <span className="whitespace-nowrap text-[11px]">
            {row.poolCapacity} pool / {row.stayCapacity} stay
          </span>
        ),
      },
      {
        key: "calendarVenueName",
        label: "Calendar",
        baseWidth: 220,
        minWidth: 170,
        maxWidth: 330,
        sortable: true,
        textValue: (row: PublicListing) => row.calendarVenueName ?? "Not linked",
        render: (row: PublicListing) => (
          <span className="truncate">
            {row.calendarVenueEligible
              ? row.calendarVenueName
              : row.calendarVenueId
                ? "Link unavailable"
                : "Not linked"}
          </span>
        ),
      },
      {
        key: "isPublished",
        label: "Visibility",
        align: "center" as const,
        baseWidth: 110,
        minWidth: 96,
        maxWidth: 140,
        sortable: true,
        sortType: "number" as const,
        sortValue: (row: PublicListing) => (row.isPublished ? 1 : 0),
        textValue: (row: PublicListing) =>
          row.isPublished ? "Published" : "Draft",
        render: (row: PublicListing) => (
          <span
            className={`inline-flex min-w-[74px] justify-center rounded-full border px-2 py-1 text-[10px] font-black ${
              row.isPublished
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            {row.isPublished ? "Published" : "Draft"}
          </span>
        ),
      },
    ],
    [],
  );

  async function togglePublished(row: PublicListing) {
    if (pendingPublishId) return;
    const nextPublished = !row.isPublished;
    const formData = new FormData();
    formData.set("id", row.id);
    formData.set("isPublished", String(nextPublished));
    setPendingPublishId(row.id);

    try {
      const result = await toggleListingPublishedInlineAction(formData);
      if (!result.ok) {
        pushToast("error", result.message);
        return;
      }
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isPublished: nextPublished } : item,
        ),
      );
      pushToast("success", result.message);
    } finally {
      setPendingPublishId(null);
    }
  }

  async function deleteListing(row: PublicListing) {
    if (pendingDeleteId) return;
    const formData = new FormData();
    formData.set("id", row.id);
    setPendingDeleteId(row.id);

    try {
      const result = await deleteListingInlineAction(formData);
      if (!result.ok) {
        pushToast("error", result.message);
        return;
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setDeleteTarget(null);
      pushToast("success", result.message);
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <>
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      {deleteTarget ? (
        <DeleteConfirmationModal
          isConfirming={pendingDeleteId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteListing(deleteTarget)}
          title="Delete public listing?"
        >
          This permanently removes {deleteTarget.name}, its images, included
          items, and rules. The linked operational venue and its calendar are
          not changed.
        </DeleteConfirmationModal>
      ) : null}
      <CmsDataTable
        actions={[
          {
            label: "View public page",
            isVisible: (row) => row.isPublished,
            render: (row) => (
              <CmsDataTableIconButton
                label="View public page"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(`/listing/${row.slug}`, "_blank", "noopener,noreferrer");
                }}
              >
                <Eye size={15} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
          {
            Icon: PencilLine,
            label: "Edit listing",
            onClick: (row) => router.push(`/listings/${row.id}`),
          },
          {
            label: "Change visibility",
            render: (row) => (
              <CmsDataTableIconButton
                disabled={Boolean(pendingPublishId)}
                label={row.isPublished ? "Move to draft" : "Publish listing"}
                onClick={(event) => {
                  event.stopPropagation();
                  void togglePublished(row);
                }}
              >
                {pendingPublishId === row.id ? (
                  <Loader2 className="animate-spin" size={15} aria-hidden="true" />
                ) : (
                  <Globe2 size={15} aria-hidden="true" />
                )}
              </CmsDataTableIconButton>
            ),
          },
          {
            label: "Delete listing",
            render: (row) => (
              <CmsDataTableIconButton
                className="text-rose-700 hover:border-rose-200 hover:bg-rose-50"
                label="Delete listing"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(row);
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </CmsDataTableIconButton>
            ),
          },
        ]}
        addBehavior="page"
        addLabel="Add listing"
        columns={columns}
        description="Create and publish the private pools shown on the public directory."
        emptyLabel="No public listings have been created yet."
        getRowKey={(row) => row.id}
        noSearchResultsLabel="No listings match your search."
        onAdd={() => router.push("/listings/new")}
        onRowDoubleClick={(row) => router.push(`/listings/${row.id}`)}
        pageSize={14}
        rowOpenBehavior="page"
        rows={rows}
        searchOptions={[
          { value: "__all", label: "All" },
          { value: "name", label: "Name" },
          { value: "locationName", label: "Location" },
          { value: "calendarVenueName", label: "Calendar" },
        ]}
        searchPlaceholder="Search listings..."
        title="Public listings"
      />
    </>
  );
}
