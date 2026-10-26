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

/** Wordmark glyph: a pen trace breaking from its baseline, with one ink tick. */
function Mark() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden className="shrink-0">
      <rect x="0.75" y="0.75" width="28.5" height="20.5" fill="#FCFBF8" stroke="#15140F" strokeWidth="1.5" />
      <line x1="3" x2="27" y1="15.5" y2="15.5" stroke="#5B5A54" strokeDasharray="2 2" strokeWidth="0.8" />
      <path d="M3 15 L9 14 L12 15 L15 12 L17 4 L19 13 L22 11 L27 12" fill="none" stroke="#C8102E" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="17" x2="17" y1="2" y2="6" stroke="#15140F" strokeWidth="1" />
    </svg>
  );
}

function stateMark(s: SourceHealth["state"]) {
  if (s === "ok") return { glyph: "●", color: "#15140F" };
  if (s === "idle") return { glyph: "○", color: "#5B5A54" };
  if (s === "not_configured" || s === "budget_reached") return { glyph: "◆", color: "#875A00" };
  // Failure states are ink (the brief keeps red for fear and alert readings); the triangle and the state word carry the message.
  return { glyph: "▲", color: "#15140F" };
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
        className="press flex items-center gap-3 h-9 whitespace-nowrap shrink-0 pl-2.5 pr-3 border border-rule-strong bg-sheet text-[12px] leading-4 hover:border-ink"
      >
        {isLoading && <span className="mono text-ink-muted">Reading status</span>}
        {isError && !status && <span className="text-ink font-semibold">▲ Status unavailable</span>}
        {status && (
          <>
            <span className="inline-flex items-center gap-1.5 font-semibold" data-testid="status-live">
              {status.isStale ? <span aria-hidden className="text-ochre">◆</span> : <span aria-hidden className="text-ink">●</span>}
              <span className={status.isStale && !replay ? "text-ochre" : "text-ink"}>{replay ? "Replay" : status.isStale ? "Stale" : "Live"}</span>
            </span>
            {/* Under a replay the clock belongs to the transport or the page's scope note; the live time would disagree with it. */}
            {!replay && <span className="mono text-ink-muted hidden sm:inline" data-testid="text-status-asof">as of {utcTime(status.now)}</span>}
          </>
        )}
        <span aria-hidden className={cn("text-[9px] transition-transform duration-150", open && "rotate-180")}>▼</span>
      </button>
      {open && (
        <div id="status-sheet" className="fade-in absolute right-0 top-11 z-50 w-[min(560px,calc(100vw-24px))] bg-sheet border border-rule-strong shadow-[0_8px_24px_rgba(21,20,15,.12)]" data-testid="panel-status-sheet">
          <p className="plate-label px-3 h-8 flex items-center border-b border-rule-strong">Station status / UTC</p>
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
  return (
    <header className="border-b border-ink bg-paper sticky top-0 z-40">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 h-16 flex items-center gap-6">
        <Link href="/" data-testid="link-home" className="flex items-center gap-2.5 shrink-0">
          <Mark />
          <span className="display text-[19px] leading-none tracking-[-0.02em]">Calamity Watch</span>
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-0.5 text-[14px]">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  data-testid={`link-nav-${n.label.toLowerCase()}`}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={cn("relative px-2.5 py-2 text-ink-muted hover:text-ink", active(n.href) && "text-ink font-semibold after:absolute after:left-2.5 after:right-2.5 after:-bottom-[13px] after:h-[3px] after:bg-ink")}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <StatusPlate status={status.data} isLoading={status.isLoading} isError={status.isError} onRetry={() => status.refetch()} />
          <button type="button" ref={menuRef} className="md:hidden press size-9 flex items-center justify-center border border-rule-strong bg-sheet" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} data-testid="button-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Main" className="md:hidden border-t border-rule bg-paper">
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

export function Footer() {
  return (
    <footer className="border-t border-ink mt-[72px] md:mt-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-[56ch]">
          <p className="display text-[26px] leading-7">Experimental research system. Not an official warning source.</p>
          <p className="mt-3 text-[14px] leading-5 text-ink-muted">
            Calamity Watch is built by Aman Upadhyay. Its alerts come from public posts and statistical models and can be wrong in both directions. For warnings, follow your national meteorological service and local authorities.
          </p>
        </div>
        <div className="text-[14px] leading-6">
          <p className="plate-label text-ink-muted mb-2">Sources</p>
          <ul>
            <li>Posts: X API, Bluesky public search</li>
            <li>Official: GDACS, USGS, NWS, NASA FIRMS</li>
            <li>Weather context: Open-Meteo</li>
          </ul>
        </div>
        <div className="text-[14px] leading-6">
          <p className="plate-label text-ink-muted mb-2">Licences</p>
          <ul>
            <li>Map: OpenFreeMap, OpenMapTiles, OpenStreetMap contributors (ODbL)</li>
            <li>Type: Archivo and Martian Mono, self-hosted under the SIL OFL</li>
            <li>Land outlines: Natural Earth (public domain)</li>
            <li>
              Datasets and model cards: <Link href="/model" className="ink-link" data-testid="link-footer-model">model page</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function Page({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return <main className={cn("mx-auto px-4 md:px-8 py-10", wide ? "max-w-[1440px]" : "max-w-[1200px]")}>{children}</main>;
}
