import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Menu, X } from "lucide-react";
import { useGetSystemStatus, getGetSystemStatusQueryKey, type SourceHealth, type SystemStatus } from "@workspace/api-client-react";
import { SOURCE_STATE_LABEL, ago, utcTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Board" },
  { href: "/alerts", label: "Alerts" },
  { href: "/replay", label: "Replay" },
  { href: "/model", label: "Model" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/about", label: "About" },
];

function stateMark(s: SourceHealth["state"]) {
  if (s === "ok") return { glyph: "●", color: "var(--cr-ink)" };
  if (s === "idle") return { glyph: "○", color: "var(--cr-ink-muted)" };
  // Operational states are ink (the brief keeps red for fear and alert readings and ochre for the elevated level); the glyph and the state word carry the message.
  if (s === "not_configured" || s === "budget_reached") return { glyph: "◆", color: "var(--cr-ink)" };
  return { glyph: "▲", color: "var(--cr-ink)" };
}

function SourceLine({ s }: { s: SourceHealth }) {
  const m = stateMark(s.state);
  return (
    <li className="grid grid-cols-[14px_110px_1fr] gap-2 py-1.5 border-t border-rule first:border-t-0 text-[13px] leading-5" data-testid={`status-source-${s.name}`}>
      <span aria-hidden style={{ color: m.color }}>{m.glyph}</span>
      <span className="font-semibold">{s.label} <span className="font-normal" style={{ color: m.color }}>{SOURCE_STATE_LABEL[s.state]}</span></span>
      <span className="text-ink-muted">{s.detail}</span>
    </li>
  );
}

/** Live or stale, last ingest, source health; the full source sheet sits behind a disclosure. */
function StatusPlate({ status, isLoading, isError, onRetry }: { status?: SystemStatus; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  const search = useSearch();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Escape closes the sheet and returns focus to its trigger; a click or a focus move outside closes it as well.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onFocus = (e: FocusEvent) => {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);
  // A page scoped to a replay scenario (the console itself, or an evidence page opened from it) reads as "Replay", not as the live clock.
  const sp = new URLSearchParams(search);
  const replay = (loc.startsWith("/replay") && sp.has("s")) || sp.has("scenario");
  const all = status ? [...status.sources, ...status.officialFeeds] : [];
  const ok = all.filter((s) => s.state === "ok").length;
  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="status-sheet"
        data-testid="button-status-details"
        className="press flex items-center gap-3 h-9 whitespace-nowrap shrink-0 pl-2.5 pr-3 border border-rule-strong rounded-[var(--r-control)] text-[12px] leading-4 hover:border-ink"
      >
        {isLoading && <span className="mono text-ink-muted">Reading status</span>}
        {isError && !status && <span className="text-ink font-semibold">▲ Status unavailable</span>}
        {status && (
          <>
            <span className="inline-flex items-center gap-1.5 font-semibold" data-testid="status-live">
              {status.isStale ? <span aria-hidden className="text-ink">◆</span> : <span aria-hidden className="text-ink">●</span>}
              <span className="text-ink">{replay ? "Replay" : status.isStale ? "Stale" : "Live"}</span>
            </span>
            {/* Under a replay the clock belongs to the transport or the page's scope note; the live time would disagree with it. */}
            {!replay && <span className="mono text-ink-muted hidden sm:inline" data-testid="text-status-asof">as of {utcTime(status.now)}</span>}
          </>
        )}
        <span aria-hidden className={cn("text-[9px] transition-transform duration-150", open && "rotate-180")}>▼</span>
      </button>
      {open && (
        <div id="status-sheet" className="fade-in absolute right-0 top-11 z-50 w-[min(560px,calc(100vw-24px))] card rounded-[var(--r-control)] shadow-lg" data-testid="panel-status-sheet">
          <p className="plate-label px-3 h-8 flex items-center border-b border-rule">System status, UTC</p>
          {isError && !status && (
            <div className="p-3 text-[13px]">
              The status endpoint did not answer.{" "}
              <button type="button" className="ink-link" onClick={onRetry} data-testid="button-retry-status">Ask again</button>
            </div>
          )}
          {status && (
            <div className="p-3">
              <p className="text-[13px] leading-5">
                {status.isStale ? "Ingest is behind." : "Ingest is running."} <span className="mono" data-testid="text-sources-ok">{ok}/{all.length}</span> sources ok. Last ingest{" "}
                <span className="mono" data-testid="text-last-ingest">{status.lastIngestAt ? utcTime(status.lastIngestAt) : "none yet"}</span>
                {status.lastIngestAt && <> ({ago(status.lastIngestAt, new Date(status.now))})</>}. Model <span className="mono">{status.modelVersion}</span>
                {status.modelReady === false && " is still loading"}.
              </p>
              <p className="plate-label mt-3 mb-1 text-ink-muted">Post sources</p>
              <ul>{status.sources.map((s) => <SourceLine key={s.name} s={s} />)}</ul>
              <p className="plate-label mt-3 mb-1 text-ink-muted">Official and context feeds</p>
              <ul>{status.officialFeeds.map((s) => <SourceLine key={s.name} s={s} />)}</ul>
              <p className="mt-3 text-[12px] text-ink-muted">Experimental research system. Not an official warning source.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The top bar. It is not sticky: a page's own instruments keep their time basis in view, so the bar need not follow.
 * On the landing page it belongs to the night hero (the hero wordmark is the masthead, so the bar carries no second
 * wordmark there); everywhere else it is the day bar with the wordmark as the way home.
 */
export function TopNav() {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const status = useGetSystemStatus({ query: { queryKey: getGetSystemStatusQueryKey(), refetchInterval: 60_000 } });
  const active = (h: string) => (h === "/" ? loc === "/" : loc.startsWith(h));
  const home = loc === "/";
  return (
    <header className={cn("relative z-40", home ? "night" : "border-b border-rule bg-paper")} data-testid="topnav">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 h-16 flex items-center gap-8">
        {home ? (
          <span className="sr-only">Calamity Watch Post</span>
        ) : (
          <Link href="/" data-testid="link-home" className="display text-[17px] leading-none shrink-0 tracking-[-0.02em]">
            Calamity Watch Post
          </Link>
        )}
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-[14px]">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  data-testid={`link-nav-${n.label.toLowerCase()}`}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={cn("px-2.5 py-2 text-ink-muted hover:text-ink", active(n.href) && "text-ink font-semibold underline decoration-[1.5px] underline-offset-[6px]")}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <StatusPlate status={status.data} isLoading={status.isLoading} isError={status.isError} onRetry={() => status.refetch()} />
          <button type="button" ref={menuRef} className="md:hidden press size-9 flex items-center justify-center border border-rule-strong rounded-[var(--r-control)]" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} data-testid="button-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Main" className="md:hidden border-t border-rule">
          <ul className="px-4 py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} data-testid={`link-mnav-${n.label.toLowerCase()}`} aria-current={active(n.href) ? "page" : undefined} className={cn("block py-2.5 text-[16px] border-b border-rule", active(n.href) ? "font-semibold" : "text-ink-muted")}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

type Variant = "a" | "b";
function readVariant(): Variant {
  if (typeof document === "undefined") return "a";
  return document.documentElement.getAttribute("data-variant") === "b" ? "b" : "a";
}

/**
 * While two themes are under review, a small fixed control flips between them on any page. The choice is kept in
 * localStorage and mirrored into the address (?v=) so a link carries it. It goes when one theme is chosen.
 */
export function VariantSwitch() {
  const [v, setV] = useState<Variant>(readVariant);
  const pick = (next: Variant) => {
    document.documentElement.setAttribute("data-variant", next);
    try { localStorage.setItem("cwp-variant", next); } catch { /* private mode */ }
    const url = new URL(window.location.href);
    url.searchParams.set("v", next);
    window.history.replaceState(window.history.state, "", url);
    setV(next);
  };
  return (
    <div
      role="radiogroup"
      aria-label="Theme under review"
      data-testid="switch-variant"
      className="fixed bottom-3 left-3 z-50 inline-flex items-center h-8 border border-rule-strong bg-sheet text-ink mono text-[12px] leading-none rounded-[var(--r-control)] shadow-lg"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = v === "a" ? "b" : "a";
          pick(next);
          (e.currentTarget.querySelector(`[data-testid="button-variant-${next}"]`) as HTMLButtonElement | null)?.focus();
        }
      }}
    >
      <span className="pl-2.5 pr-1.5 text-ink-muted">theme</span>
      {(["a", "b"] as Variant[]).map((o) => (
        <button key={o} type="button" role="radio" aria-checked={v === o} tabIndex={v === o ? 0 : -1} onClick={() => pick(o)} data-testid={`button-variant-${o}`} className={cn("h-8 px-2.5 uppercase", v === o ? "bg-ink text-paper" : "text-ink-muted hover:text-ink")}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-rule mt-[72px] md:mt-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-10 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-[56ch]">
          <p className="text-[15px] leading-6 font-semibold">Experimental research system. Not an official warning source.</p>
          <p className="mt-2 text-[14px] leading-5 text-ink-muted">
            Calamity Watch Post is built by Aman Upadhyay. Its alerts come from public posts and statistical models and can be wrong in both directions. For warnings, follow your national meteorological service and local authorities.
          </p>
        </div>
        <div className="text-[14px] leading-6">
          <p className="text-ink-muted mb-1">Sources</p>
          <ul>
            <li>Posts: X API, Bluesky public search</li>
            <li>Official: GDACS, USGS, NWS, NASA FIRMS</li>
            <li>Weather context: Open-Meteo</li>
          </ul>
        </div>
        <div className="text-[14px] leading-6">
          <p className="text-ink-muted mb-1">Licences</p>
          <ul>
            <li>Map: OpenFreeMap, OpenMapTiles, OpenStreetMap contributors (ODbL)</li>
            <li>Type: Inter Tight and Geist Mono (theme A), Schibsted Grotesk and Fragment Mono (theme B), self-hosted under the SIL OFL</li>
            <li>Land and boundaries: Natural Earth (public domain)</li>
            <li>
              Datasets and model cards: <Link href="/model" className="ink-link" data-testid="link-footer-model">model page</Link>
            </li>
          </ul>
        </div>
      </div>
      <VariantSwitch />
    </footer>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <main className={cn("mx-auto px-4 md:px-8 py-10", wide ? "max-w-[1440px]" : "max-w-[1200px]")}>{children}</main>;
}
