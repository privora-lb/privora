import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui";

type CmsDataTableIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
};

export function CmsDataTableIconButton({
  children,
  className,
  label,
  ...props
}: CmsDataTableIconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className={cn(
        "group relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:-translate-y-px hover:border-[#00008B]/30 hover:bg-[#f3f7ff] hover:text-[#00008B] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
        className,
      )}
      title={label}
      type={props.type ?? "button"}
    >
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[11px] font-black text-white opacity-0 shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}
