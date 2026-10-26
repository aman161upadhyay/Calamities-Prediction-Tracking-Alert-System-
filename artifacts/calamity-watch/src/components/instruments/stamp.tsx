import { useEffect, useRef, useState } from "react";
import type { Corroboration } from "@workspace/api-client-react";
import { stampLead, utcDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Presses in once when it first enters view. */
function useOnceInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

/** The official corroboration mark: an ink-ruled chip in mono. It fades in once when it first enters view. */
export function Stamp({ c, openedAt, size = "md", testId }: { c: Corroboration; openedAt: string; size?: "sm" | "md"; testId?: string }) {
  const { ref, seen } = useOnceInView<HTMLDivElement>();
  if (c.state !== "corroborated") return null;
  return (
    <div
      ref={ref}
      data-testid={testId ?? "stamp-official"}
      className={cn("inline-block border border-stamp text-stamp mono leading-tight", size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1.5 text-[12px]", seen && "stamp-press")}
    >
      <span className="block font-semibold">{c.feed ?? "Official"}{c.hazardRelation === "related" && c.officialHazard ? ` · ${c.officialHazard}` : ""}</span>
      {size === "md" && <span className="block">{utcDateTime(c.officialAt)}</span>}
      <span className="block">{stampLead(c, openedAt)}</span>
    </div>
  );
}

/** Mini glyph for ledger columns: a tiny stamp square, or the state in words. */
export function StampGlyph({ state }: { state: Corroboration["state"] }) {
  if (state === "corroborated")
    return (
      <span className="inline-flex items-center gap-1.5 text-ink">
        <span aria-hidden className="inline-block size-2.5 border-[1.5px] border-stamp" />
        Official match
      </span>
    );
  if (state === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        <span aria-hidden className="inline-block size-2.5 border border-dashed border-rule-strong" />
        Awaiting
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-muted">
      <span aria-hidden className="inline-block size-2.5 border border-rule-strong" />
      No match
    </span>
  );
}
