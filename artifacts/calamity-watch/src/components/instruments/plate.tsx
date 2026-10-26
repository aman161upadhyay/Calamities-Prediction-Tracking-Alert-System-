import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The mono strip that titles an instrument. Parts are joined with a slash, as on a printed chart. */
export function PlateLabel({ parts, right, className, id }: { parts: string[]; right?: ReactNode; className?: string; id?: string }) {
  return (
    // Below sm the row may wrap so a long scope and its counts both stay readable; from sm up it is one 32 px line and the label truncates.
    <div className={cn("flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 px-3 min-h-8 sm:h-8 border-b border-rule-strong", className)}>
      <p id={id} className="plate-label text-ink truncate grow basis-44 py-1.5 sm:grow-0 sm:basis-auto sm:py-0">
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="text-rule-strong px-1.5">/</span>}
            {p}
          </span>
        ))}
      </p>
      {right && <div className="shrink-0 ml-auto py-1 text-[11px] text-ink-muted sm:py-0">{right}</div>}
    </div>
  );
}

export function Plate({ label, right, children, className, testId, labelId }: { label?: string[]; right?: ReactNode; children: ReactNode; className?: string; testId?: string; labelId?: string }) {
  return (
    <section data-testid={testId} aria-labelledby={labelId} className={cn("relative bg-sheet border border-rule-strong min-w-0", className)}>
      {label && <PlateLabel parts={label} right={right} id={labelId} />}
      {children}
    </section>
  );
}
