import { useEffect, useMemo, useRef, useState } from "react";
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
import { HAZARD_FALLBACK_COLOR, HAZARD_LABEL, LEVEL_RANK, num, placeLabel, signed, TREND_LABEL, utcDateTime, utcTime } from "@/lib/format";
import { EmptyState, ErrorState, ExperimentalNote, HazardDot, LevelBadge, LevelGlyph, LoadingRows, Panel, Skel, btn } from "@/components/kit";
import { HazardMap, type MapSelection } from "@/components/map/hazard-map";
import { FearTimeline, Sparkline } from "@/components/charts/charts";
import { AlertRow, PostRow, scopeQuery } from "./rows";
import { cn } from "@/lib/utils";

type BoardTab = "alerts" | "feed" | "places" | "hazards";
const TABS: readonly BoardTab[] = ["alerts", "feed", "places", "hazards"];

type Mode = { scenario?: string; asOf?: string };

function NoDataHint({ status, replay }: { status?: SystemStatus; replay: boolean }) {
  if (replay) return <>Nothing has been posted yet at this point in the replay. Move the clock forward.</>;
  const src = status?.sources.map((s) => `${s.label} ${s.state.replace("_", " ")}`).join(", ");
  return (
    <>
      No scored posts in the last hour.{src ? ` ${src}.` : ""}{" "}
      <Link href="/replay" className="text-[#7FB8FF] underline underline-offset-2" data-testid="link-empty-replay">Replay a past event</Link> to see the board under load.
    </>
  );
}

export function Board({ mode, status, poll }: { mode: Mode; status?: SystemStatus; poll: boolean }) {
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
  // Arrow keys move between tabs and focus the new one; Home and End jump. Tabs hidden at the current width are
  // skipped so focus never lands on an invisible control.
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
  const colors = useMemo(() => {
    const c: Record<string, string> = { ...HAZARD_FALLBACK_COLOR };
    data?.hazards.forEach((h) => (c[h.hazard] = h.color));
    return c;
  }, [data?.hazards]);

  const hazards = useMemo(() => [...(data?.hazards ?? [])].sort((a, b) => LEVEL_RANK[b.maxLevel] - LEVEL_RANK[a.maxLevel] || b.fearIndexNow - a.fearIndexNow), [data?.hazards]);
  const selected: Hazard = picked ?? hazards[0]?.hazard ?? "flood";
  const tlParams = { hours: 72, ...(params ?? {}) };
  const timeline = useGetHazardTimeline(selected, tlParams, { query: { queryKey: getGetHazardTimelineQueryKey(selected, tlParams), refetchInterval, placeholderData: keepPreviousData } });

  const places = data?.places ?? [];
  const events = data?.officialEvents ?? [];
  const fitKey = `${mode.scenario ?? "live"}-${places.length > 0 || events.length > 0}`;
  const openAlerts = alerts.data ?? data?.openAlerts ?? [];
  const placesSorted = useMemo(() => [...places].sort((a, b) => b.zScore - a.zScore), [places]);

  const hazardRail = (
    <div>
      {board.isLoading && <LoadingRows rows={5} label="Loading hazards" />}
      {board.isError && !data && <ErrorState what="the board" onRetry={() => board.refetch()} />}
      {data && (
        <ul className="stagger">
          {hazards.map((h) => (
            <HazardRailRow key={h.hazard} h={h} active={h.hazard === selected} onPick={() => setPicked(h.hazard)} scope={params} />
          ))}
        </ul>
      )}
    </div>
  );

  const alertList = (
    <div>
      {alerts.isLoading && !data && <LoadingRows rows={2} label="Loading alerts" />}
      {alerts.isError && !alerts.data && <ErrorState what="alerts" onRetry={() => alerts.refetch()} />}
      {!alerts.isLoading && openAlerts.length === 0 && (
        <EmptyState>{replay ? "No alert is open at this moment of the replay." : "No open alerts. An alert opens only after two consecutive hours at elevated or above; a single hour's spike shows on the map and in the hazards rail, not here."}</EmptyState>
      )}
      {openAlerts.length > 0 && (
        <ul>
          {openAlerts.map((a) => <AlertRow key={a.id} alert={a} compact scope={params} />)}
        </ul>
      )}
      <ExperimentalNote className="px-4 pb-3" />
    </div>
  );

  // The same list serves the rail on wide screens and a tab on narrow ones, so the map is never the only way in.
  const placeList =
    places.length === 0 ? (
      <EmptyState>{data ? "No place has a relevant post in the last 24 hours." : "Waiting for the board."}</EmptyState>
    ) : (
      <ul className="max-h-[260px] overflow-auto pb-2" data-testid="list-map-readout">
        {placesSorted.map((p) => (
          <li key={`${p.placeId}-${p.hazard}`}>
            <button type="button" onClick={() => setSel({ kind: "place", signal: p })} data-testid={`button-select-place-${p.placeId}-${p.hazard}`} className="w-full text-left px-4 py-1.5 text-[13px] leading-5 hover:bg-surface-2 flex items-center gap-2">
              <HazardDot hazard={p.hazard} color={colors[p.hazard]} />
              <span className="truncate flex-1">
                {p.name} <span className="text-muted-foreground">{HAZARD_LABEL[p.hazard].toLowerCase()}</span>
              </span>
              <LevelGlyph level={p.level} />
              <span className="num text-muted-foreground">z {num(p.zScore, 1)}</span>
            </button>
          </li>
        ))}
      </ul>
    );

  const feed = (
    <div>
      {posts.isLoading && <LoadingRows rows={5} label="Loading posts" />}
      {posts.isError && !posts.data && <ErrorState what="the signal feed" onRetry={() => posts.refetch()} />}
      {posts.data && posts.data.length === 0 && (
        <EmptyState>
          <NoDataHint status={status} replay={replay} />
        </EmptyState>
      )}
      {posts.data && posts.data.length > 0 && (
        <ul className="stagger">
          {posts.data.map((p) => <PostRow key={p.id} post={p} color={colors[p.hazard]} scope={params} />)}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4" data-testid="board">
      {data?.isStale && !replay && (
        <p className="mb-2 text-[13px] leading-5" style={{ color: "#E8B04B" }} data-testid="text-stale">
          Ingest is behind. Showing the board as of {utcTime(data.lastIngestAt)}.
        </p>
      )}
      {board.isError && data && (
        <p role="alert" className="mb-2 text-[13px] leading-5" style={{ color: "#FF6B3D" }}>
          Couldn't refresh. Showing {utcTime(data.generatedAt)}.{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => board.refetch()} data-testid="button-retry-board">Retry</button>
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_340px]">
        <div className="hidden lg:flex flex-col gap-3 min-w-0">
          <Panel title="Hazards" meta="fear mass in the last hour, change vs 24 h earlier">{hazardRail}</Panel>
          <Panel title="Places on the map" meta="one row per place and hazard, sorted by z-score; select to read">{placeList}</Panel>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="relative border border-line bg-[#0C1424] h-[min(50vw,55vh)] min-h-[300px] lg:h-[min(640px,calc(100dvh-220px))] lg:min-h-[340px]">
            <HazardMap places={places} events={events} colors={colors} onSelect={setSel} fitKey={fitKey} className="absolute inset-0" />
            {data && places.length === 0 && events.length === 0 && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto max-w-[44ch] text-center text-[14px] leading-5 bg-surface border border-line rounded-lg p-4 pointer-events-auto">
                <NoDataHint status={status} replay={replay} />
              </div>
            )}
            {board.isLoading && <Skel className="absolute top-3 left-3 h-6 w-40" />}
            <MapLegend />
            {sel && <Readout sel={sel} onClose={() => setSel(null)} color={sel.kind === "place" ? colors[sel.signal.hazard] : "#5EEAD4"} scope={params} />}
          </div>
          <p className="sm:hidden text-[12px] leading-4 text-muted-foreground px-0.5" data-testid="text-map-legend-compact">
            size = relevant posts per hour · fill = hazard · <span className="text-fear">ring</span> = fear z-score · <span className="text-official">outline</span> = official event, 72 h
          </p>
          <div className="xl:hidden">
            <div role="tablist" aria-label="Board panels" className="flex gap-1 border-b border-line" onKeyDown={onTabKey}>
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
                  className={cn("px-3 py-2 text-[14px] -mb-px border-b-2", tab === t ? "border-[#3D9BFF] text-foreground" : "border-transparent text-muted-foreground", (t === "hazards" || t === "places") && "lg:hidden")}
                >
                  {t === "alerts" ? `Alerts${alerts.data ? ` (${openAlerts.length})` : ""}` : t === "feed" ? "Feed" : t === "places" ? `Places${places.length ? ` (${placesSorted.length})` : ""}` : "Hazards"}
                </button>
              ))}
            </div>
            <div id="board-tabpanel" className="bg-surface border border-t-0 border-line rounded-b-lg" role="tabpanel" aria-labelledby={`board-tab-${tab}`} tabIndex={0}>
              {tab === "alerts" && alertList}
              {tab === "feed" && <div className="max-h-[480px] overflow-auto">{feed}</div>}
              {tab === "places" && <div className="pt-2">{placeList}</div>}
              {tab === "hazards" && hazardRail}
            </div>
          </div>
        </div>

        <div className="hidden xl:flex flex-col gap-3 min-w-0">
          <Panel title="Open alerts" meta={alerts.data ? `${openAlerts.length} open` : undefined}>{alertList}</Panel>
          <Panel title="Signal feed" meta="relevance at least .5, newest first" className="flex-1 min-h-0">
            <div className="max-h-[520px] overflow-auto">{feed}</div>
          </Panel>
        </div>
      </div>

      <Panel
        className="mt-3"
        testId="panel-timeline"
        title={`Fear index, ${HAZARD_LABEL[selected].toLowerCase()}, last 72 hours`}
        meta={data ? `Board as of ${utcDateTime(data.asOf)}. Select a hazard to change the series.` : undefined}
      >
        <div className="px-4 pb-2 overflow-x-auto">
          <ul className="flex gap-2 min-w-max lg:min-w-0 lg:grid lg:grid-cols-8">
            {hazards.map((h) => (
              <li key={h.hazard}>
                <button
                  type="button"
                  onClick={() => setPicked(h.hazard)}
                  aria-pressed={h.hazard === selected}
                  data-testid={`button-timeline-${h.hazard}`}
                  className={cn("w-full text-left rounded-[4px] border px-2 py-1.5", h.hazard === selected ? "border-[#3a4a66] bg-surface-2" : "border-transparent hover:border-line")}
                >
                  <span className="flex items-center gap-1.5 text-[12px] leading-4"><HazardDot hazard={h.hazard} color={h.color} />{h.label}</span>
                  <Sparkline values={h.sparkline} color={h.color} label={`${h.label}, 24 h`} width={110} height={22} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-3 pb-4">
          {timeline.isLoading && <Skel className="h-[180px]" />}
          {timeline.isError && !timeline.data && <ErrorState what="the timeline" onRetry={() => timeline.refetch()} />}
          {timeline.data && <FearTimeline timeline={timeline.data} color={colors[selected]} />}
        </div>
      </Panel>
    </div>
  );
}

function HazardRailRow({ h, active, onPick, scope }: { h: HazardSummary; active: boolean; onPick: () => void; scope?: { scenario?: string | null; asOf?: string | null } | null }) {
  return (
    <li className={cn("border-t border-line first:border-t-0", active && "bg-surface-2")}>
      <div className="px-4 py-2 flex items-center gap-2">
        <button type="button" onClick={onPick} aria-pressed={active} data-testid={`button-hazard-${h.hazard}`} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <HazardDot hazard={h.hazard} color={h.color} />
          <span className="text-[14px] leading-5 truncate">{h.label}</span>
        </button>
        <span className="num text-[13px]" title="fear mass in the last hour">{num(h.fearIndexNow, 1)}</span>
        <span className="num text-[12px] text-muted-foreground w-10 text-right" title="change vs same hour yesterday">{signed(h.fearIndexDelta24h)}</span>
      </div>
      <div className="px-4 pb-2 -mt-1 flex items-center gap-2 text-[12px] leading-4 text-muted-foreground">
        {h.maxLevel !== "insufficient" && h.maxLevel !== "low" ? <LevelBadge level={h.maxLevel} testId={`status-hazard-level-${h.hazard}`} /> : <span><LevelGlyph level={h.maxLevel} /></span>}
        <span className="whitespace-nowrap"><span className="num">{h.relevantLast24h}</span> relevant / 24 h</span>
        <Link href={`/hazards/${h.hazard}${scopeQuery(scope)}`} className="ml-auto underline underline-offset-2 hover:text-foreground" data-testid={`link-hazard-detail-${h.hazard}`}>Detail</Link>
      </div>
    </li>
  );
}

function MapLegend() {
  return (
    <div className="absolute left-2 top-2 bg-[#0C1424]/90 border border-line rounded-[4px] px-2 py-1.5 text-[11px] leading-4 text-muted-foreground hidden sm:block">
      <p>size = relevant posts per hour</p>
      <p>fill = hazard · <span className="text-fear">ring</span> = fear z-score</p>
      <p><span className="text-official">outline</span> = official event, 72 h</p>
    </div>
  );
}

function Readout({ sel, onClose, color, scope }: { sel: MapSelection; onClose: () => void; color: string; scope?: { scenario?: string | null; asOf?: string | null } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selKey = sel.kind === "place" ? `place:${sel.signal.placeId}:${sel.signal.hazard}` : `event:${sel.event.id}`;
  // The readout opens from a button that stays where it was (a map dot or a row in the Places list), so focus moves into
  // the readout, Escape closes it, and focus returns to that button when it closes.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Map readout" className="absolute left-2 bottom-8 w-[min(320px,calc(100%-16px))] bg-surface-2 border border-line rounded-lg p-3 text-[13px] leading-5 shadow-[0_8px_24px_rgba(4,8,16,.5)] fade-in outline-none focus-visible:ring-2 focus-visible:ring-[#7FB8FF]" data-testid="panel-map-readout">
      <button type="button" onClick={onClose} aria-label="Close readout" className="absolute right-1.5 top-1.5 p-1.5 text-muted-foreground hover:text-foreground" data-testid="button-close-readout">
        <X size={14} />
      </button>
      {sel.kind === "place" ? (
        <>
          <p className="font-bold pr-6">{placeLabel(sel.signal.name, sel.signal.country)}</p>
          <p className="flex items-center gap-2 mt-0.5"><span className="inline-flex items-center gap-1.5"><HazardDot hazard={sel.signal.hazard} color={color} />{HAZARD_LABEL[sel.signal.hazard]}</span><LevelBadge level={sel.signal.level} /></p>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 num text-[12px]">
            <dt className="font-sans text-muted-foreground">z-score vs 7-day baseline</dt><dd className="text-right">{num(sel.signal.zScore, 2)}</dd>
            <dt className="font-sans text-muted-foreground">relevant posts, last hour</dt><dd className="text-right">{sel.signal.relevantPostsLastHour}</dd>
            <dt className="font-sans text-muted-foreground">relevant posts, last 24 h</dt><dd className="text-right">{sel.signal.relevantPostsLast24h}</dd>
            <dt className="font-sans text-muted-foreground">fear mass, last hour</dt><dd className="text-right">{num(sel.signal.fearMassLastHour, 2)}</dd>
            <dt className="font-sans text-muted-foreground">trend</dt><dd className="text-right font-sans">{TREND_LABEL[sel.signal.trend]}</dd>
          </dl>
          <p className="mt-1 text-[11px] text-muted-foreground">updated <span className="num">{utcDateTime(sel.signal.updatedAt)}</span></p>
          <div className="mt-2 flex gap-2">
            <Link href={`/places/${sel.signal.placeId}${scopeQuery(scope)}`} className={btn} data-testid="link-readout-place">Open {sel.signal.name}</Link>
            <Link href={`/hazards/${sel.signal.hazard}${scopeQuery(scope)}`} className={btn} data-testid="link-readout-hazard">{HAZARD_LABEL[sel.signal.hazard]} detail</Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-official text-[12px]">{sel.event.feedLabel}</p>
          <p className="font-bold pr-6">{sel.event.title}</p>
          <p className="text-muted-foreground">{HAZARD_LABEL[sel.event.hazard]} · severity {sel.event.severity}{sel.event.country ? ` · ${sel.event.country}` : ""}</p>
          <p className="num text-[12px] mt-1">from {utcDateTime(sel.event.startsAt)}</p>
          <div className="mt-2 flex gap-2">
            {sel.event.url && <a href={sel.event.url} target="_blank" rel="noreferrer" className={btn} data-testid="link-readout-official">Open feed record</a>}
            <Link href={`/hazards/${sel.event.hazard}${scopeQuery(scope)}`} className={btn} data-testid="link-readout-event-hazard">{HAZARD_LABEL[sel.event.hazard]} detail</Link>
          </div>
        </>
      )}
    </div>
  );
}
