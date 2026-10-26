import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearch } from "wouter";
import { useListReplayScenarios, type Alert, type OfficialEvent } from "@workspace/api-client-react";
import { HazardDot, LevelBadge } from "@/components/kit";
import { StampGlyph } from "@/components/instruments/stamp";
import { scopeQuery } from "@/components/board/rows";
import { HAZARD_LABEL, num, stampLead, utcDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Scope = { scenario: string; asOf?: string } | null;

/** Replay scope from the URL: ?scenario=…&asOf=… */
export function useScope() {
  const sp = new URLSearchParams(useSearch());
  const scenario = sp.get("scenario") || null;
  const urlAsOf = sp.get("asOf") || undefined;
  // A scenario without a playhead reads as of the scenario's end, never as of now (which would be outside the replay).
  const scenarios = useListReplayScenarios({ query: { enabled: !!scenario && !urlAsOf, queryKey: ["/api/replay/scenarios"] } });
  const endsAt = scenario && !urlAsOf ? scenarios.data?.find((s) => s.id === scenario)?.endsAt : undefined;
  const asOf = urlAsOf ?? endsAt;
  const scope: Scope = scenario ? { scenario, asOf } : null;
  const params = scope ? { scenario: scope.scenario, ...(scope.asOf ? { asOf: scope.asOf } : {}) } : {};
  /** False until a scenario's end is known; time-windowed queries wait for it. */
  const ready = !scenario || !!asOf || scenarios.isError || (scenarios.isSuccess && !endsAt);
  const atEnd = !!scenario && !urlAsOf;
  return { scope, params, sp, ready, atEnd };
}

export function replayHref(scope: NonNullable<Scope>) {
  return `/replay?s=${encodeURIComponent(scope.scenario)}${scope.asOf ? `&t=${encodeURIComponent(scope.asOf)}` : ""}`;
}

/** The thin strip that says which record the page reads from. */
export function ScopeNote({ scope, what, testId, atEnd }: { scope: Scope; what: string; testId?: string; atEnd?: boolean }) {
  return (
    <p className="mb-6 text-[13px] leading-5 text-ink-muted border-l-2 border-ink pl-3" data-testid={testId ?? "text-scope"}>
      {scope ? (
        <>
          Replay <span className="mono text-ink">{scope.scenario}</span>, read as of <span className="mono text-ink">{scope.asOf ? utcDateTime(scope.asOf) : "the end of the replay"}</span>{atEnd && scope.asOf ? ", the end of the replay" : ""}. {what} come from that replay, not live ingestion.{" "}
          <Link href={replayHref(scope)} className="ink-link text-ink" data-testid="link-back-replay">Back to the replay</Link>
        </>
      ) : (
        <>Live ingestion. {what} are read as of now and refresh every minute.</>
      )}
    </p>
  );
}

/** A labelled radiogroup of mono segments; arrow keys move and select. Values are strings; "" means all. */
export function RadioRow({ label, value, options, onChange, testId }: { label: string; value: string; options: { value: string; label: ReactNode }[]; onChange: (v: string) => void; testId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = Math.max(0, options.findIndex((o) => o.value === value));

    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + options.length) % options.length;
    if (n < 0) return;
    e.preventDefault();
    onChange(options[n].value);
    (ref.current?.querySelectorAll("button")[n] as HTMLButtonElement | undefined)?.focus();
  };
  return (
    <div className="grid gap-x-4 gap-y-1.5 md:grid-cols-[88px_1fr] items-start">
      <span className="text-[13px] leading-7 text-ink-muted" id={`${testId}-label`}>{label}</span>
      <div ref={ref} role="radiogroup" aria-labelledby={`${testId}-label`} onKeyDown={onKey} className="flex flex-wrap gap-1.5 min-w-0" data-testid={testId}>
        {options.map((o, idx) => {
          const on = o.value === value;
          const tabbable = on || (idx === 0 && !options.some((x) => x.value === value));
          return (
            <button
              key={o.value || "all"}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(o.value)}
              data-testid={`button-${testId}-${o.value || "all"}`}
              className={cn("press inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[3px] border text-[13px] leading-none", on ? "bg-ink text-paper border-ink" : "bg-sheet border-rule-strong text-ink hover:border-ink")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function windowText(a: Alert) {
  if (!a.closedAt) return "open";
  const h = Math.max(0, Math.round((+new Date(a.closedAt) - +new Date(a.openedAt)) / 3_600_000));
  return `${h} h`;
}

const COLS = "grid gap-x-4 items-baseline grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[140px_minmax(0,1fr)_124px_60px_minmax(180px,240px)] lg:grid-cols-[140px_minmax(0,1fr)_124px_60px_56px_56px_minmax(184px,250px)]";

/** The printed ledger of alerts: one hairline row per alert, the whole row opens the dossier. */
export function AlertLedger({ alerts, scope, testId = "ledger-alerts", showPlace = true, atEnd = false }: { alerts: Alert[]; scope: Scope; testId?: string; showPlace?: boolean; atEnd?: boolean }) {
  /** Each level names its own observation time: closed alerts keep the level at closing. */
  const when = (a: Alert) => a.status !== "open" || a.closedAt ? "at close" : !scope ? "now" : atEnd ? "at end" : "at playhead";
  return (
    <div data-testid={testId}>
      <div className={cn(COLS, "hidden md:grid px-4 h-8 items-center border-b border-rule-strong text-[12px] text-ink-muted")} aria-hidden>
        <span>Opened, UTC</span>
        <span>{showPlace ? "Place and hazard" : "Hazard"}</span>
        <span>Level</span>
        <span>Open for</span>
        <span className="hidden lg:block text-right">Peak z</span>
        <span className="hidden lg:block text-right">Posts</span>
        <span>Official record</span>
      </div>
      <ol className="divide-y divide-rule">
        {alerts.map((a) => {
          const c = a.corroboration;
          return (
            <li key={a.id} data-testid={`ledger-alert-${a.id}`}>
              <Link href={`/alerts/${a.id}${scopeQuery(scope ?? (a.scenario ? { scenario: a.scenario } : null))}`} className={cn(COLS, "group px-4 py-3 hover:bg-paper focus-visible:bg-paper")} data-testid={`link-alert-${a.id}`}>
                <span className="mono text-[12px] text-ink-muted hidden md:block">{utcDateTime(a.openedAt)}</span>
                <span className="min-w-0">
                  <span className="inline-flex items-center gap-2 font-semibold text-[15px] leading-5 group-hover:underline underline-offset-2">
                    <HazardDot hazard={a.hazard} />
                    {showPlace ? a.placeName : HAZARD_LABEL[a.hazard]}
                    {showPlace && <span className="font-normal text-ink-muted">{HAZARD_LABEL[a.hazard].toLowerCase()}</span>}
                  </span>
                  <span className="block md:hidden mono text-[11px] text-ink-muted mt-0.5">{utcDateTime(a.openedAt)} · {windowText(a)}</span>
                  <span className="block md:hidden mt-1 text-[12px] leading-4"><StampGlyph state={c.state} />{c.state === "corroborated" && <span className="mono text-[11px] text-ink-muted"> · {stampLead(c, a.openedAt)}</span>}</span>
                </span>
                <span className="text-right md:text-left"><LevelBadge level={a.currentLevel} testId={`status-alert-level-${a.id}`} /> <span className="mono text-[11px] text-ink-muted whitespace-nowrap md:block md:mt-0.5" data-testid={`text-alert-level-when-${a.id}`}>{when(a)}</span></span>
                <span className="mono text-[12px] hidden md:block">{windowText(a)}</span>
                <span className="mono text-[12px] text-right hidden lg:block">{num(a.peakZ, 1)}</span>
                <span className="mono text-[12px] text-right hidden lg:block">{num(a.postCount)}</span>
                <span className="text-[12px] leading-4 hidden md:block">
                  <StampGlyph state={c.state} />
                  {c.state === "corroborated" && <span className="block mono text-[11px] text-ink-muted mt-0.5">{stampLead(c, a.openedAt)}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Official records as a ledger: the feed in a stamp box, the time, the title. */
export function OfficialLedger({ events, testId = "ledger-official" }: { events: OfficialEvent[]; testId?: string }) {
  return (
    <ol className="divide-y divide-rule" data-testid={testId}>
      {events.map((e) => (
        <li key={e.id} className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-1 px-4 py-3" data-testid={`ledger-official-${e.id}`}>
          <span className="mono text-[12px] text-ink-muted">{utcDateTime(e.startsAt)}</span>
          <div className="min-w-0 text-[14px] leading-5 break-words">
            <span className="stamp inline-block max-w-full break-words border-[1.5px] border-stamp text-stamp mono uppercase text-[10px] px-1.5 py-px mr-2 align-[1px] font-semibold">{e.feed}{e.severity ? ` ${e.severity}` : ""}</span>
            {e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="ink-link" data-testid={`link-official-${e.id}`}>{e.title}</a> : e.title}
            <span className="block text-[12px] text-ink-muted mt-0.5">{e.feedLabel}{e.country ? `, ${e.country}` : ""}{e.lat != null && e.lon != null ? <span className="mono"> · {e.lat.toFixed(2)}, {e.lon.toFixed(2)}</span> : null}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One measured figure: what it is, the value, the unit. */
export function Figure({ label, children, testId }: { label: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="min-w-0 px-4 py-3 bg-sheet">
      <dt className="text-[12px] leading-4 text-ink-muted">{label}</dt>
      <dd className="mt-1 text-[15px] leading-5" data-testid={testId}>{children}</dd>
    </div>
  );
}

/** Section heading inside an evidence page: a ruled line, the title, an optional note. */
export function Part({ id, title, note, children, className }: { id: string; title: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-h`} className={cn("mt-12 md:mt-16", className)}>
      <div className="border-t border-ink pt-4 mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={`${id}-h`} className="h3-station">{title}</h2>
        {note && <p className="text-[13px] leading-5 text-ink-muted max-w-[64ch]">{note}</p>}
      </div>
      {children}
    </section>
  );
}
