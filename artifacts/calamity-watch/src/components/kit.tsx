import type { ReactNode } from "react";
import { Link } from "wouter";
import type { Hazard, RiskLevel, Trend } from "@workspace/api-client-react";
import { HAZARD_FALLBACK_COLOR, HAZARD_LABEL, LEVEL_COLOR, LEVEL_LABEL, TREND_LABEL, utcTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Level glyphs: dashed ring not enough posts, dash low, diamond elevated, circle high, triangle severe. */
export function LevelGlyph({ level, size = 10 }: { level: RiskLevel; size?: number }) {
  const c = LEVEL_COLOR[level];
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      {level === "insufficient" && <circle cx="5" cy="5" r="3.5" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="1.6 1.4" />}
      {level === "low" && <rect x="1" y="4.2" width="8" height="1.6" fill={c} />}
      {level === "elevated" && <path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" fill={c} />}
      {level === "high" && <circle cx="5" cy="5" r="4.2" fill={c} />}
      {level === "severe" && <path d="M5 0.5 9.6 9.3H0.4Z" fill={c} />}
    </svg>
  );
}

/** Level as word + glyph + colour. Never a filled chip: the pen channel is a mark, not a background. */
export function LevelBadge({ level, className, testId }: { level: RiskLevel; className?: string; testId?: string }) {
  return (
    <span data-testid={testId ?? `status-level-${level}`} className={cn("inline-flex items-center gap-1.5 text-[13px] leading-4 font-semibold whitespace-nowrap", className)} style={{ color: LEVEL_COLOR[level] }}>
      <LevelGlyph level={level} />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function HazardDot({ hazard, color }: { hazard: Hazard; color?: string }) {
  return <span aria-hidden className="inline-block size-2.5 rounded-full shrink-0 ring-1 ring-paper" style={{ background: color ?? HAZARD_FALLBACK_COLOR[hazard] }} />;
}

export function HazardTag({ hazard, link = true }: { hazard: Hazard; color?: string; link?: boolean }) {
  const inner = (
    <>
      <HazardDot hazard={hazard} />
      {HAZARD_LABEL[hazard]}
    </>
  );
  if (!link) return <span className="inline-flex items-center gap-1.5">{inner}</span>;
  return (
    <Link href={`/hazards/${hazard}`} data-testid={`link-hazard-${hazard}`} className="inline-flex items-center gap-1.5 ink-link">
      {inner}
    </Link>
  );
}

export function TrendText({ trend }: { trend: Trend }) {
  const glyph = trend === "rising" ? "▲" : trend === "falling" ? "▼" : "–";
  return (
    <span className="inline-flex items-center gap-1 text-ink-muted">
      <span aria-hidden className="text-[9px]">{glyph}</span>
      {TREND_LABEL[trend]}
    </span>
  );
}

/** A plate: sheet surface, 1 px frame, one mono label strip. */
export function Panel({ title, meta, children, className, actions, testId }: { title?: ReactNode; meta?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className={cn("bg-sheet border border-rule-strong min-w-0", className)}>
      {(title || meta || actions) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-rule">
          <div className="min-w-0">
            {title && <h2 className="plate-label text-ink">{title}</h2>}
            {meta && <p className="text-[12px] leading-4 text-ink-muted mt-0.5">{meta}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/** Static skeleton: ruled lines on paper, no pulsing. */
export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-[repeating-linear-gradient(0deg,var(--cr-rule)_0_1px,transparent_1px_12px)] opacity-70", className)} />;
}

export function LoadingRows({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 border-b border-rule flex items-center gap-3">
          <span className="h-2 w-12 bg-rule" />
          <span className="h-2 bg-rule" style={{ width: `${40 + ((i * 23) % 40)}%` }} />
        </div>
      ))}
      <span className="mt-2 text-[12px] text-ink-muted">{label}</span>
    </div>
  );
}

export function ErrorState({ what, onRetry, lastGood, className }: { what: string; onRetry?: () => void; lastGood?: string | null; className?: string }) {
  return (
    <div role="alert" data-testid="status-error" className={cn("p-4 text-[14px] leading-5", className)}>
      <p>
        <span className="font-semibold text-ink">Error: couldn't load {what}.</span>{" "}
        {lastGood ? <span className="text-ink-muted">Showing {utcTime(lastGood)}.</span> : <span className="text-ink-muted">The API did not answer. Try again; nothing you entered is lost.</span>}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} data-testid="button-retry" className={cn(btn, "mt-2")}>
          Load {what} again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div data-testid="status-empty" className={cn("p-4 text-[14px] leading-5 text-ink-muted", className)}>
      <div className="max-w-[60ch]">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ExperimentalNote({ className }: { className?: string }) {
  return (
    <p data-testid="text-experimental" className={cn("text-[12px] leading-4 text-ink-muted", className)}>
      Experimental research system. Not an official warning source: follow your local authorities.
    </p>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="display h2-station">{children}</h1>
      {sub && <div className="mt-3 text-ink-muted max-w-[68ch]">{sub}</div>}
    </div>
  );
}

export function TextLink({ href, children, testId }: { href: string; children: ReactNode; testId?: string }) {
  return (
    <Link href={href} data-testid={testId} className="ink-link text-ink">
      {children}
    </Link>
  );
}

export const btn =
  "press inline-flex items-center justify-center gap-2 rounded-[6px] border border-rule-strong bg-sheet text-ink px-3.5 h-10 text-[14px] leading-5 font-medium hover:border-ink disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary =
  "press inline-flex items-center justify-center gap-2 rounded-[6px] border border-ink bg-ink text-paper px-4 h-10 text-[14px] leading-5 font-semibold hover:bg-[#2b2a24] disabled:opacity-50 disabled:pointer-events-none";
