"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/ui";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  buttonClassName?: string;
  iconSize?: number;
  wrapperClassName?: string;
};

export function PasswordInput({
  buttonClassName,
  className,
  disabled,
  iconSize = 16,
  wrapperClassName,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? "Hide password" : "Show password";

  return (
    <span className={cn("relative block", wrapperClassName)}>
      <input
        {...props}
        className={className}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-label={label}
        className={cn(
          "absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EACC84]/35 disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName,
        )}
        disabled={disabled}
        onClick={() => setIsVisible((current) => !current)}
        title={label}
        type="button"
      >
        {isVisible ? (
          <EyeOff size={iconSize} aria-hidden="true" />
        ) : (
          <Eye size={iconSize} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
