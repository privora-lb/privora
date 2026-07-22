"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ContactRound,
  Eye,
  ImageIcon,
  LayoutList,
  Loader2,
  MapPin,
  Save,
  ScrollText,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { saveListingAction } from "@/app/(app)/listings/actions";
import { CmsToastStack } from "@/components/cms/CmsToastStack";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import type {
  CalendarVenueOption,
  ListingFormState,
  PublicListing,
} from "@/features/listings/types";
import { CalendarVenueSelect } from "./calendar-venue-select";
import { removeUploadedListingImages } from "./listing-image-api";
import {
  ListingFormSection,
  ListingTextareaField,
  ListingTextField,
  ListingToggle,
} from "./listing-form-controls";
import { ListingImageManager } from "./listing-image-manager";
import { ListingPricingFields } from "./listing-pricing-fields";
import {
  ListingInclusionsEditor,
  ListingRulesEditor,
} from "./listing-repeatable-editors";

const initialState: ListingFormState = {};

export function ListingForm({
  calendarVenues,
  listing,
}: {
  calendarVenues: CalendarVenueOption[];
  listing?: PublicListing;
}) {
  const router = useRouter();
  const { dismissToast, pushToast, toasts } = useCmsToasts();
  const [state, formAction, isPending] = useActionState(
    saveListingAction,
    initialState,
  );
  const handledState = useRef<ListingFormState | null>(null);
  const temporaryStorageAssetIds = useRef<string[]>([]);
  const formSubmissionPending = useRef(false);
  const imageManagerBusy = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isManagingImages, setIsManagingImages] = useState(false);
  const errors = state.fieldErrors ?? {};
  const handleTemporaryAssetsChange = useCallback((storageAssetIds: string[]) => {
    temporaryStorageAssetIds.current = storageAssetIds;
  }, []);
  const handleImageManagerBusyChange = useCallback((isBusy: boolean) => {
    imageManagerBusy.current = isBusy;
    setIsManagingImages(isBusy);
  }, []);

  useEffect(() => {
    formSubmissionPending.current = isPending;
  }, [isPending]);

  useEffect(() => {
    if (!state.message || handledState.current === state) return;
    handledState.current = state;

    if (!state.ok) {
      pushToast("error", state.message);
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true']")
          ?.focus({ preventScroll: false });
      });
      return;
    }

    if (state.listingId) {
      temporaryStorageAssetIds.current = [];
      const params = new URLSearchParams({
        toast: "success",
        toastId: `${Date.now()}`,
        toastMessage: state.message,
      });
      router.replace(`/listings/${state.listingId}?${params}`, {
        scroll: false,
      });
      router.refresh();
    }
  }, [pushToast, router, state]);

  useEffect(() => {
    function requestTemporaryImageCleanup() {
      if (
        !temporaryStorageAssetIds.current.length ||
        formSubmissionPending.current ||
        imageManagerBusy.current
      ) {
        return;
      }

      void fetch("/api/listing-images", {
        body: JSON.stringify({
          storageAssetIds: temporaryStorageAssetIds.current,
        }),
        headers: { "content-type": "application/json" },
        keepalive: true,
        method: "DELETE",
      });
    }

    function handlePageHide(event: PageTransitionEvent) {
      if (!event.persisted) requestTemporaryImageCleanup();
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      requestTemporaryImageCleanup();
    };
  }, []);

  async function cancelEditing() {
    if (isPending || isCancelling || isManagingImages) return;
    setIsCancelling(true);

    try {
      await removeUploadedListingImages([...temporaryStorageAssetIds.current]);
      temporaryStorageAssetIds.current = [];
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error
          ? error.message
          : "Uploaded images could not be cleaned up.",
      );
    } finally {
      router.push("/listings");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1320px]">
      <CmsToastStack onDismiss={dismissToast} toasts={toasts} />
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Back to listings"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#d9d5c9] bg-white text-[#123C36] shadow-sm transition hover:bg-[#FCF7E8]"
            disabled={isPending || isCancelling || isManagingImages}
            onClick={() => void cancelEditing()}
            type="button"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-black uppercase text-[#967230]">
              Public directory
            </p>
            <h1 className="m-0 mt-0.5 truncate text-xl font-black text-[#123C36] sm:text-2xl">
              {listing ? listing.name : "New private pool listing"}
            </h1>
          </div>
        </div>
        {listing?.isPublished ? (
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9d5c9] bg-white px-4 text-xs font-black text-[#123C36] shadow-sm transition hover:bg-[#FCF7E8]"
            href={`/listing/${listing.slug}`}
            target="_blank"
          >
            <Eye size={15} aria-hidden="true" />
            View public page
          </Link>
        ) : null}
      </header>

      <form
        action={formAction}
        className="overflow-visible rounded-xl border border-[#EACC84]/40 bg-white shadow-[0_20px_58px_rgba(18,60,54,0.1)]"
        onSubmit={() => {
          formSubmissionPending.current = true;
        }}
      >
        <input name="id" type="hidden" value={listing?.id ?? ""} />

        <ListingFormSection
          description="Public identity, location, and main description."
          icon={MapPin}
          title="Listing information"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ListingTextField
              defaultValue={listing?.name}
              error={errors.name}
              label="Private pool name"
              name="name"
              placeholder="Cedar Horizon Pool"
              required
            />
            <ListingTextField
              defaultValue={listing?.slug}
              error={errors.slug}
              label="Public URL slug"
              name="slug"
              pattern="[a-z0-9-]+"
              placeholder="cedar-horizon-pool"
            />
            <ListingTextField
              defaultValue={listing?.locationName}
              error={errors.locationName}
              label="Location"
              name="locationName"
              placeholder="Faraya, Lebanon"
              required
            />
            <ListingTextField
              defaultValue={listing?.googleMapsUrl}
              error={errors.googleMapsUrl}
              label="Google Maps link"
              name="googleMapsUrl"
              placeholder="https://maps.google.com/..."
              required
              type="url"
            />
            <ListingTextareaField
              className="sm:min-h-32"
              defaultValue={listing?.description}
              error={errors.description}
              label="Description"
              name="description"
              placeholder="Describe the private pool and guest experience."
              required
              rows={5}
            />
          </div>
        </ListingFormSection>

        <ListingFormSection
          description="Choose weekend-rate days and set separate day and night prices."
          icon={CircleDollarSign}
          title="Pricing schedule"
        >
          <ListingPricingFields errors={errors} listing={listing} />
        </ListingFormSection>

        <ListingFormSection
          description="Guest limits, accommodation, Wi-Fi, and pool measurements."
          icon={Waves}
          title="Capacity and amenities"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField defaultValue={listing?.poolCapacity ?? 1} error={errors.poolCapacity} label="Pool capacity" name="poolCapacity" />
            <NumberField defaultValue={listing?.stayCapacity ?? 0} error={errors.stayCapacity} label="Stay capacity" name="stayCapacity" />
            <NumberField defaultValue={listing?.bedrooms ?? 0} error={errors.bedrooms} label="Bedrooms" name="bedrooms" />
            <NumberField defaultValue={listing?.toilets ?? 0} error={errors.toilets} label="Toilets" name="toilets" />
            <NumberField defaultValue={listing?.poolLengthM ?? 1} error={errors.poolLengthM} label="Pool length (m)" name="poolLengthM" step="0.1" />
            <NumberField defaultValue={listing?.poolWidthM ?? 1} error={errors.poolWidthM} label="Pool width (m)" name="poolWidthM" step="0.1" />
            <NumberField defaultValue={listing?.poolDepthM ?? 1} error={errors.poolDepthM} label="Pool depth (m)" name="poolDepthM" step="0.1" />
            <ListingToggle
              defaultChecked={listing?.hasWifi ?? true}
              description="Show Wi-Fi as available."
              label="Wi-Fi available"
              name="hasWifi"
            />
          </div>
        </ListingFormSection>

        <ListingFormSection
          description="Separate entry and departure times for day and night use."
          icon={Clock3}
          title="Use hours"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TimeField defaultValue={listing?.dayCheckIn ?? "09:00"} error={errors.dayCheckIn} label="Day check-in" name="dayCheckIn" />
            <TimeField defaultValue={listing?.dayCheckOut ?? "18:00"} error={errors.dayCheckOut} label="Day check-out" name="dayCheckOut" />
            <TimeField defaultValue={listing?.nightCheckIn ?? "19:00"} error={errors.nightCheckIn} label="Night check-in" name="nightCheckIn" />
            <TimeField defaultValue={listing?.nightCheckOut ?? "01:00"} error={errors.nightCheckOut} label="Night check-out" name="nightCheckOut" />
          </div>
        </ListingFormSection>

        <ListingFormSection
          description="Booking contact details and optional public social links."
          icon={ContactRound}
          title="Contact and social links"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ListingTextField defaultValue={listing?.phoneNumber} error={errors.phoneNumber} label="Phone number" name="phoneNumber" placeholder="+961 76 702 870" required type="tel" />
            <ListingTextField defaultValue={listing?.whatsappNumber} error={errors.whatsappNumber} label="WhatsApp number" name="whatsappNumber" placeholder="96176702870" required type="tel" />
            <ListingTextField defaultValue={listing?.instagramUrl} error={errors.instagramUrl} label="Instagram" name="instagramUrl" optional placeholder="https://instagram.com/..." type="url" />
            <ListingTextField defaultValue={listing?.facebookUrl} error={errors.facebookUrl} label="Facebook" name="facebookUrl" optional placeholder="https://facebook.com/..." type="url" />
            <ListingTextField defaultValue={listing?.tiktokUrl} error={errors.tiktokUrl} label="TikTok" name="tiktokUrl" optional placeholder="https://tiktok.com/@..." type="url" />
            <ListingTextField defaultValue={listing?.youtubeUrl} error={errors.youtubeUrl} label="YouTube" name="youtubeUrl" optional placeholder="https://youtube.com/@..." type="url" />
            <ListingTextField defaultValue={listing?.websiteUrl} error={errors.websiteUrl} label="Website" name="websiteUrl" optional placeholder="https://example.com" type="url" />
          </div>
        </ListingFormSection>

        <ListingFormSection description="Cover image first, followed by the detail-page carousel." icon={ImageIcon} title="Images">
          <ListingImageManager
            disabled={isPending || isCancelling}
            error={errors.images}
            initialImages={listing?.images ?? []}
            onBusyChange={handleImageManagerBusyChange}
            onError={(message) => pushToast("error", message)}
            onTemporaryAssetsChange={handleTemporaryAssetsChange}
          />
        </ListingFormSection>

        <ListingFormSection description="Amenities and services included with the private pool." icon={LayoutList} title="What is included">
          <ListingInclusionsEditor error={errors.inclusions} initialItems={listing?.inclusions ?? []} />
        </ListingFormSection>

        <ListingFormSection description="Public rules guests should review before booking." icon={ScrollText} title="Rules and regulations">
          <ListingRulesEditor error={errors.rules} initialRules={listing?.rules ?? []} />
        </ListingFormSection>

        <ListingFormSection description="Optionally connect live availability from any active venue." icon={CalendarClock} title="Calendar and visibility">
          <div className="grid gap-4 lg:grid-cols-2">
            <CalendarVenueSelect defaultValue={listing?.calendarVenueId} venues={calendarVenues} />
            <ListingToggle defaultChecked={listing?.isPublished ?? true} description="Make this listing visible in the public directory." label="Published" name="isPublished" />
          </div>
        </ListingFormSection>

        <div className="flex flex-col-reverse gap-2 bg-[#fffdf8] p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6 lg:p-8">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d9d5c9] bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
            disabled={isPending || isCancelling || isManagingImages}
            onClick={() => void cancelEditing()}
            type="button"
          >
            {isCancelling ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
            {isCancelling ? "Cleaning up..." : "Cancel"}
          </button>
          <button className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg bg-[#C0964E] px-5 text-sm font-black text-[#123C36] shadow-[0_14px_28px_rgba(192,150,78,0.22)] transition hover:bg-[#A87E36] disabled:cursor-wait disabled:opacity-70" disabled={isPending || isCancelling || isManagingImages} type="submit">
            {isPending ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : listing ? <Save size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            {isPending ? "Saving..." : listing ? "Save listing" : "Create listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NumberField({ defaultValue, error, label, name, step = "1" }: { defaultValue: number; error?: string; label: string; name: string; step?: string }) {
  return <ListingTextField defaultValue={defaultValue} error={error} label={label} min={step === "1" ? "0" : "0.1"} name={name} required step={step} type="number" />;
}

function TimeField({ defaultValue, error, label, name }: { defaultValue: string; error?: string; label: string; name: string }) {
  return <ListingTextField defaultValue={defaultValue} error={error} label={label} name={name} required type="time" />;
}
