"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/ui";

export type CmsToast = {
  id: string;
  message: string;
  type: "error" | "success";
};

const TOAST_DURATION_MS = 3600;
const TOAST_EXIT_MS = 320;

function CmsToastItem({
  onDismiss,
  toast,
}: {
  onDismiss: (id: string) => void;
  toast: CmsToast;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const isSuccess = toast.type === "success";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
      setIsTimerRunning(true);
    });
    const hideTimer = setTimeout(() => setIsVisible(false), TOAST_DURATION_MS);
    const removeTimer = setTimeout(
      () => onDismiss(toast.id),
      TOAST_DURATION_MS + TOAST_EXIT_MS,
    );

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [onDismiss, toast.id]);

  return (
    <article
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-xl border bg-white px-4 py-3 pr-5 shadow-[0_18px_48px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out",
        isSuccess ? "border-emerald-200" : "border-rose-200",
        isVisible
          ? "translate-x-0 opacity-100"
          : "translate-x-[calc(100%+32px)] opacity-0",
      )}
      role={isSuccess ? "status" : "alert"}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
            isSuccess
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700",
          )}
        >
          {isSuccess ? (
            <CheckCircle2 size={17} strokeWidth={2.5} />
          ) : (
            <AlertCircle size={17} strokeWidth={2.5} />
          )}
        </span>
        <div className="min-w-0">
          <strong className="block text-[13px] font-black text-slate-950">
            {isSuccess ? "Saved" : "Update failed"}
          </strong>
          <p className="m-0 mt-0.5 text-[12px] font-bold leading-snug text-slate-500">
            {toast.message}
          </p>
        </div>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0 left-0 h-[3px] w-full origin-left rounded-full transition-transform ease-linear",
          isSuccess ? "bg-emerald-500" : "bg-rose-500",
          isTimerRunning ? "scale-x-0" : "scale-x-100",
        )}
        style={{ transitionDuration: `${TOAST_DURATION_MS}ms` }}
      />
    </article>
  );
}

export function CmsToastStack({
  onDismiss,
  toasts,
}: {
  onDismiss: (id: string) => void;
  toasts: CmsToast[];
}) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[100] grid w-[min(360px,calc(100vw_-_32px))] gap-2 max-[760px]:left-4 max-[760px]:right-4 max-[760px]:top-[76px] max-[760px]:w-auto">
      {toasts.map((toast) => (
        <CmsToastItem key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>
  );
}
