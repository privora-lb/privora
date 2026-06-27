import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";

export function DeleteConfirmationModal({
  children,
  confirmFormId,
  confirmLabel = "Delete",
  onCancel,
  title,
}: {
  children: ReactNode;
  confirmFormId: string;
  confirmLabel?: string;
  onCancel: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-rose-100 bg-rose-50 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-rose-700 shadow-sm">
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="m-0 text-lg font-black leading-tight text-slate-950">
                {title}
              </h2>
              <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                {children}
              </div>
            </div>
          </div>
          <button
            aria-label="Cancel delete"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            onClick={onCancel}
            type="button"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(190,18,60,0.22)] transition hover:bg-rose-800"
            onClick={() => {
              const form = document.getElementById(confirmFormId);

              if (form instanceof HTMLFormElement) {
                form.requestSubmit();
              }

              onCancel();
            }}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
