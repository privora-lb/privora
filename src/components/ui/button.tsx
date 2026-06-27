import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" &&
      "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800",
    variant === "secondary" &&
      "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
    variant === "danger" &&
      "border-red-700 bg-red-700 text-white hover:bg-red-800",
    variant === "ghost" &&
      "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100",
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonClassName(variant, size), className)} {...props}>
      {children}
    </button>
  );
}
