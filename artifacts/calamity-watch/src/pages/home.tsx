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
import { Hero } from "@/components/hero/hero";
import { PipelineList, ModelSummary } from "@/components/sections/model-blocks";
import { ClassifierDemo } from "@/components/sections/classifier";
import { SubscribeForm } from "@/components/sections/subscribe-form";
import { Recorder, WindowSwitch, type RecorderLane } from "@/components/instruments/recorder";
import { ErrorState, LoadingRows, TextLink } from "@/components/kit";
import { HAZARD_LABEL, LEVEL_RANK, utcDateTime, utcTime } from "@/lib/format";
import { useVariant } from "@/lib/variant";

export function useTitle(t: string) {
  useEffect(() => {
    document.title = t ? `${t} · Calamity Watch Post` : "Calamity Watch Post";
  }, [t]);
}

/**
 * A home-page section. Version A separates sections with space; version B rules each one above with a dateline
 * (kicker left, UTC right), as a newspaper page would. Neither numbers its headings.
 */
export function Section({ id, title, kicker, lead, now, children, wide = true }: { id: string; title: string; kicker: string; lead?: ReactNode; now?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`mx-auto px-4 md:px-8 mt-[72px] md:mt-[120px] ${wide ? "max-w-[1440px]" : "max-w-[1200px]"}`}>
      <div className="section-head">
        <div className="dateline items-center justify-between mono text-[12px] leading-4 text-ink-muted mb-5">
          <span>{kicker}</span>
          <span>{now ? utcTime(now) : ""}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-end mb-8">
          <h2 id={`${id}-h`} className="display h2-station">{title}</h2>
          {lead && <p className="text-ink-muted max-w-[64ch] lg:justify-self-end">{lead}</p>}
        </div>
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
  const variant = useVariant();
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

  const [win, setWin] = useState<24 | 72>(72);
  const traces = useQueries({ queries: laneHazards.map((h) => ({ ...getGetHazardTimelineQueryOptions(h, { hours: win }), refetchInterval: 60_000 })) });
  const lanes: RecorderLane[] = laneHazards.map((h, i) => ({ hazard: h, label: HAZARD_LABEL[h], timeline: traces[i]?.data, failed: traces[i]?.isError }));
  const hasOpen = (board.data?.openAlerts.length ?? 0) > 0;
  const latestAlert = latest.data?.[0];
  const now = status.data?.now;

  return (
    <>
      <Hero
        variant={variant}
        kerala={kerala?.id}
        latest={latestAlert ? { id: latestAlert.id, text: `${latestAlert.placeName}, ${HAZARD_LABEL[latestAlert.hazard].toLowerCase()}, opened ${utcDateTime(latestAlert.openedAt)}` } : undefined}
      />
      <StatusBar status={status.data} isLoading={status.isLoading} isError={status.isError} onRetry={() => status.refetch()} />

      <Section
        id="recorder"
        kicker="Live · all places"
        title="Fear mass, hour by hour"
        now={now}
        lead={hasOpen ? "One lane per hazard with an open alert, summed over every place, against that hazard's own 7-day baseline." : "No alert is open, so the lanes are the hazards with the most fear in the last hour, summed over every place against each hazard's own 7-day baseline."}
      >
        {board.isError && !board.data ? (
          <div className="plate"><ErrorState what="the recorder" onRetry={() => board.refetch()} /></div>
        ) : (
          <Recorder
            lanes={lanes.length ? lanes : [{ hazard: "flood", label: "Flood" }]}
            live
            loading={board.isLoading || traces.some((t) => t.isLoading)}
            label={["Recorder", "fear mass", "all places", `last ${win} h`, "UTC"]}
            controls={<WindowSwitch value={win} options={WINDOWS} onChange={(v) => setWin(v === 72 ? 72 : 24)} />}
            testId="recorder-hero"
            empty={<>No relevant posts in the last {win} hours, so every hour sits at zero. <Link href={kerala ? `/replay?s=${kerala.id}` : "/replay"} className="ink-link text-ink">Replay a past flood</Link> to see a trace under load.</>}
          />
        )}
        <div className="mt-3 grid gap-x-8 gap-y-1 md:grid-cols-2 text-[12px] leading-[17px] text-ink-muted max-w-[1100px]" data-testid="text-recorder-caption">
          <p>
            Each dot is one hour: its height is fear mass, the sum of p_relevant × p_fear over every post scored for that hazard (a weighted sum, not the count of relevant posts), and its glow widens with it. The dashed line is the hazard's 7-day baseline for that hour.
          </p>
          <p>
            A lane's level mark is the total crossing its thresholds, not an alert: alerts open per place and are listed in the ledger below. The chips are the official feeds' records for that hazard in the window, from anywhere, shown as context; they are not matches to this trace.
          </p>
        </div>
      </Section>

      <section id="board" aria-labelledby="board-h" className="mt-[72px] md:mt-[120px]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="section-head">
            <div className="dateline items-center justify-between mono text-[12px] leading-4 text-ink-muted mb-5">
              <span>Live · by place</span>
              <span>{now ? utcTime(now) : ""}</span>
            </div>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="board-h" className="display h2-station">The board</h2>
              <p className="text-ink-muted max-w-[56ch]">Every place with a relevant post in the last 24 hours, drawn as a station plot. Pick one to read it.</p>
            </div>
          </div>
        </div>
        <Board mode={{}} status={status.data} poll recorder={false} />
      </section>

      <Section id="how" kicker="Pipeline" title="How it works" now={now} lead="The pipeline runs every few minutes and the official feeds are read alongside it.">
        {status.isLoading && <LoadingRows rows={3} />}
        {status.isError && !status.data && <ErrorState what="pipeline counts" onRetry={() => status.refetch()} />}
        {status.data && <div className="max-w-[1100px]"><PipelineList stages={status.data.pipeline} asOf={utcDateTime(status.data.now)} /></div>}
      </Section>

      <Section id="model" kicker="Calibration" title="The models" now={now} lead={<>A trained hazard classifier decides whether a post is about a hazard and which; a pretrained emotion model scores fear. The full calibration certificate is on the <TextLink href="/model" testId="link-model-page">model page</TextLink>.</>}>
        <div className="plate">
          <p className="plate-label px-4 h-8 flex items-center border-b border-rule">Calibration · held-out and cross-dataset</p>
          <div className="p-4 md:p-6">
            {model.isLoading && <LoadingRows rows={3} />}
            {model.isError && <ErrorState what="model metrics" onRetry={() => model.refetch()} />}
            {model.data && <ModelSummary m={model.data} />}
          </div>
        </div>
      </Section>

      <Section id="lineage" kicker="History" title="From a 2018 hackathon to a measured system" now={now}>
        <ol className="grid md:grid-cols-3 border-t border-rule">
          {LINEAGE.map((l, i) => (
            <li key={l.year} className={`pt-4 pb-2 md:pr-8 ${i ? "md:pl-8 md:border-l border-rule" : ""} border-b md:border-b-0 border-rule`}>
              <p className="mono text-[13px] text-ink-muted">{l.year}</p>
              <p className="h3-station mt-1">{l.head}</p>
              <p className="mt-2 text-[15px] leading-[22px] text-ink-muted max-w-[44ch]">{l.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4"><TextLink href="/about" testId="link-about-lineage">Read what changed and what the system is not</TextLink></p>
      </Section>

      <Section id="try" kicker="Interactive" title="Try the classifier" now={now} lead="Paste a post or write one. The same models score it that score the live feed.">
        <ClassifierDemo />
      </Section>

      <Section id="subscribe" kicker="Email" title="Get alerts by email" now={now} lead="Choose a place, a hazard and the lowest level worth an email.">
        <div className="plate p-4 md:p-6 max-w-[760px]">
          <SubscribeForm />
        </div>
      </Section>
    </>
  );
}
