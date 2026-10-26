import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQueries } from "@tanstack/react-query";
import {
  useGetBoard,
  useGetModelInfo,
  useGetSystemStatus,
  useListAlerts,
  useListReplayScenarios,
  getGetBoardQueryKey,
  getGetHazardTimelineQueryOptions,
  getGetSystemStatusQueryKey,
  getListAlertsQueryKey,
  type Hazard,
} from "@workspace/api-client-react";
import { StatusBar } from "@/components/board/status-bar";
import { Board } from "@/components/board/board";
import { PipelineList, ModelSummary } from "@/components/sections/model-blocks";
import { ClassifierDemo } from "@/components/sections/classifier";
import { SubscribeForm } from "@/components/sections/subscribe-form";
import { Recorder, WindowSwitch, type RecorderLane } from "@/components/instruments/recorder";
import { ErrorState, LoadingRows, TextLink, btn, btnPrimary } from "@/components/kit";
import { HAZARD_LABEL, LEVEL_RANK, utcDateTime } from "@/lib/format";

export function useTitle(t: string) {
  useEffect(() => {
    document.title = t ? `${t} · Calamity Watch` : "Calamity Watch";
  }, [t]);
}

function Section({ id, n, title, lead, children }: { id: string; n: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mx-auto max-w-[1440px] px-4 md:px-8 mt-[72px] md:mt-[120px]">
      <div className="border-t border-ink pt-6 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-end mb-8">
        <h2 id={`${id}-h`} className="display h2-station">
          <span className="mono text-[13px] font-normal tracking-normal text-ink-muted align-top mr-3">{n}</span>
          {title}
        </h2>
        {lead && <p className="text-ink-muted max-w-[64ch] lg:justify-self-end">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

const WINDOWS: (24 | 72)[] = [24, 72];

const LINEAGE = [
  { year: "2018", head: "CodeFunDo++ hackathon", body: "Tweets from four Indian cities, Azure key phrases and sentiment, a fixed threshold, results in a CSV and a small Flask page." },
  { year: "Rebuild", head: "Measured parts", body: "A trained hazard classifier and an emotion model replace generic sentiment; a per-place 7-day baseline replaces fixed thresholds." },
  { year: "2026", head: "Checked against officials", body: "Any place in the gazetteer, and every alert compared with official feeds, the lead or lag recorded and never assumed." },
];

export default function Home() {
  useTitle("");
  const status = useGetSystemStatus({ query: { queryKey: getGetSystemStatusQueryKey(), refetchInterval: 60_000 } });
  const model = useGetModelInfo();
  const board = useGetBoard(undefined, { query: { queryKey: getGetBoardQueryKey(undefined), refetchInterval: 60_000 } });
  const latestParams = { limit: 1 };
  const latest = useListAlerts(latestParams, { query: { queryKey: getListAlertsQueryKey(latestParams) } });
  const scenarios = useListReplayScenarios();
  const kerala = scenarios.data?.find((s) => /kerala/i.test(s.name) || /kerala/i.test(s.region));

  const laneHazards: Hazard[] = useMemo(() => {
    const d = board.data;
    if (!d) return [];
    const withAlerts = [...new Set(d.openAlerts.map((a) => a.hazard))];
    if (withAlerts.length) return withAlerts.slice(0, 4);
    return [...d.hazards].sort((a, b) => LEVEL_RANK[b.maxLevel] - LEVEL_RANK[a.maxLevel] || b.fearIndexNow - a.fearIndexNow).slice(0, 3).map((h) => h.hazard);
  }, [board.data]);

  const [win, setWin] = useState<24 | 72>(24);
  const traces = useQueries({ queries: laneHazards.map((h) => ({ ...getGetHazardTimelineQueryOptions(h, { hours: win }), refetchInterval: 60_000 })) });
  const lanes: RecorderLane[] = laneHazards.map((h, i) => ({ hazard: h, label: HAZARD_LABEL[h], timeline: traces[i]?.data, failed: traces[i]?.isError }));
  const hasOpen = (board.data?.openAlerts.length ?? 0) > 0;
  const latestAlert = latest.data?.[0];

  return (
    <>
      <StatusBar status={status.data} isLoading={status.isLoading} isError={status.isError} onRetry={() => status.refetch()} />

      <section className="mx-auto max-w-[1440px] px-4 md:px-8 pt-10 md:pt-16" aria-labelledby="hero-h">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,9fr)_minmax(0,3fr)] items-end">
          <h1 id="hero-h" className="display h1-station lg:max-w-[14ch]">Hazard warnings read from what people post, before the sirens.</h1>
          <div className="text-[15px] leading-[22px] text-ink-muted max-w-[40ch]" data-testid="text-statement">
            Public posts about floods, fires, storms and quakes, scored for relevance and fear, plotted against each place's own 7-day baseline. Official records stamp what they confirm. <a href="#how" className="ink-link text-ink" data-testid="link-how">How it works</a>
          </div>
        </div>

        <div className="mt-10">
          {board.isError && !board.data ? (
            <div className="bg-sheet border border-rule-strong"><ErrorState what="the recorder" onRetry={() => board.refetch()} /></div>
          ) : (
            <Recorder
              lanes={lanes.length ? lanes : [{ hazard: "flood", label: "Flood" }]}
              live
              loading={board.isLoading || traces.some((t) => t.isLoading)}
              label={["Recorder", "fear index", `last ${win} h`, "UTC"]}
              controls={<WindowSwitch value={win} options={WINDOWS} onChange={(v) => setWin(v === 72 ? 72 : 24)} />}
              testId="recorder-hero"
              empty={<>No relevant posts in the last {win} hours, so the pen rests at zero. <Link href={kerala ? `/replay?s=${kerala.id}` : "/replay"} className="ink-link text-ink">Replay a past flood</Link> to see a trace under load.</>}
            />
          )}
          <p className="mt-2 text-[12px] text-ink-muted">
            {hasOpen ? "One lane per hazard with an open alert." : "No alert is open; showing the hazards with the most fear in the last hour."} Red is posted fear, dashed is the baseline, green stamps are official records.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {latestAlert ? (
            <Link href={`/alerts/${latestAlert.id}`} className={`${btnPrimary} h-11 text-[15px] px-5`} data-testid="link-latest-alert">Open the latest alert</Link>
          ) : (
            <a href="#board" className={`${btnPrimary} h-11 text-[15px] px-5`} data-testid="link-see-board">See the board</a>
          )}
          <Link href={kerala ? `/replay?s=${kerala.id}` : "/replay"} className={`${btn} h-11 text-[15px] px-5`} data-testid="link-replay-kerala">Replay Kerala floods 2018</Link>
          {latestAlert && <span className="text-[13px] text-ink-muted">{latestAlert.placeName}, {HAZARD_LABEL[latestAlert.hazard].toLowerCase()}, opened <span className="mono">{utcDateTime(latestAlert.openedAt)}</span></span>}
        </div>
      </section>

      <section id="board" aria-labelledby="board-h" className="mt-[72px] md:mt-[120px]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="border-t border-ink pt-6 mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="board-h" className="display h2-station"><span className="mono text-[13px] font-normal tracking-normal text-ink-muted align-top mr-3">01</span>The board</h2>
            <p className="text-ink-muted max-w-[56ch]">Every place with a relevant post in the last 24 hours, drawn as a station plot. Pick one to read it.</p>
          </div>
        </div>
        <Board mode={{}} status={status.data} poll recorder={false} />
      </section>

      <Section id="how" n="02" title="How it works" lead="The pipeline runs every few minutes and the official feeds are read alongside it.">
        {status.isLoading && <LoadingRows rows={3} />}
        {status.isError && !status.data && <ErrorState what="pipeline counts" onRetry={() => status.refetch()} />}
        {status.data && <PipelineList stages={status.data.pipeline} asOf={utcDateTime(status.data.now)} />}
      </Section>

      <Section id="model" n="03" title="The models" lead={<>A trained hazard classifier decides whether a post is about a hazard and which; a pretrained emotion model scores fear. The full calibration certificate is on the <TextLink href="/model" testId="link-model-page">model page</TextLink>.</>}>
        <div className="bg-sheet border border-rule-strong">
          <p className="plate-label px-4 h-8 flex items-center border-b border-rule-strong">Calibration / held-out and cross-dataset</p>
          <div className="p-4 md:p-6">
            {model.isLoading && <LoadingRows rows={3} />}
            {model.isError && <ErrorState what="model metrics" onRetry={() => model.refetch()} />}
            {model.data && <ModelSummary m={model.data} />}
          </div>
        </div>
      </Section>

      <Section id="lineage" n="04" title="From a 2018 hackathon to a measured system">
        <ol className="grid md:grid-cols-3 border-t border-rule-strong">
          {LINEAGE.map((l, i) => (
            <li key={l.year} className={`pt-4 pb-2 md:pr-8 ${i ? "md:pl-8 md:border-l border-rule-strong" : ""} border-b md:border-b-0 border-rule`}>
              <p className="mono text-[13px] text-ink-muted">{l.year}</p>
              <p className="h3-station mt-1">{l.head}</p>
              <p className="mt-2 text-[15px] leading-[22px] text-ink-muted max-w-[44ch]">{l.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4"><TextLink href="/about" testId="link-about-lineage">Read what changed and what the system is not</TextLink></p>
      </Section>

      <Section id="try" n="05" title="Try the classifier" lead="Paste a post or write one. The same models score it that score the live feed.">
        <ClassifierDemo />
      </Section>

      <Section id="subscribe" n="06" title="Get alerts by email" lead="Choose a place, a hazard and the lowest level worth an email.">
        <div className="bg-sheet border border-rule-strong p-4 md:p-6 max-w-[760px]">
          <SubscribeForm />
        </div>
      </Section>
    </>
  );
}
