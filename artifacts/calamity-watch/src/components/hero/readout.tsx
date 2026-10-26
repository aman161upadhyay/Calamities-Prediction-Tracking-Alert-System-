import { HAZARD_FALLBACK_COLOR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { REGIONS, figureLine, headerLine, typedAt } from "./script";

/**
 * The terminal readout: a header line that never changes, then one block per region as its first dot appears, typed
 * at 28 ms a character with a block cursor on the active line. Each block is sized by an invisible copy of its final
 * two lines at the current width, and the typed text is laid over it, so the typing never moves anything below the
 * readout at any viewport. `dispatch` is version B's wire-dispatch setting (hairline on the left, dateline above).
 */
export function Readout({ t, paused, reduced, onToggle, onRestart, dispatch, className }: { t: number; paused: boolean; reduced: boolean; onToggle: () => void; onRestart: () => void; dispatch?: boolean; className?: string }) {
  const blocks = typedAt(t);
  return (
    <div
      className={cn("mono text-[12.5px] leading-[19px] text-ink", dispatch ? "border-l border-rule-strong pl-4" : "", className)}
      data-testid="hero-readout"
      aria-live="off"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-ink-muted">
        <span className="whitespace-nowrap" data-testid="text-readout-header">signal growth · scripted illustration{reduced ? " · final frame" : ""}</span>
        {!reduced && (
          <span className="ml-auto inline-flex items-center gap-3 shrink-0">
            <button type="button" onClick={onToggle} className="hover:text-ink underline-offset-[3px] hover:underline" data-testid="button-scene-toggle" aria-pressed={paused}>
              {paused ? "play" : "pause"}
            </button>
            <button type="button" onClick={onRestart} className="hover:text-ink underline-offset-[3px] hover:underline" data-testid="button-scene-restart">
              restart
            </button>
          </span>
        )}
      </div>
      <ol className="mt-2 grid gap-2" aria-label="Readout lines">
        {blocks.map((b) => {
          const region = REGIONS.find((r) => r.id === b.id)!;
          return (
            <li key={b.id} className={cn("grid grid-cols-[10px_1fr] gap-x-2", !b.started && "invisible")} data-testid={`readout-block-${b.id}`} aria-hidden={!b.started}>
              <span aria-hidden className="mt-[7px] size-[6px] rounded-full" style={{ background: HAZARD_FALLBACK_COLOR[region.hazard], boxShadow: `0 0 0 3px color-mix(in srgb, ${HAZARD_FALLBACK_COLOR[region.hazard]} 28%, transparent)` }} />
              <div className="relative min-w-0">
                {/* The final text, invisible, holds the block at its finished height from the first frame. */}
                <div aria-hidden className="invisible" data-testid={`readout-size-${b.id}`}>
                  <p className="whitespace-pre-wrap break-words">{headerLine(region)}</p>
                  <p className="whitespace-pre-wrap min-h-[19px]">{figureLine(region, region.n)}</p>
                </div>
                <div className="absolute inset-0">
                  <p className="whitespace-pre-wrap break-words">
                    {b.header}
                    {b.cursor === "header" && <span className="term-cursor" aria-hidden />}
                  </p>
                  <p className="whitespace-pre-wrap text-ink-muted min-h-[19px]">
                    {b.figure}
                    {b.cursor === "figure" && <span className="term-cursor text-ink" aria-hidden />}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
