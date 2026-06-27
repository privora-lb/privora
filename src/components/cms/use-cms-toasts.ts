"use client";

import { useCallback, useState } from "react";

import type { CmsToast } from "@/components/cms/CmsToastStack";

export function useCmsToasts() {
  const [toasts, setToasts] = useState<CmsToast[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((type: CmsToast["type"], message: string) => {
    setToasts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message,
        type,
      },
    ]);
  }, []);

  return { dismissToast, pushToast, toasts };
}
