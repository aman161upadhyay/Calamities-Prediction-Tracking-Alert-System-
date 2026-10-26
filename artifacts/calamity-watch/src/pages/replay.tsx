import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import {
  useGetHazardTimeline,
  useGetReplayScenario,
  useListAlerts,
  useListOfficialEvents,
  useListReplayScenarios,
  usePrepareReplayScenario,
  getGetHazardTimelineQueryKey,
  getGetReplayScenarioQueryKey,
  getListAlertsQueryKey,
  getListOfficialEventsQueryKey,
  getListReplayScenariosQueryKey,
  type ReplayScenario,
} from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { Board } from "@/components/board/board";
import { scopeQuery } from "@/components/board/rows";
import { EmptyState, ErrorState, HazardDot, LoadingRows, btn, btnPrimary } from "@/components/kit";
import { Plate, PlateLabel } from "@/components/instruments/plate";
import { Recorder } from "@/components/instruments/recorder";
import { AlertLedger, OfficialLedger } from "@/components/evidence/parts";
import { HAZARD_LABEL, errorMessage, leadText, num, officialTime, prepEstimate, utcDate, utcDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTitle } from "./home";

const STEP_MS = 15 * 60_000; // board is re-queried every 15 event-minutes
const HOUR = 3_600_000;
const SPEEDS = [
  { id: "1", label: "1 h / 2 s", hoursPer2s: 1 },
  { id: "3", label: "3 h / 2 s", hoursPer2s: 3 },
  { id: "6", label: "6 h / 2 s", hoursPer2s: 6 },
];

const STATE_WORD: Record<ReplayScenario["state"], string> = { ready: "Ready", preparing: "Preparing", not_prepared: "Not prepared", failed: "Preparation failed" };

export default function ReplayPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const sp = new URLSearchParams(search);
  const id = sp.get("s");
  const startAtParam = sp.get("t");
  useTitle("Replay");
  if (id) return <ScenarioRunner id={id} startAt={startAtParam} onBack={() => navigate("/replay")} />;
  return <ScenarioIndex onPick={(sid) => navigate(`/replay?s=${encodeURIComponent(sid)}`)} />;
}

function ScenarioIndex({ onPick }: { onPick: (id: string) => void }) {
  const list = useListReplayScenarios({
    query: {
      queryKey: getListReplayScenariosQueryKey(),
      refetchInterval: (q) => (q.state.data?.some((s) => s.state === "preparing") ? 2000 : false),
    },
  });
  return (
    <Page wide>
      <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end mb-10">
        <h1 className="display h1-station">The playback console</h1>
        <p className="text-ink-muted max-w-[56ch]">
          Each tape is the posts recorded during a real disaster, run again through today's classifier and detector on a clock you control. The official record sits beside it, so you can judge whether the signal moved first. On these five tapes it did not: every collection begins after the earliest official record on its tape, so every first alert opens after it too; the console prints the gap either way.
        </p>
      </header>
      {list.isLoading && <div className="bg-sheet border border-rule-strong"><LoadingRows rows={5} label="Reading the tapes" /></div>}
      {list.isError && <div className="bg-sheet border border-rule-strong"><ErrorState what="replay scenarios" onRetry={() => list.refetch()} /></div>}
      {list.data && list.data.length === 0 && <div className="bg-sheet border border-rule-strong"><EmptyState>No replay scenarios are installed on this deployment.</EmptyState></div>}
      {list.data && list.data.length > 0 && (
        <ol className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="list-scenarios">
          {list.data.map((s, i) => (
            <li key={s.id} className={"bg-sheet border border-rule-strong flex flex-col min-w-0"} data-testid={`plate-scenario-${s.id}`}>
              <PlateLabel parts={[`Tape ${String(i + 1).padStart(2, "0")}`, HAZARD_LABEL[s.hazard], String(new Date(s.startsAt).getUTCFullYear())]} right={<span className="mono" data-testid={`status-scenario-${s.id}`}>{STATE_WORD[s.state]}{s.state === "preparing" && s.progress != null ? ` ${Math.round(s.progress * 100)}%` : ""}</span>} />
              <div className="p-4 md:p-5 flex flex-col gap-3 flex-1">
                <h2 className="h3-station">{s.name}</h2>
                <p className="text-[13px] text-ink-muted inline-flex items-center gap-2 flex-wrap"><HazardDot hazard={s.hazard} />{s.region}, {s.country}<span className="mono">{s.lat.toFixed(2)}, {s.lon.toFixed(2)}</span></p>
                <dl className="grid grid-cols-2 gap-px bg-rule border border-rule text-[12px]">
                  <div className="bg-sheet px-3 py-2"><dt className="text-ink-muted">Clock</dt><dd className="mono">{utcDate(s.startsAt)} to {utcDate(s.endsAt)}</dd></div>
                  <div className="bg-sheet px-3 py-2"><dt className="text-ink-muted">Posts on tape</dt><dd className="mono" data-testid={`text-postcount-${s.id}`}>{num(s.postCount)}</dd></div>
                  <div className="bg-sheet px-3 py-2"><dt className="text-ink-muted">Alerts opened</dt><dd className="mono">{s.alertsOpened ?? "n/a"}</dd></div>
                  <div className="bg-sheet px-3 py-2"><dt className="text-ink-muted">First alert</dt><dd className="mono">{s.firstAlertAt ? utcDateTime(s.firstAlertAt) : "none"}</dd></div>
                </dl>
                <p className="text-[14px] leading-5 max-w-[68ch]">{s.description}</p>
                <p className="text-[12px] text-ink-muted">Data: {s.datasetSource}{s.state !== "ready" && ` · every post is scored once before playing, ${prepEstimate(s.postCount)}`}</p>
                {s.state === "preparing" && <Progress p={s.progress ?? 0} />}
                <div className="mt-auto pt-2">
                  <button type="button" className={s.state === "failed" ? btn : btnPrimary} onClick={() => onPick(s.id)} data-testid={`button-replay-${s.id}`}>
                    {s.state === "ready" ? `Replay ${s.name}` : s.state === "failed" ? `Open ${s.name.split(",")[0]} and retry` : `Prepare ${s.name.split(",")[0]}`}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}

function Progress({ p }: { p: number }) {
  return (
    <div className="h-2 border border-rule-strong bg-paper overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label="Preparation progress">
      <div className="h-full bg-ink origin-left transition-transform duration-500" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

function ScenarioRunner({ id, startAt, onBack }: { id: string; startAt: string | null; onBack: () => void }) {
  const qc = useQueryClient();
  const sc = useGetReplayScenario(id, {
    query: {
      queryKey: getGetReplayScenarioQueryKey(id),
      refetchInterval: (q) => (q.state.data && q.state.data.state !== "ready" && q.state.data.state !== "failed" ? 2000 : false),
    },
  });
  const prepare = usePrepareReplayScenario();
  const prepRef = useRef(prepare.mutate);
  prepRef.current = prepare.mutate;
  const asked = useRef(false);
  const s = sc.data;
  useTitle(s ? `Replay: ${s.name}` : "Replay");

  useEffect(() => {
    if (s && s.state === "not_prepared" && !asked.current) {
      asked.current = true;
      prepRef.current(
        { scenarioId: s.id },
        { onSuccess: (r) => { qc.setQueryData(getGetReplayScenarioQueryKey(id), r); qc.invalidateQueries({ queryKey: getListReplayScenariosQueryKey() }); } },
      );
    }
  }, [s, id, qc]);

  const back = <button type="button" className={cn(btn, "mt-4")} onClick={onBack} data-testid="button-back-scenarios">Choose another scenario</button>;
  if (sc.isLoading) return <Page><div className="bg-sheet border border-rule-strong"><LoadingRows rows={4} label="Loading the tape" /></div></Page>;
  if (sc.isError || !s) return <Page><div className="bg-sheet border border-rule-strong"><ErrorState what="this scenario" onRetry={() => sc.refetch()} /></div>{back}</Page>;

  if (s.state !== "ready") {
    const p = s.progress ?? 0;
    const failed = s.state === "failed" || prepare.isError;
    return (
      <Page>
        <h1 className="display h2-station mb-4">{s.name}</h1>
        <p className="text-ink-muted max-w-[68ch] mb-8">{s.description}</p>
        <Plate label={["Console", failed ? "preparation failed" : "preparing tape"]} testId="plate-prepare" className="max-w-[760px]">
          <div className="p-4 md:p-6">
            <p className="text-[13px] text-ink-muted mb-4">Every post on the tape is scored once by the classifier and the emotion model before it can play.</p>
            {failed ? (
              <div role="alert">
                <p className="font-semibold">Error: {prepare.isError ? errorMessage(prepare.error) : "the scenario could not be prepared."}</p>
                <button type="button" className={cn(btnPrimary, "mt-3")} disabled={prepare.isPending} onClick={() => prepare.mutate({ scenarioId: s.id }, { onSuccess: () => sc.refetch() })} data-testid="button-retry-prepare">{prepare.isPending ? "Requesting" : "Prepare the tape again"}</button>
              </div>
            ) : (
              <>
                <Progress p={p} />
                <p className="mt-2 text-[13px] text-ink-muted" data-testid="text-prepare-progress">
                  <span className="mono text-ink">{s.state === "not_prepared" ? "Requesting preparation" : `${Math.round(p * 100)}% of ${num(s.postCount)} posts`}</span>. {prepEstimate(s.postCount)} in all; this updates every 2 seconds.
                </p>
              </>
            )}
          </div>
        </Plate>
        {back}
      </Page>
    );
  }
  return <Player s={s} startAt={startAt} onBack={onBack} />;
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => setR(mq.matches || document.documentElement.dataset.motion === "reduce");
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  return r;
}

function Player({ s, startAt, onBack }: { s: ReplayScenario; startAt: string | null; onBack: () => void }) {
  const [, navigate] = useLocation();
  const start = useMemo(() => new Date(s.startsAt).getTime(), [s.startsAt]);
  const end = useMemo(() => new Date(s.endsAt).getTime(), [s.endsAt]);
  // Open two hours in: the board reads the last complete hour, so the first hour of a collection is always empty.
  // A link back from an alert page carries the playhead it was read at.
  const [clock, setClock] = useState(() => {
    const requested = startAt ? new Date(startAt).getTime() : Number.NaN;
    if (Number.isFinite(requested)) return Math.min(end, Math.max(start, requested));
    return Math.min(end, Math.floor(start / HOUR) * HOUR + 2 * HOUR);
  });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[0]);
  const reduce = useReducedMotion();
  // The docked transport (narrow screens) is measured, and the page pads by exactly its height.
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockPad, setDockPad] = useState(0);
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const upd = () => setDockPad(getComputedStyle(el).position === "fixed" ? Math.ceil(el.getBoundingClientRect().height) : 0);
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    window.addEventListener("resize", upd);
    return () => { ro.disconnect(); window.removeEventListener("resize", upd); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setClock((c) => {
        const n = c + (speed.hoursPer2s * HOUR) / 4; // tick every 500 ms
        if (n >= end) {
          setPlaying(false);
          return end;
        }
        return n;
      });
    }, 500);
    return () => window.clearInterval(t);
  }, [playing, speed, end]);

  const asOf = new Date(Math.floor(clock / STEP_MS) * STEP_MS).toISOString();
  const scope = { scenario: s.id, asOf };
  const totalH = Math.max(1, Math.round((end - start) / HOUR));
  const elapsedH = Math.round((clock - start) / HOUR);

  // Keep ?t= in step with the playhead while paused, so the URL can be shared and alert pages link back to it.
  const navRef = useRef(navigate);
  navRef.current = navigate;
  useEffect(() => {
    if (playing) return;
    const h = window.setTimeout(() => navRef.current(`/replay?s=${encodeURIComponent(s.id)}&t=${encodeURIComponent(asOf)}`, { replace: true }), 300);
    return () => window.clearTimeout(h);
  }, [playing, asOf, s.id]);

  const spanH = Math.ceil((end - start) / HOUR);
  // The official records are read first (the whole span plus a week before it), so the recorder can be asked for the hours before the collection that hold its earliest record.
  const offParams = { scenario: s.id, asOf: s.endsAt, hours: Math.min(2160, spanH + 24 * 7), limit: 100 };
  const official = useListOfficialEvents(offParams, { query: { queryKey: getListOfficialEventsQueryKey(offParams), staleTime: 10 * 60_000 } });
  const officialSettled = official.isSuccess || official.isError;
  const earliestOfficial = useMemo(() => (official.data ?? []).reduce<number | null>((acc, e) => { const t = +new Date(e.startsAt); return acc === null || t < acc ? t : acc; }, null), [official.data]);
  // The tape, plus the hours before the collection back to its earliest official record (at most a week), so that record sits on the tape rather than off its left edge; the API accepts up to 2160 h.
  const leadH = earliestOfficial !== null && earliestOfficial < start ? Math.min(24 * 7, Math.ceil((start - earliestOfficial) / HOUR) + 6) : 0;
  const hours = Math.min(2160, Math.max(6, spanH + 1 + leadH));
  const tlParams = { hours, scenario: s.id, asOf: s.endsAt };
  const tl = useGetHazardTimeline(s.hazard, tlParams, { query: { queryKey: getGetHazardTimelineQueryKey(s.hazard, tlParams), staleTime: 10 * 60_000, enabled: officialSettled } });

  const alertParams = { scenario: s.id, asOf, limit: 200 };
  const alerts = useListAlerts(alertParams, { query: { queryKey: getListAlertsQueryKey(alertParams), placeholderData: keepPreviousData } });
  const finalParams = { scenario: s.id, asOf: s.endsAt, limit: 200 };
  const finalAlerts = useListAlerts(finalParams, { query: { queryKey: getListAlertsQueryKey(finalParams), staleTime: 5 * 60_000 } });
  const first = useMemo(() => {
    const list = finalAlerts.data ?? [];
    // Earliest opening; when two open in the same hour, the tape's own hazard is the first alert that matters.
    return list.reduce<(typeof list)[number] | null>((acc, a) => (acc === null || a.openedAt < acc.openedAt || (a.openedAt === acc.openedAt && a.hazard === s.hazard && acc.hazard !== s.hazard) ? a : acc), null);
  }, [finalAlerts.data, s.hazard]);

  const togglePlay = () => { if (clock >= end) setClock(start); setPlaying((p) => !p); };
  const pct = ((clock - start) / Math.max(1, end - start)) * 100;

  // One chronology: key moments, the first alert, the official records.
  const chronology = useMemo(() => {
    const rows: { at: string; when: string; kind: "moment" | "alert" | "official"; label: string; sub?: string }[] = [];
    // A key moment that marks a day-dated official record inherits its precision.
    const dayDated = new Set((official.data ?? []).filter((e) => e.timePrecision === "day").map((e) => +new Date(e.startsAt)));
    s.keyMoments.forEach((k) => rows.push({ at: k.at, when: officialTime(k.at, dayDated.has(+new Date(k.at)) ? "day" : "minute"), kind: "moment", label: k.label }));
    if (s.firstAlertAt) rows.push({ at: s.firstAlertAt, when: utcDateTime(s.firstAlertAt), kind: "alert", label: "First alert opens", sub: first ? `${first.placeName}, ${HAZARD_LABEL[first.hazard].toLowerCase()}` : undefined });
    // A day-dated record is printed as a date; its nominal noon only places it on the tape.
    (official.data ?? []).forEach((e) => rows.push({ at: e.startsAt, when: officialTime(e.startsAt, e.timePrecision), kind: "official", label: e.title, sub: `${e.feedLabel}${e.severity ? `, ${e.severity}` : ""}` }));
    return rows.sort((a, b) => +new Date(a.at) - +new Date(b.at));
  }, [s.keyMoments, s.firstAlertAt, first, official.data]);

  return (
    <div style={{ paddingBottom: dockPad }}>
      <Page wide>
        <p className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
          <button type="button" className="ink-link text-ink" onClick={onBack} data-testid="button-back-scenarios">All tapes</button>
          <span className="mono text-ink-muted">Replay {s.id}</span>
          <span className="text-ink-muted">{s.region}, {s.country}</span>
        </p>
        <header className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-end">
          <h1 className="display h1-station" data-testid="text-scenario-name">{s.name}</h1>
          <p className="text-[14px] leading-5 text-ink-muted max-w-[52ch]">{s.description}</p>
        </header>
      </Page>

      {/* Transport: sticky under the header on wide screens, docked to the bottom (compact, opaque, the only shadow) on narrow ones. */}
      <div ref={dockRef} className="fixed md:sticky bottom-0 md:bottom-auto md:top-16 inset-x-0 z-30 bg-paper border-t md:border-t-0 md:border-b border-ink shadow-[0_-6px_18px_rgba(21,20,15,.14)] md:shadow-none" data-testid="panel-replay-controls">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-2 md:py-3 grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-x-3 gap-y-1 md:gap-y-2 items-center">
          <button type="button" className={cn(btnPrimary, "order-1 w-[104px] md:w-[112px]")} onClick={togglePlay} data-testid="button-play-pause" aria-label={playing ? "Pause the replay" : "Play the replay"}>
            {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
            {playing ? "Pause" : clock >= end ? "Play again" : "Play"}
          </button>
          <div className="order-4 col-span-2 md:order-2 md:col-span-1 flex items-center gap-2">
            <div role="group" aria-label="Playback speed" className="inline-flex border border-rule-strong rounded-[3px] overflow-hidden">
              {SPEEDS.map((sp) => (
                <button key={sp.id} type="button" aria-pressed={speed.id === sp.id} onClick={() => setSpeed(sp)} data-testid={`button-speed-${sp.id}`} className={cn("mono text-[11px] h-6 md:h-8 px-2 md:px-2.5", speed.id === sp.id ? "bg-ink text-paper" : "bg-sheet text-ink-muted hover:text-ink")}>
                  {sp.id} h<span className="hidden md:inline"> / 2 s</span>
                </button>
              ))}
            </div>
            <span className="md:hidden mono text-[11px] text-ink-muted">per 2 s</span>
          </div>
          <span className="hidden md:block md:order-3 invisible lg:visible text-[13px] font-semibold truncate">{s.name}</span>
          <span className="order-2 md:order-4 justify-self-end text-right">
            <span className="mono text-[14px] md:text-[17px] text-ink block leading-5" aria-live="off" data-testid="text-replay-time">{utcDateTime(asOf)}</span>
            <span className="mono text-[11px] leading-4 text-ink-muted" data-testid="text-replay-hour">hour {elapsedH} of {totalH}</span>
          </span>
          <div className="relative order-3 col-span-2 md:order-5 md:col-span-4">
            <label htmlFor="scrub" className="sr-only">Replay time</label>
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-rule-strong" />
            <div aria-hidden className={cn("absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-ink origin-left w-full", !reduce && "transition-transform duration-500 ease-linear")} style={{ transform: `scaleX(${pct / 100})` }} />
            {s.keyMoments.map((k, i) => {
              const at = ((+new Date(k.at) - start) / Math.max(1, end - start)) * 100;
              return at >= 0 && at <= 100 ? <span key={i} aria-hidden className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-ink-muted" style={{ left: `${at}%` }} /> : null;
            })}
            {s.firstAlertAt && <span aria-hidden className="absolute top-1/2 -translate-y-1/2 w-[2px] h-4 bg-pen" style={{ left: `${((+new Date(s.firstAlertAt) - start) / Math.max(1, end - start)) * 100}%` }} />}
            <input
              id="scrub"
              type="range"
              min={start}
              max={end}
              step={STEP_MS}
              value={clock}
              onChange={(e) => { setPlaying(false); setClock(Number(e.target.value)); }}
              // The pointer scrubs in 15-minute steps; the keys move in the tape's own units: an hour, a day with Page Up/Down.
              onKeyDown={(e) => {
                const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? HOUR : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -HOUR : e.key === "PageUp" ? 24 * HOUR : e.key === "PageDown" ? -24 * HOUR : 0;
                if (!delta) return;
                e.preventDefault();
                setPlaying(false);
                setClock((c) => Math.min(end, Math.max(start, Math.floor(c / HOUR) * HOUR + delta)));
              }}
              aria-valuetext={utcDateTime(asOf)}
              className="relative block w-full h-6 appearance-none bg-transparent cursor-pointer accent-[#15140F] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:bg-ink [&::-moz-range-thumb]:rounded-none"
              data-testid="input-scrub"
            />
          </div>
          <div className="hidden md:flex order-6 col-span-4 justify-between mono text-[11px] text-ink-muted"><span>{utcDateTime(s.startsAt)}</span><span><span className="inline-block w-[2px] h-2.5 bg-pen align-middle mr-1" />first alert · <span className="inline-block w-px h-2.5 bg-ink-muted align-middle mx-1" />key moment</span><span>{utcDateTime(s.endsAt)}</span></div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 mt-8">
        {tl.isError && !tl.data ? (
          <div className="bg-sheet border border-rule-strong"><ErrorState what="the scenario trace" onRetry={() => tl.refetch()} /></div>
        ) : (
          <Recorder
            lanes={[{ hazard: s.hazard, label: `${HAZARD_LABEL[s.hazard]}, all places`, timeline: tl.data }]}
            label={["Recorder", `${HAZARD_LABEL[s.hazard].toLowerCase()} fear`, "whole tape", "UTC"]}
            loading={tl.isLoading || !officialSettled}
            laneHeight={168}
            cursor={{ at: asOf, label: "playhead" }}
            testId="recorder-replay"
            empty="The tape stored no hourly trace for this hazard."
          />
        )}
        <p className="mt-2 text-[12px] text-ink-muted max-w-[100ch]">The whole tape is drawn at once{leadH > 0 ? `, with the ${leadH} hours before the collection that hold its earliest official record` : ""}; the black rule is the playhead. Red trace is fear mass per hour summed over every place, dashed is its 7-day baseline, green stamps are the scenario's official records. Hours are named by their start, so with the playhead at 11:00 the readout gives the 10:00 hour, the last complete one.</p>
      </div>

      <section aria-labelledby="board-h" className="mt-12 md:mt-16">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="border-t border-ink pt-4 mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="board-h" className="h3-station">The board at the playhead</h2>
            <p className="text-[13px] text-ink-muted">Read as of <span className="mono text-ink">{utcDateTime(asOf)}</span>, re-read every 15 tape minutes.</p>
          </div>
        </div>
        <Board mode={{ scenario: s.id, asOf }} poll={false} recorder={false} />
      </section>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8 mt-12 md:mt-16 grid gap-8 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start">
        <section aria-labelledby="opened-h">
          <div className="border-t border-ink pt-4 mb-4"><h2 id="opened-h" className="h3-station">Alerts opened so far</h2></div>
          <div className="bg-sheet border border-rule-strong">
            <PlateLabel parts={["Ledger", "alerts", "to playhead", "UTC"]} right={alerts.data ? <span className="mono" data-testid="text-alerts-sofar">{alerts.data.length}{s.alertsOpened != null ? ` of ${s.alertsOpened}` : ""}</span> : null} />
            {alerts.isLoading && <LoadingRows rows={4} label="Reading the ledger" />}
            {alerts.isError && !alerts.data && <ErrorState what="the alerts" onRetry={() => alerts.refetch()} />}
            {alerts.data && alerts.data.length === 0 && (
              <EmptyState>
                No alert has opened by <span className="mono text-ink">{utcDateTime(asOf)}</span>.{s.firstAlertAt && <> The first opens at <span className="mono text-ink">{utcDateTime(s.firstAlertAt)}</span>.</>}
              </EmptyState>
            )}
            {alerts.data && alerts.data.length > 0 && <AlertLedger alerts={alerts.data} scope={scope} />}
          </div>
          <p className="mt-3 text-[13px]"><Link href={`/alerts${scopeQuery(scope)}`} className="ink-link text-ink" data-testid="link-replay-ledger">Open this ledger with filters</Link></p>
        </section>

        <section aria-labelledby="moments-h">
          <div className="border-t border-ink pt-4 mb-4"><h2 id="moments-h" className="h3-station">Signal against the record</h2></div>
          <div className="bg-sheet border border-rule-strong">
            <PlateLabel parts={["Chronology", "UTC"]} />
            <div className="p-4 border-b border-rule text-[14px] leading-5" data-testid="text-replay-outcome">
              {s.firstAlertAt ? (
                <>
                  First alert <span className="mono">{utcDateTime(s.firstAlertAt)}</span>
                  {first && first.corroboration.state === "corroborated" ? (
                    <>: {first.placeName}, {leadText(first.corroboration, first.openedAt)}{first.corroboration.title && <> ({first.corroboration.title})</>}. </>
                  ) : first ? <>: {first.placeName}; no official record matched it. </> : ". "}
                  {first && <Link href={`/alerts/${first.id}${scopeQuery({ scenario: s.id, asOf: s.endsAt })}`} className="ink-link" data-testid="link-first-alert">Read its evidence</Link>}
                </>
              ) : (
                <>The detector opened no alert on this tape.</>
              )}
            </div>
            <ol className="relative" data-testid="list-chronology">
              {chronology.map((r, i) => {
                const passed = +new Date(r.at) <= clock;
                return (
                  <li key={i} className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[132px_minmax(0,1fr)] gap-x-3 border-t border-rule first:border-t-0">
                    <button type="button" onClick={() => { setPlaying(false); setClock(Math.min(end, Math.max(start, +new Date(r.at)))); }} className={cn("press text-left px-4 py-2.5 mono text-[11px] leading-4 hover:bg-paper", passed ? "text-ink" : "text-ink-muted")} data-testid={`button-moment-${i}`} aria-label={`Move the playhead to ${r.when}`}>
                      {r.when}
                    </button>
                    <div className="py-2.5 pr-4 text-[13px] leading-5 min-w-0 break-words">
                      {r.kind === "official" && <span className="stamp inline-block border-[1.5px] border-stamp text-stamp mono uppercase text-[10px] px-1.5 py-px mr-2 font-semibold">Official</span>}
                      {r.kind === "alert" && <span className="inline-block w-[2px] h-3 bg-pen mr-2 align-[-1px]" aria-hidden />}
                      <span className={r.kind === "alert" ? "font-semibold text-pen" : r.kind === "moment" ? "font-semibold" : ""}>{r.label}</span>
                      {r.sub && <span className="block text-[12px] text-ink-muted">{r.sub}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {official.isError && <ErrorState what="the official records" onRetry={() => official.refetch()} />}
          </div>
          <p className="mt-2 text-[12px] text-ink-muted">Click a time to move the playhead there. Hour-dated records support whole hours only, so their gap is printed as "about N h"; a record its source dates only to a day is printed as a date and sits at noon on the tape.</p>
        </section>
      </div>

      {official.data && official.data.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 md:px-8 mt-12" aria-labelledby="official-h">
          <div className="border-t border-ink pt-4 mb-4"><h2 id="official-h" className="h3-station">Official records on this tape</h2></div>
          <div className="bg-sheet border border-rule-strong"><PlateLabel parts={["Ledger", "official", "UTC"]} /><OfficialLedger events={official.data} /></div>
        </section>
      )}
    </div>
  );
}
