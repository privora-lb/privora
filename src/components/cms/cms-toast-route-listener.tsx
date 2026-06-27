"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { CmsToastStack, type CmsToast } from "@/components/cms/CmsToastStack";
import { useCmsToasts } from "@/components/cms/use-cms-toasts";
import {
  toastIdParam,
  toastMessageParam,
  toastTypeParam,
} from "@/lib/toast";

function isToastType(value: string | null): value is CmsToast["type"] {
  return value === "success" || value === "error";
}

export function CmsToastRouteListener() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledToastId = useRef<string | null>(null);
  const { dismissToast, pushToast, toasts } = useCmsToasts();

  useEffect(() => {
    const toastType = searchParams.get(toastTypeParam);
    const message = searchParams.get(toastMessageParam);
    const toastId = searchParams.get(toastIdParam);

    if (!isToastType(toastType) || !message || !toastId) {
      return;
    }

    if (handledToastId.current !== toastId) {
      handledToastId.current = toastId;
      pushToast(toastType, message);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(toastTypeParam);
    nextParams.delete(toastMessageParam);
    nextParams.delete(toastIdParam);
    const nextQuery = nextParams.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, pushToast, router, searchParams]);

  return <CmsToastStack onDismiss={dismissToast} toasts={toasts} />;
}
