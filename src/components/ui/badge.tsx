import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        tone === "neutral" && "border-zinc-200 bg-zinc-50 text-zinc-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "danger" && "border-red-200 bg-red-50 text-red-800",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {children}
    </span>
  );
}
