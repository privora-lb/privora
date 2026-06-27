import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/ui";

type ActiveSwitchProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean;
  label: string;
};

export function ActiveSwitch({
  checked,
  className,
  label,
  disabled,
  ...props
}: ActiveSwitchProps) {
  return (
    <button
      {...props}
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition focus:outline-none focus:ring-2 focus:ring-[#0EA5A8]/20",
        checked
          ? "border-emerald-300 bg-emerald-500"
          : "border-slate-300 bg-slate-200",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      role="switch"
      title={label}
      type={props.type ?? "button"}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-white shadow-sm transition",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
