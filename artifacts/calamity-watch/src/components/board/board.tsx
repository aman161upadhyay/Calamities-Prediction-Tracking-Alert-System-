import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  useGetBoard,
  useGetHazardTimeline,
  useListAlerts,
  useListPosts,
  getGetBoardQueryKey,
  getGetHazardTimelineQueryKey,
  getListAlertsQueryKey,
  getListPostsQueryKey,
  type Hazard,
  type HazardSummary,
  type SystemStatus,
} from "@workspace/api-client-react";
import { HAZARD_LABEL, LEVEL_RANK, num, placeLabel, signed, TREND_LABEL, utcDateTime, utcTime } from "@/lib/format";
import { EmptyState, ErrorState, ExperimentalNote, HazardDot, LevelBadge, LevelGlyph, LoadingRows, btn } from "@/components/kit";
import type { MapSelection } from "@/components/map/hazard-map";
import { StaticMap } from "@/components/map/static-map";
import { LegendPlate } from "@/components/instruments/legend";
import { Ledger, useNewIds } from "@/components/instruments/ledger";
import { PlateLabel } from "@/components/instruments/plate";
import { Recorder } from "@/components/instruments/recorder";
import { AlertRow, PostRow, scopeQuery } from "./rows";
import { cn } from "@/lib/utils";

/** MapLibre is the largest dependency in the app; it loads after the first paint, behind the paper plotting sheet. */
const HazardMap = lazy(() => import("@/components/map/hazard-map").then((m) => ({ default: m.HazardMap })));

type BoardTab = "alerts" | "feed" | "places" | "hazards";
const TABS: readonly BoardTab[] = ["alerts", "feed", "places", "hazards"];
type Mode = { scenario?: string; asOf?: string };

function NoDataHint({ replay }: { replay: boolean }) {
  if (replay) return <>Nothing has been posted yet at this point in the replay. Move the clock forward.</>;
  return (
    <>
      No scored posts in the last hour, so nothing is plotted.{" "}
      <Link href="/replay" className="ink-link text-ink" data-testid="link-empty-replay">Replay a past disaster</Link> to see the board under load.
    </>
  );
}

export function Board({ mode, poll, recorder = true }: { mode: Mode; status?: SystemStatus; poll: boolean; recorder?: boolean }) {
  const replay = !!mode.scenario;
  const params = mode.scenario ? { scenario: mode.scenario, asOf: mode.asOf } : undefined;
  const refetchInterval = poll ? 60_000 : false;

  const board = useGetBoard(params, { query: { queryKey: getGetBoardQueryKey(params), refetchInterval, placeholderData: keepPreviousData } });
  const postParams = { limit: 30, minRelevance: 0.5, ...(params ?? {}) };
  const posts = useListPosts(postParams, { query: { queryKey: getListPostsQueryKey(postParams), refetchInterval, placeholderData: keepPreviousData } });
  const alertParams = { status: "open" as const, limit: 20, ...(params ?? {}) };
  const alerts = useListAlerts(alertParams, { query: { queryKey: getListAlertsQueryKey(alertParams), refetchInterval, placeholderData: keepPreviousData } });

  const [picked, setPicked] = useState<Hazard | null>(null);
  const [sel, setSel] = useState<MapSelection | null>(null);
  const [tab, setTab] = useState<BoardTab>("alerts");
  const onTabKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const visible = TABS.filter((t) => !(t === "hazards" || t === "places") || window.innerWidth < 1024);
    const i = visible.indexOf(tab);
    let next: BoardTab | null = null;
    if (e.key === "ArrowRight") next = visible[(i + 1) % visible.length] ?? null;
    else if (e.key === "ArrowLeft") next = visible[(i - 1 + visible.length) % visible.length] ?? null;
    else if (e.key === "Home") next = visible[0] ?? null;
    else if (e.key === "End") next = visible[visible.length - 1] ?? null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    document.getElementById(`board-tab-${next}`)?.focus();
  };

  const data = board.data;
  const hazards = useMemo(() => [...(data?.hazards ?? [])].sort((a, b) => LEVEL_RANK[b.maxLevel] - LEVEL_RANK[a.maxLevel] || b.fearIndexNow - a.fearIndexNow), [data?.hazards]);
  const selected: Hazard = picked ?? hazards[0]?.hazard ?? "flood";
  const tlParams = { hours: 72, ...(params ?? {}) };
  const timeline = useGetHazardTimeline(selected, tlParams, { query: { enabled: recorder, queryKey: getGetHazardTimelineQueryKey(selected, tlParams), refetchInterval, placeholderData: keepPreviousData } });

  // A pressed hazard in the rail narrows the map and the places list to that hazard's stations; pressing it again clears.
  const allPlaces = data?.places ?? [];
  const places = useMemo(() => (picked ? allPlaces.filter((p) => p.hazard === picked) : allPlaces), [allPlaces, picked]);
  const events = data?.officialEvents ?? [];
  const fitKey = `${mode.scenario ?? "live"}-${places.length > 0 || events.length > 0}-${picked ?? "all"}`;
  const openAlerts = alerts.data ?? data?.openAlerts ?? [];
  const placesSorted = useMemo(() => [...places].sort((a, b) => b.zScore - a.zScore), [places]);
  const tabLabel = (t: BoardTab) => (t === "alerts" ? `Alerts${alerts.data ? ` ${openAlerts.length}` : ""}` : t === "feed" ? "Feed" : t === "places" ? `Places${places.length ? ` ${placesSorted.length}` : ""}` : "Hazards");
  // Measured extent of the selected tab, for the clipped ink copy below; remeasured when the row resizes or a label changes.
  const tabListRef = useRef<HTMLDivElement>(null);
  // Until the first measurement the copy is clipped away entirely, so a missed measurement never shows every tab in ink.
  const [tabClip, setTabClip] = useState<{ left: number; right: number } | null>(null);
  const labelKey = TABS.map(tabLabel).join("|");
  useLayoutEffect(() => {
    const list = tabListRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (!el || !list.clientWidth) return;
      // Fractional rects, not offsetLeft/offsetWidth: on a phone the tabs sit at half-pixel positions and integer insets spill half a pixel into the neighbour.
      const lr = list.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setTabClip({ left: Math.max(0, er.left - lr.left), right: Math.max(0, lr.right - er.right) });
    };
    measure();
    // The row and every tab are observed (a label or the loaded webfont changes a tab's width without changing the row's), and fonts.ready re-measures once the webfont is in.
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    list.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => ro.observe(b));
    let alive = true;
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [tab, labelKey]);
  const newAlerts = useNewIds(openAlerts.map((a) => a.id));
  const newPosts = useNewIds((posts.data ?? []).map((p) => p.id));

  const hazardRail = (
    <div>
      {board.isLoading && <LoadingRows rows={5} label="Reading hazards" />}
      {board.isError && !data && <ErrorState what="the board" onRetry={() => board.refetch()} />}
      {data && (
        <ul className="divide-y divide-rule" data-testid="list-hazard-rail">
          {hazards.map((h) => <HazardRailRow key={h.hazard} h={h} active={h.hazard === picked} onPick={() => setPicked((v) => (v === h.hazard ? null : h.hazard))} scope={params} />)}
        </ul>
      )}
    </div>
  );

  const alertList = (
    <div>
      {alerts.isLoading && !data && <LoadingRows rows={2} label="Reading alerts" />}
      {alerts.isError && !alerts.data && <ErrorState what="alerts" onRetry={() => alerts.refetch()} />}
      {!alerts.isLoading && openAlerts.length === 0 && (
        <EmptyState action={!replay ? <Link href="/alerts" className="ink-link text-ink text-[13px]" data-testid="link-empty-alerts">Read the closed alerts in the ledger</Link> : undefined}>
          {replay ? "No alert is open at this moment of the replay." : "No alert is open. One opens only after two consecutive hours at elevated or above; a single hour's spike shows on the map and the hazard rail, not here."}
        </EmptyState>
      )}
      {openAlerts.length > 0 && (
        <Ledger label="Open alerts" testId="ledger-alerts">
          {openAlerts.map((a) => <AlertRow key={a.id} alert={a} compact scope={params} fresh={newAlerts.has(a.id)} />)}
        </Ledger>
      )}
      <ExperimentalNote className="px-4 py-3 border-t border-rule" />
    </div>
  );

  const placeList =
    places.length === 0 ? (
      <EmptyState>{!data ? "Waiting for the board." : picked ? `No place has a relevant ${HAZARD_LABEL[picked].toLowerCase()} post in the last 24 hours.` : "No place has a relevant post in the last 24 hours."}</EmptyState>
    ) : (
      <ul className="max-h-[300px] overflow-auto divide-y divide-rule" data-testid="list-map-readout">
        {placesSorted.map((p) => (
          <li key={`${p.placeId}-${p.hazard}`}>
            <button type="button" onClick={() => setSel({ kind: "place", signal: p })} data-testid={`button-select-place-${p.placeId}-${p.hazard}`} className="w-full text-left px-4 py-2 text-[13px] leading-5 hover:bg-paper flex items-center gap-2">
              <HazardDot hazard={p.hazard} />
              <span className="truncate flex-1">{p.name} <span className="text-ink-muted">{HAZARD_LABEL[p.hazard].toLowerCase()}</span></span>
              <LevelGlyph level={p.level} />
              <span className="mono text-[11px] text-ink-muted w-12 text-right">z {num(p.zScore, 1)}</span>
            </button>
          </li>
        ))}
      </ul>
    );

  const feed = (
    <div>
      {posts.isLoading && <LoadingRows rows={5} label="Reading posts" />}
      {posts.isError && !posts.data && <ErrorState what="the signal feed" onRetry={() => posts.refetch()} />}
      {posts.data && posts.data.length === 0 && <EmptyState><NoDataHint replay={replay} /></EmptyState>}
      {posts.data && posts.data.length > 0 && (
        <Ledger label="Signal feed" testId="ledger-feed">
          {posts.data.map((p) => <PostRow key={p.id} post={p} scope={params} fresh={newPosts.has(p.id)} />)}
        </Ledger>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-8" data-testid="board">
      {data?.isStale && !replay && (
        <p className="mb-3 text-[13px] leading-5 text-ink" data-testid="text-stale">◆ Ingest is behind. Showing the board as of {utcTime(data.lastIngestAt)}.</p>
      )}
      {board.isError && data && (
        <p role="alert" className="mb-3 text-[13px] leading-5 text-ink font-semibold">
          ▲ Couldn't refresh. Showing {utcTime(data.generatedAt)}.{" "}
          <button type="button" className="ink-link text-ink" onClick={() => board.refetch()} data-testid="button-retry-board">Refresh the board</button>
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_360px]">
        <div className="hidden lg:flex flex-col gap-6 min-w-0">
          <section className="plate">
            <PlateLabel parts={["Hazards", "fear, last 60 min"]} />
            {hazardRail}
          </section>
          <section className="plate">
            <PlateLabel parts={picked ? ["Places", HAZARD_LABEL[picked].toLowerCase()] : ["Places", "by z"]} right={picked ? <button type="button" className="ink-link mono text-ink" onClick={() => { const h = picked; setPicked(null); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-testid="button-hazard-${h}"]`)?.focus()); }} data-testid="button-places-all-hazards">all hazards</button> : undefined} />
            {placeList}
          </section>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <div className="relative">
            <div className="relative border border-rule-strong bg-sheet h-[min(70vw,440px)] min-h-[300px] lg:h-[620px] overflow-hidden">
              <Suspense fallback={<StaticMap places={places} events={events} onSelect={setSel} selected={sel?.kind === "place" ? `${sel.signal.placeId}:${sel.signal.hazard}` : null} />}>
                <HazardMap places={places} events={events} onSelect={setSel} selected={sel?.kind === "place" ? `${sel.signal.placeId}:${sel.signal.hazard}` : null} fitKey={fitKey} className="absolute inset-0" />
              </Suspense>
              {data && places.length === 0 && events.length === 0 && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-[44ch] text-center text-[14px] leading-5 card p-4">
                  <NoDataHint replay={replay} />
                </div>
              )}
              {board.isLoading && <p role="status" className="absolute left-3 top-3 mono text-[11px] text-ink-muted">Plotting stations</p>}
              <div className="absolute left-3 bottom-3 hidden sm:block">{data && <LegendPlate places={places} events={events} />}</div>
              {sel && <Readout sel={sel} onClose={() => setSel(null)} scope={params} />}
            </div>
          </div>
          <p className="sm:hidden text-[12px] leading-4 text-ink-muted" data-testid="text-map-legend-compact">
            Fill is the hazard, size is relevant posts per hour, the <span className="text-pen font-semibold">ring</span> fills with fear z and is full at 3; a <span aria-hidden className="inline-block size-2.5 border border-ink align-middle" /> square marks an official event within 300 km in 72 h.
          </p>
          <div className="xl:hidden">
            {/* The tab indicator is an ink copy of the row clipped to the selected tab; the clip slides in 200 ms (none under reduced motion). */}
            <div role="tablist" aria-label="Board panels" className="relative flex border-b border-ink" onKeyDown={onTabKey} ref={tabListRef}>
              {TABS.map((t) => (
                <button
                  key={t}
                  id={`board-tab-${t}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  aria-controls="board-tabpanel"
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => setTab(t)}
                  data-testid={`tab-${t}`}
                  data-tab={t}
                  className={cn("px-3 py-2 text-[14px] font-medium text-ink-muted -mb-px border-b-[3px] border-transparent whitespace-nowrap", (t === "hazards" || t === "places") && "lg:hidden")}
                >
                  {tabLabel(t)}
                </button>
              ))}
              <div aria-hidden className="tab-ink absolute inset-x-0 top-0 bottom-0 flex pointer-events-none" style={{ clipPath: tabClip ? `inset(0 ${tabClip.right}px -3px ${tabClip.left}px)` : "inset(0 100% -3px 0)" }}>
                {TABS.map((t) => (
                  <span key={t} className={cn("px-3 py-2 text-[14px] font-medium text-ink -mb-px border-b-[3px] border-ink whitespace-nowrap", (t === "hazards" || t === "places") && "lg:hidden")}>
                    {tabLabel(t)}
                  </span>
                ))}
              </div>
            </div>
            <div id="board-tabpanel" className="border-b border-rule-strong" role="tabpanel" aria-labelledby={`board-tab-${tab}`} tabIndex={0}>
              {tab === "alerts" && alertList}
              {tab === "feed" && <div className="max-h-[520px] overflow-auto">{feed}</div>}
              {tab === "places" && placeList}
              {tab === "hazards" && hazardRail}
            </div>
          </div>
        </div>

        <div className="hidden xl:flex flex-col gap-6 min-w-0">
          <section className="plate">
            <PlateLabel parts={["Ledger", "open alerts"]} right={alerts.data ? <span className="mono">{openAlerts.length} open</span> : undefined} />
            {alertList}
          </section>
          <section className="plate flex-1 min-h-0">
            <PlateLabel parts={["Signal feed", "rel ≥ .5"]} />
            <div className="max-h-[440px] overflow-auto">{feed}</div>
          </section>
        </div>
      </div>

      {recorder && (
        <div className="mt-12" data-testid="panel-timeline">
          {hazards.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Hazard on the recorder">
              {hazards.map((h) => (
                <button key={h.hazard} type="button" onClick={() => setPicked(h.hazard)} aria-pressed={h.hazard === selected} data-testid={`button-timeline-${h.hazard}`} className={cn("press inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--r-control)] border text-[13px]", h.hazard === selected ? "border-ink bg-sheet font-semibold" : "border-rule-strong text-ink-muted hover:text-ink")}>
                  <HazardDot hazard={h.hazard} />{h.label}
                </button>
              ))}
            </div>
          )}
          {timeline.isError && !timeline.data ? (
            <ErrorState what="the trace" onRetry={() => timeline.refetch()} />
          ) : (
            <Recorder
              lanes={[{ hazard: selected, label: HAZARD_LABEL[selected], timeline: timeline.data }]}
              label={["Recorder", `${HAZARD_LABEL[selected]} fear`, "72 h", "UTC"]}
              loading={timeline.isLoading}
              live={!replay}
              laneHeight={150}
              testId="recorder-board"
              empty={<NoDataHint replay={replay} />}
            />
          )}
          {data && <p className="mt-2 text-[12px] text-ink-muted">Board as of <span className="mono">{utcDateTime(data.asOf)}</span>.</p>}
        </div>
      )}
    </div>
  );
}

function HazardRailRow({ h, active, onPick, scope }: { h: HazardSummary; active: boolean; onPick: () => void; scope?: { scenario?: string | null; asOf?: string | null } | null }) {
  const max = Math.max(0.01, ...h.sparkline);
  const d = h.sparkline.map((v, i) => `${i ? "L" : "M"}${((i / Math.max(1, h.sparkline.length - 1)) * 64).toFixed(1)},${(15 - (v / max) * 13).toFixed(1)}`).join("");
  return (
    <li className={cn("relative", active && "bg-paper")}>
      {active && <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-ink" />}
      <div className="px-4 pt-2.5 flex items-center gap-2">
        <button type="button" onClick={onPick} aria-pressed={active} data-testid={`button-hazard-${h.hazard}`} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <HazardDot hazard={h.hazard} />
          <span className={cn("text-[14px] leading-5 truncate", active && "font-semibold")}>{h.label}</span>
        </button>
        <svg width="64" height="16" aria-hidden className="shrink-0"><path d={d} fill="none" stroke="var(--cr-pen)" strokeWidth="1.2" /></svg>
      </div>
      <div className="px-4 pb-2.5 pt-1 flex items-center gap-3 text-[12px] leading-4 text-ink-muted">
        <span className="mono text-ink" title="fear mass in the last 60 minutes">{num(h.fearIndexNow, 1)}</span>
        <span className="mono" title="change against the same 60 minutes a day earlier">{signed(h.fearIndexDelta24h)}</span>
        {LEVEL_RANK[h.maxLevel] >= 2 ? <LevelBadge level={h.maxLevel} testId={`status-hazard-level-${h.hazard}`} className="text-[12px]" /> : <span className="mono">{h.relevantLast24h} rel/24h</span>}
        <Link href={`/hazards/${h.hazard}${scopeQuery(scope)}`} className="ml-auto ink-link" data-testid={`link-hazard-detail-${h.hazard}`}>Detail</Link>
      </div>
    </li>
  );
}

function Readout({ sel, onClose, scope }: { sel: MapSelection; onClose: () => void; scope?: { scenario?: string | null; asOf?: string | null } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selKey = sel.kind === "place" ? `place:${sel.signal.placeId}:${sel.signal.hazard}` : `event:${sel.event.id}`;
  useEffect(() => {
    const active = document.activeElement;
    const previous = active instanceof HTMLElement || active instanceof SVGElement ? active : null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && previous.isConnected) previous.focus();
    };
  }, [selKey]);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Map readout" className="fade-in absolute right-3 top-3 w-[min(320px,calc(100%-24px))] card text-[13px] leading-5 shadow-lg outline-none" data-testid="panel-map-readout">
      <div className="flex items-center justify-between h-8 pl-3 border-b border-rule-strong">
        <span className="plate-label">{sel.kind === "place" ? "Station readout" : "Official record"}</span>
        <button type="button" onClick={onClose} aria-label="Close readout" className="size-8 flex items-center justify-center hover:bg-paper" data-testid="button-close-readout"><X size={14} /></button>
      </div>
      <div className="p-3">
        {sel.kind === "place" ? (
          <>
            <p className="font-semibold text-[15px]">{placeLabel(sel.signal.name, sel.signal.country)}</p>
            <p className="flex items-center gap-3 mt-0.5"><span className="inline-flex items-center gap-1.5"><HazardDot hazard={sel.signal.hazard} />{HAZARD_LABEL[sel.signal.hazard]}</span><LevelBadge level={sel.signal.level} /></p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 text-[12px]">
              <dt className="text-ink-muted">z vs 7-day baseline</dt><dd className="mono text-right">{num(sel.signal.zScore, 2)}</dd>
              <dt className="text-ink-muted">relevant posts, last hour</dt><dd className="mono text-right">{sel.signal.relevantPostsLastHour}</dd>
              <dt className="text-ink-muted">relevant posts, 24 h</dt><dd className="mono text-right">{sel.signal.relevantPostsLast24h}</dd>
              <dt className="text-ink-muted">fear mass, last hour</dt><dd className="mono text-right">{num(sel.signal.fearMassLastHour, 2)}</dd>
              <dt className="text-ink-muted">trend</dt><dd className="text-right">{TREND_LABEL[sel.signal.trend]}</dd>
            </dl>
            <p className="mt-1 text-[11px] text-ink-muted">updated <span className="mono">{utcDateTime(sel.signal.updatedAt)}</span></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/places/${sel.signal.placeId}${scopeQuery(scope)}`} className={btn} data-testid="link-readout-place">Open {sel.signal.name}</Link>
              <Link href={`/hazards/${sel.signal.hazard}${scopeQuery(scope)}`} className={btn} data-testid="link-readout-hazard">{HAZARD_LABEL[sel.signal.hazard]} detail</Link>
            </div>
          </>
        ) : (
          <>
            <p><span className="inline-block border border-ink text-ink mono text-[11px] px-1.5 py-px font-medium">{sel.event.feedLabel}</span></p>
            <p className="font-semibold">{sel.event.title}</p>
            <p className="text-ink-muted">{HAZARD_LABEL[sel.event.hazard]}, severity {sel.event.severity}{sel.event.country ? `, ${sel.event.country}` : ""}</p>
            <p className="mono text-[12px] mt-1">from {utcDateTime(sel.event.startsAt)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sel.event.url && <a href={sel.event.url} target="_blank" rel="noreferrer" className={btn} data-testid="link-readout-official">Open feed record</a>}
              <Link href={`/hazards/${sel.event.hazard}${scopeQuery(scope)}`} className={btn} data-testid="link-readout-event-hazard">{HAZARD_LABEL[sel.event.hazard]} detail</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
