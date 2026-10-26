import type { ReactNode } from "react";
import { Link } from "wouter";
import type { Hazard, RiskLevel, Trend } from "@workspace/api-client-react";
import { HAZARD_FALLBACK_COLOR, HAZARD_LABEL, LEVEL_COLOR, LEVEL_LABEL, TREND_LABEL, utcTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LevelGlyph({ level, size = 10 }: { level: RiskLevel; size?: number }) {
  const c = LEVEL_COLOR[level];
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      {level === "insufficient" && <circle cx="5" cy="5" r="3.5" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="1.6 1.4" />}
      {level === "low" && <rect x="1" y="4" width="8" height="2" fill={c} />}
      {level === "elevated" && <path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" fill={c} />}
      {level === "high" && <circle cx="5" cy="5" r="4.2" fill={c} />}
      {level === "severe" && <path d="M5 0.5 9.6 9.3H0.4Z" fill={c} />}
    </svg>
  );
}

export function LevelBadge({ level, className, testId }: { level: RiskLevel; className?: string; testId?: string }) {
  return (
    <span
      data-testid={testId ?? `status-level-${level}`}
      className={cn("inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[12px] leading-4 font-medium border", className)}
      style={{ color: LEVEL_COLOR[level], borderColor: `${LEVEL_COLOR[level]}55`, background: `${LEVEL_COLOR[level]}14` }}
    >
      <LevelGlyph level={level} />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function HazardDot({ hazard, color }: { hazard: Hazard; color?: string }) {
  return <span aria-hidden className="inline-block size-2 rounded-full shrink-0" style={{ background: color ?? HAZARD_FALLBACK_COLOR[hazard] }} />;
}

export function HazardTag({ hazard, color, link = true }: { hazard: Hazard; color?: string; link?: boolean }) {
  const inner = (
    <>
      <HazardDot hazard={hazard} color={color} />
      {HAZARD_LABEL[hazard]}
    </>
  );
  if (!link) return <span className="inline-flex items-center gap-1.5">{inner}</span>;
  return (
    <Link href={`/hazards/${hazard}`} data-testid={`link-hazard-${hazard}`} className="inline-flex items-center gap-1.5 hover:underline underline-offset-2">
      {inner}
    </Link>
  );
}

export function TrendText({ trend }: { trend: Trend }) {
  const glyph = trend === "rising" ? "▲" : trend === "falling" ? "▼" : "–";
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span aria-hidden className="text-[10px]">{glyph}</span>
      {TREND_LABEL[trend]}
    </span>
  );
}

export function Panel({ title, meta, children, className, actions, testId }: { title?: ReactNode; meta?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className={cn("bg-surface border border-line rounded-lg min-w-0", className)}>
      {(title || meta || actions) && (
        <header className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] leading-5 font-bold">{title}</h2>}
            {meta && <p className="text-[12px] leading-4 text-muted-foreground">{meta}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-[4px] bg-surface-2 animate-pulse motion-reduce:animate-none", className)} />;
}

export function LoadingRows({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} className="h-9" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ what, onRetry, lastGood, className }: { what: string; onRetry?: () => void; lastGood?: string | null; className?: string }) {
  return (
    <div role="alert" data-testid="status-error" className={cn("p-4 text-[14px] leading-5", className)}>
      <p>
        <span className="font-bold" style={{ color: "var(--risk-high)" }}>Couldn't load {what}.</span>{" "}
        {lastGood ? <span className="text-muted-foreground">Showing {utcTime(lastGood)}.</span> : <span className="text-muted-foreground">The API did not answer.</span>}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} data-testid="button-retry" className="press mt-2 rounded-[4px] border border-line bg-surface-2 px-3 py-1.5 text-[14px] hover:border-[#3a4a66]">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div data-testid="status-empty" className={cn("p-4 text-[14px] leading-5 text-muted-foreground", className)}>
      <div className="max-w-[60ch]">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ExperimentalNote({ className }: { className?: string }) {
  return (
    <p data-testid="text-experimental" className={cn("text-[12px] leading-4 text-muted-foreground", className)}>
      Experimental research system. Not an official warning source: follow your local authorities.
    </p>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-[28px] leading-[34px]">{children}</h1>
      {sub && <div className="mt-1 text-muted-foreground max-w-[72ch]">{sub}</div>}
    </div>
  );
}

export function TextLink({ href, children, testId }: { href: string; children: ReactNode; testId?: string }) {
  return (
    <Link href={href} data-testid={testId} className="text-[#7FB8FF] hover:underline underline-offset-2">
      {children}
    </Link>
  );
}

export const btn = "press inline-flex items-center gap-2 rounded-[4px] border border-line bg-surface-2 px-3 py-1.5 text-[14px] leading-5 hover:border-[#3a4a66] disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = "press inline-flex items-center gap-2 rounded-[4px] bg-[#3D9BFF] text-[#0C1424] font-bold px-3 py-1.5 text-[14px] leading-5 hover:bg-[#62AEFF] disabled:opacity-50 disabled:pointer-events-none";
