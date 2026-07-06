import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/ui";

type ActiveSwitchProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean;
  isLoading?: boolean;
  label: string;
};

export function ActiveSwitch({
  checked,
  className,
  disabled,
  isLoading,
  label,
  ...props
}: ActiveSwitchProps) {
  return (
    <button
      {...props}
      aria-label={label}
      aria-checked={checked}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition focus:outline-none focus:ring-2 focus:ring-[#EACC84]/35",
        checked
          ? "border-emerald-300 bg-emerald-500"
          : "border-slate-300 bg-slate-200",
        (disabled || isLoading) && "cursor-not-allowed opacity-60",
        className,
      )}
      role="switch"
      title={label}
      type={props.type ?? "button"}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-full bg-white shadow-sm transition",
          checked && "translate-x-4",
        )}
      >
        {isLoading ? (
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#EACC84]/35 border-t-[#967230]" />
        ) : null}
      </span>
    </button>
  );
}
