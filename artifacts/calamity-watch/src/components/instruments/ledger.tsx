import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ids that were not present on the previous render. The first render returns none, so only genuinely new rows print in. */
export function useNewIds(ids: (string | number)[]): Set<string | number> {
  const seen = useRef<Set<string | number> | null>(null);
  if (seen.current === null) {
    seen.current = new Set(ids);
    return new Set();
  }
  const fresh = new Set<string | number>();
  for (const id of ids) if (!seen.current.has(id)) fresh.add(id);
  for (const id of ids) seen.current.add(id);
  return fresh;
}

export function Ledger({ children, className, testId, label }: { children: ReactNode; className?: string; testId?: string; label?: string }) {
  return (
    <ol aria-label={label} data-testid={testId} className={cn("divide-y divide-rule", className)}>
      {children}
    </ol>
  );
}
