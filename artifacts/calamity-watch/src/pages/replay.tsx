import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Pause, Play } from "lucide-react";
import {
  useGetReplayScenario,
  useListAlerts,
  useListReplayScenarios,
  usePrepareReplayScenario,
  getGetReplayScenarioQueryKey,
  getListAlertsQueryKey,
  getListReplayScenariosQueryKey,
  type ReplayScenario,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Page } from "@/components/layout/shell";
import { Board } from "@/components/board/board";
import { StatusBar } from "@/components/board/status-bar";
import { EmptyState, ErrorState, HazardTag, LoadingRows, PageTitle, Panel, btn, btnPrimary } from "@/components/kit";
import { HAZARD_LABEL, errorMessage, leadText, num, prepEstimate, utcDate, utcDateTime } from "@/lib/format";
import { scopeQuery } from "@/components/board/rows";
import { cn } from "@/lib/utils";
import { useTitle } from "./home";

const STEP_MS = 15 * 60_000; // board is re-queried every 15 event-minutes
const SPEEDS = [
  { id: "1", label: "1 h per 2 s", hoursPer2s: 1 },
  { id: "3", label: "3 h per 2 s", hoursPer2s: 3 },
  { id: "6", label: "6 h per 2 s", hoursPer2s: 6 },
];

export default function ReplayPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const sp = new URLSearchParams(search);
  const id = sp.get("s");
  const startAtParam = sp.get("t");
  const list = useListReplayScenarios();
  useTitle("Replay");

  return (
    <>
      {!id && (
        <Page>
          <PageTitle sub="Each scenario replays the posts recorded during a real disaster through today's models and detector. Pick one; the board below runs on a simulated clock you control.">Replay a past event</PageTitle>
          {list.isLoading && <LoadingRows rows={4} />}
          {list.isError && <ErrorState what="replay scenarios" onRetry={() => list.refetch()} />}
          {list.data && list.data.length === 0 && <EmptyState>No replay scenarios are installed on this deployment.</EmptyState>}
          {list.data && list.data.length > 0 && (
            <ul className="border border-line rounded-lg bg-surface" data-testid="list-scenarios">
              {list.data.map((s) => (
                <li key={s.id} className="border-t border-line first:border-t-0 px-4 py-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-bold">{s.name}</p>
                    <p className="text-[14px] text-muted-foreground">
                      <HazardTag hazard={s.hazard} link={false} /> · {s.region}, {s.country} · {utcDate(s.startsAt)} to {utcDate(s.endsAt)} · <span className="num">{num(s.postCount)}</span> posts
                    </p>
                    <p className="mt-1 text-[14px] leading-5 max-w-[72ch]">{s.description}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">Data: {s.datasetSource}{s.state !== "ready" && ` · needs preparing first: every post is scored once, ${prepEstimate(s.postCount)}`}</p>
                  </div>
                  <button type="button" className={btnPrimary} onClick={() => navigate(`/replay?s=${encodeURIComponent(s.id)}`)} data-testid={`button-replay-${s.id}`}>
                    Replay {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Page>
      )}
      {id && <ScenarioRunner id={id} startAt={startAtParam} onBack={() => navigate("/replay")} />}
    </>
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

  if (sc.isLoading) return <Page><LoadingRows rows={4} /></Page>;
  if (sc.isError || !s) return <Page><ErrorState what="this scenario" onRetry={() => sc.refetch()} /><button type="button" className={cn(btn, "mt-3")} onClick={onBack} data-testid="button-back-scenarios">Choose another scenario</button></Page>;

  if (s.state !== "ready") {
    const p = s.progress ?? 0;
    return (
      <Page>
        <PageTitle sub={s.description}>{s.name}</PageTitle>
        <Panel title={s.state === "failed" ? "Preparation failed" : "Preparing the replay"} meta="Every post in the scenario is scored once by the classifier and the emotion model.">
          <div className="px-4 pb-4">
            {s.state === "failed" || prepare.isError ? (
              <>
                <p style={{ color: "#FF6B3D" }}>{prepare.isError ? errorMessage(prepare.error) : "The scenario could not be prepared."}</p>
                <button type="button" className={cn(btnPrimary, "mt-3")} onClick={() => prepare.mutate({ scenarioId: s.id }, { onSuccess: () => sc.refetch() })} data-testid="button-retry-prepare">Try preparing again</button>
              </>
            ) : (
              <>
                <div className="h-2 bg-surface-2 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label="Preparation progress">
                  <div className="h-full bg-[#A78BFA] origin-left transition-transform duration-500" style={{ transform: `scaleX(${p})` }} />
                </div>
                <p className="mt-2 text-[14px] text-muted-foreground" data-testid="text-prepare-progress">
                  {s.state === "not_prepared" ? "Requesting preparation" : `Scoring posts: ${Math.round(p * 100)}% of ${num(s.postCount)}`}. {prepEstimate(s.postCount)} in all; this page updates every 2 seconds.
                </p>
              </>
            )}
          </div>
        </Panel>
        <button type="button" className={cn(btn, "mt-3")} onClick={onBack} data-testid="button-back-scenarios">Choose another scenario</button>
      </Page>
    );
  }
  return <Player s={s} startAt={startAt} onBack={onBack} />;
}

function Player({ s, startAt, onBack }: { s: ReplayScenario; startAt: string | null; onBack: () => void }) {
  const start = useMemo(() => new Date(s.startsAt).getTime(), [s.startsAt]);
  const end = useMemo(() => new Date(s.endsAt).getTime(), [s.endsAt]);
  // Open two hours in: the board reads the last complete hour, so the first hour of a collection is always empty.
  // A link back from an alert page carries the playhead it was read at.
  const [clock, setClock] = useState(() => {
    const requested = startAt ? new Date(startAt).getTime() : Number.NaN;
    if (Number.isFinite(requested)) return Math.min(end, Math.max(start, requested));
    return Math.min(end, Math.floor(start / 3_600_000) * 3_600_000 + 2 * 3_600_000);
  });
  // The whole run's alerts, for the outcome line under the controls.
  const finalParams = { scenario: s.id, asOf: s.endsAt, limit: 200 };
  const finalAlerts = useListAlerts(finalParams, { query: { queryKey: getListAlertsQueryKey(finalParams), staleTime: 5 * 60_000 } });
  const first = useMemo(() => {
    const list = finalAlerts.data ?? [];
    return list.reduce<(typeof list)[number] | null>((acc, a) => (acc === null || a.openedAt < acc.openedAt ? a : acc), null);
  }, [finalAlerts.data]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[0]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setClock((c) => {
        const n = c + (speed.hoursPer2s * 3_600_000) / 4; // tick every 500 ms
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
  const totalH = Math.max(1, Math.round((end - start) / 3_600_000));
  const elapsedH = Math.round((clock - start) / 3_600_000);

  return (
    <>
      <StatusBar isLoading={false} isError={false} onRetry={() => undefined} replayLabel={`${s.name} · ${utcDateTime(asOf)} · hour ${elapsedH} of ${totalH}`} />
      <div className="mx-auto max-w-[1600px] px-4 py-4 grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[20px] leading-7">{s.name}</h1>
          <button type="button" className="text-[14px] text-muted-foreground underline underline-offset-2" onClick={onBack} data-testid="button-back-scenarios">Choose another scenario</button>
        </div>
        <div className="bg-surface border border-line rounded-lg p-3 grid gap-3" data-testid="panel-replay-controls">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary} onClick={() => { if (clock >= end) setClock(start); setPlaying((p) => !p); }} data-testid="button-play-pause">
              {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
              {playing ? "Pause" : clock >= end ? "Play again" : "Play"}
            </button>
            <div role="group" aria-label="Playback speed" className="flex gap-1">
              {SPEEDS.map((sp) => (
                <button key={sp.id} type="button" aria-pressed={speed.id === sp.id} onClick={() => setSpeed(sp)} data-testid={`button-speed-${sp.id}`} className={cn("rounded-[4px] border px-2 py-1 text-[13px]", speed.id === sp.id ? "border-[#3a4a66] bg-surface-2" : "border-line text-muted-foreground")}>
                  {sp.label}
                </button>
              ))}
            </div>
            <span className="num text-[14px] ml-auto" aria-live="off" data-testid="text-replay-time">{utcDateTime(asOf)}</span>
          </div>
          <div>
            <label htmlFor="scrub" className="sr-only">Replay time</label>
            <input
              id="scrub"
              type="range"
              min={start}
              max={end}
              step={STEP_MS}
              value={clock}
              onChange={(e) => setClock(Number(e.target.value))}
              aria-valuetext={utcDateTime(asOf)}
              className="w-full accent-[#A78BFA]"
              data-testid="input-scrub"
            />
            <div className="flex justify-between text-[12px] text-muted-foreground num"><span>{utcDateTime(s.startsAt)}</span><span>{utcDateTime(s.endsAt)}</span></div>
          </div>
          {s.keyMoments.length > 0 && (
            <div>
              <p className="text-[12px] text-muted-foreground mb-1">Jump to a key moment</p>
              <ul className="flex flex-wrap gap-1.5">
                {s.keyMoments.map((k, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => { setPlaying(false); setClock(new Date(k.at).getTime()); }} data-testid={`button-moment-${i}`} className="press rounded-[4px] border border-line px-2 py-1 text-[13px] text-left hover:border-[#3a4a66]">
                      <span className="num text-muted-foreground">{utcDateTime(k.at)}</span> {k.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.alertsOpened != null && (
            <p className="text-[12px] text-muted-foreground max-w-[90ch]" data-testid="text-replay-outcome">
              Over the full scenario the detector opened <span className="num">{s.alertsOpened}</span> {s.alertsOpened === 1 ? "alert" : "alerts"}
              {first ? (
                <>
                  . The first, {first.placeName} {HAZARD_LABEL[first.hazard].toLowerCase()}, opened <span className="num">{utcDateTime(first.openedAt)}</span>
                  {first.corroboration.state === "corroborated" ? <>, {leadText(first.corroboration, first.openedAt)}</> : <>; no official record matched it</>}
                  {". "}
                  <Link href={`/alerts/${first.id}${scopeQuery({ scenario: s.id, asOf: s.endsAt })}`} className="underline underline-offset-2 hover:text-foreground" data-testid="link-first-alert">
                    Read its evidence
                  </Link>
                  .
                </>
              ) : s.firstAlertAt ? (
                <>, the first at <span className="num">{utcDateTime(s.firstAlertAt)}</span>.</>
              ) : (
                "."
              )}
            </p>
          )}
        </div>
      </div>
      <Board mode={{ scenario: s.id, asOf }} poll={false} />
    </>
  );
}
