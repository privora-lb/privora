import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/ui";

export const listingInputClassName =
  "h-11 w-full min-w-0 rounded-lg border border-[#d9d5c9] bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C0964E] focus:ring-3 focus:ring-[#EACC84]/20";

export function ListingFormSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <fieldset className="grid gap-5 border-0 border-b border-[#ebe4d4] p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:p-8">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3 lg:block">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F6E4AE] text-[#123C36] lg:mb-3">
          <Icon size={17} strokeWidth={2.3} aria-hidden="true" />
        </span>
        <div>
          <h2 className="m-0 text-[15px] font-black text-[#123C36]">{title}</h2>
          <p className="m-0 mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </fieldset>
  );
}

export function ListingField({
  children,
  error,
  label,
  name,
  optional,
}: {
  children: ReactNode;
  error?: string;
  label: string;
  name?: string;
  optional?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1.5" htmlFor={name}>
      <span className="flex items-center justify-between gap-2 text-xs font-black text-slate-700">
        {label}
        {optional ? (
          <span className="text-[10px] font-bold text-slate-400">Optional</span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs font-bold text-rose-700">{error}</span>
      ) : null}
    </label>
  );
}

export function ListingTextField({
  defaultValue,
  error,
  label,
  name,
  optional,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "name"> & {
  defaultValue?: string | number;
  error?: string;
  label: string;
  name: string;
  optional?: boolean;
}) {
  return (
    <ListingField error={error} label={label} name={name} optional={optional}>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={cn(
          listingInputClassName,
          error && "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100",
          props.className,
        )}
        defaultValue={defaultValue}
        id={name}
        name={name}
      />
    </ListingField>
  );
}

export function ListingTextareaField({
  defaultValue,
  error,
  label,
  name,
  optional,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue" | "name"> & {
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  optional?: boolean;
}) {
  return (
    <ListingField error={error} label={label} name={name} optional={optional}>
      <textarea
        {...props}
        aria-invalid={Boolean(error)}
        className={cn(
          listingInputClassName,
          "h-auto min-h-28 resize-y py-3 leading-6",
          error && "border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100",
          props.className,
        )}
        defaultValue={defaultValue}
        id={name}
        name={name}
      />
    </ListingField>
  );
}

export function ListingToggle({
  defaultChecked,
  description,
  label,
  name,
}: {
  defaultChecked?: boolean;
  description: string;
  label: string;
  name: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#d9d5c9] bg-white px-3.5 py-2.5">
      <span className="min-w-0">
        <strong className="block text-xs font-black text-slate-800">{label}</strong>
        <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-slate-500">
          {description}
        </span>
      </span>
      <input
        className="peer sr-only"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-[#123C36] peer-focus-visible:ring-3 peer-focus-visible:ring-[#EACC84]/45 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
