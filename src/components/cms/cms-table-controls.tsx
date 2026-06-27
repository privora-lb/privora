import { X } from "lucide-react";
import type { ReactNode } from "react";

export const cmsTableInputClassName =
  "-mx-3 min-h-[35px] w-[calc(100%+1.5rem)] border-0 bg-transparent px-3 text-[12px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:text-slate-950 focus:ring-2 focus:ring-inset focus:ring-[#0EA5A8]/20";

export const cmsTableFieldErrorClassName =
  "bg-rose-50 text-rose-900 ring-2 ring-inset ring-rose-300 placeholder:text-rose-300 focus:bg-rose-50 focus:ring-rose-400";

export const cmsTableSelectClassName =
  "-mx-3 min-h-[35px] w-[calc(100%+1.5rem)] cursor-pointer border-0 bg-transparent px-3 text-[12px] font-bold text-slate-700 outline-none transition focus:bg-white focus:text-slate-950 focus:ring-2 focus:ring-inset focus:ring-[#0EA5A8]/20";

export const cmsTableTextareaClassName =
  "-mx-3 min-h-20 w-[calc(100%+1.5rem)] resize-y border-0 bg-transparent px-3 py-2 text-[12px] font-bold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:bg-white focus:text-slate-950 focus:ring-2 focus:ring-inset focus:ring-[#0EA5A8]/20";

export const cmsModalInputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0EA5A8] focus:ring-3 focus:ring-[#0EA5A8]/15";

export const cmsModalTextareaClassName =
  "min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0EA5A8] focus:ring-3 focus:ring-[#0EA5A8]/15";

export const cmsFieldLabelClassName =
  "grid gap-2 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500";

export const cmsSubmitButtonClassName =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f4f8f] px-4 text-sm font-black text-white shadow-[0_16px_30px_rgba(31,79,143,0.22)] transition hover:-translate-y-px hover:bg-[#183f73]";

export function CmsCreateModal({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#123342] px-5 py-4 text-white">
          <div className="min-w-0">
            <h2 className="m-0 text-lg font-black leading-tight">{title}</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-white/72">
              {description}
            </p>
          </div>
          <button
            aria-label="Close modal"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 text-white transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
