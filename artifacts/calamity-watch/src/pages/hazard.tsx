import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetHazard, useGetHazardTimeline, useListOfficialEvents, useListAlerts, getGetHazardQueryKey, getGetHazardTimelineQueryKey, getListOfficialEventsQueryKey, getListAlertsQueryKey, type Hazard } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, ExperimentalNote, HazardDot, LevelBadge, LoadingRows, TrendText, btn } from "@/components/kit";
import { Recorder, WindowSwitch } from "@/components/instruments/recorder";
import { PostRow, scopeQuery } from "@/components/board/rows";
import { AlertLedger, Figure, OfficialLedger, Part, ScopeNote, useScope } from "@/components/evidence/parts";
import { HAZARD_LABEL, isHazard, isNotFound, num, placeLabel, signed } from "@/lib/format";
import { useTitle } from "./home";
import NotFound from "./not-found";

const WINDOWS: (24 | 72 | 168)[] = [24, 72, 168];
const EVENT_LIST = 20;

export default function HazardPage() {
  const { hazard } = useParams<{ hazard: string }>();
  if (!isHazard(hazard)) return <NotFound />;
  return <HazardInner hazard={hazard} />;
}

function HazardInner({ hazard }: { hazard: Hazard }) {
  useTitle(`${HAZARD_LABEL[hazard]} signal`);
  const { scope, params, ready, atEnd } = useScope();
  const refetchInterval = scope ? (false as const) : 60_000;
  const detail = useGetHazard(hazard, params, { query: { queryKey: [...getGetHazardQueryKey(hazard), params], refetchInterval, enabled: ready } });
  const [win, setWin] = useState<24 | 72 | 168>(24);
  const tlP = { hours: win, ...params };
  const tl = useGetHazardTimeline(hazard, tlP, { query: { queryKey: getGetHazardTimelineQueryKey(hazard, tlP), refetchInterval, enabled: ready } });
  const evP = { hazard, hours: 168, limit: 100, ...params };
  const events = useListOfficialEvents(evP, { query: { queryKey: getListOfficialEventsQueryKey(evP), enabled: ready } });
  const alP = { hazard, limit: 50, ...params };
  const alerts = useListAlerts(alP, { query: { queryKey: getListAlertsQueryKey(alP), refetchInterval, enabled: ready } });
  const [showAll, setShowAll] = useState(false);
  const d = detail.data;
  const label = HAZARD_LABEL[hazard];

  if (detail.isError && isNotFound(detail.error)) return <NotFound />;
  const places = d ? [...d.places].sort((a, b) => b.zScore - a.zScore).slice(0, 12) : [];

  return (
    <Page wide>
      <ScopeNote atEnd={atEnd} scope={scope} what="The trace, places, alerts and official records" />
      <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end">
        <h1 className="display h1-station inline-flex items-center gap-4" data-testid="text-hazard-name"><HazardDot hazard={hazard} />{label}</h1>
        <p className="text-ink-muted max-w-[56ch]">{d ? d.summary.description : "\u00A0"}</p>
      </header>

      <dl className="mt-8 border border-rule-strong grid grid-cols-2 md:grid-cols-4 gap-px bg-rule min-h-[74px]" data-testid="figures-hazard">
        {d ? (
          <>
            <Figure label={scope ? "Highest level at the playhead" : "Highest level now"}><LevelBadge level={d.summary.maxLevel} /></Figure>
            <Figure label="Fear mass, last 60 min" testId="text-fear-now"><span className="mono">{num(d.summary.fearIndexNow, 2)}</span> <span className="text-[12px] text-ink-muted mono" title={`${signed(d.summary.fearIndexDelta24h, 2)} vs the same 60 min a day earlier`}>{signed(d.summary.fearIndexDelta24h, 2)} vs a day earlier</span></Figure>
            <Figure label="Relevant posts, 24 h" testId="text-relevant"><span className="mono">{num(d.summary.relevantLast24h)}</span> <span className="text-[12px] text-ink-muted">of {num(d.summary.postsLast24h)}</span></Figure>
            <Figure label="Open alerts" testId="text-open-alerts"><span className="mono">{d.summary.openAlerts}</span></Figure>
          </>
        ) : detail.isError ? (
          <div className="col-span-full bg-sheet"><ErrorState what={`the ${label.toLowerCase()} summary`} onRetry={() => detail.refetch()} /></div>
        ) : (
          <div className="col-span-full bg-sheet"><LoadingRows rows={1} /></div>
        )}
      </dl>

      <div className="mt-10">
        {tl.isError && !tl.data ? (
          <div className="bg-sheet border border-rule-strong"><ErrorState what="the trace" onRetry={() => tl.refetch()} /></div>
        ) : (
          <Recorder
            lanes={[{ hazard, label: `${label}, all places`, timeline: tl.data }]}
            live={!scope}
            loading={tl.isPending || !ready}
            laneHeight={150}
            label={["Recorder", "fear mass", label, `last ${win} h`, "UTC"]}
            controls={<WindowSwitch value={win} options={WINDOWS} onChange={(v) => setWin(v === 24 ? 24 : v === 72 ? 72 : 168)} />}
            testId="recorder-hazard"
            empty={<>No relevant {label.toLowerCase()} posts anywhere in this window.</>}
          />
        )}
        <p className="mt-2 text-[12px] text-ink-muted">Hourly fear mass across every place combined. Dashed is the 7-day baseline, green stamps are official {label.toLowerCase()} records.</p>
        {d && d.keywords.length > 0 && <p className="mt-1 text-[12px] text-ink-muted">Search terms: <span className="mono">{d.keywords.join(", ")}</span></p>}
      </div>

      <Part id="places" title="Places with the most signal" note="Ranked by z against each place's own baseline, last 24 hours.">
        <div className="bg-sheet border border-rule-strong min-h-[120px] overflow-hidden sm:overflow-x-auto">
          {detail.isPending && <LoadingRows rows={4} />}
          {d && places.length === 0 && <EmptyState>No place has a relevant {label.toLowerCase()} post in the last 24 hours.</EmptyState>}
          {places.length > 0 && (<>
            <ol className="sm:hidden divide-y divide-rule" data-testid="list-hazard-places">
              {places.map((p) => (
                <li key={p.placeId} className="px-4 py-2.5 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 min-w-0">
                    <Link href={`/places/${p.placeId}${scopeQuery(scope)}`} className="ink-link font-semibold min-w-0 break-words" data-testid={`link-place-narrow-${p.placeId}`}>{placeLabel(p.name, p.country)}</Link>
                    <LevelBadge level={p.level} />
                  </div>
                  <p className="mono text-[12px] text-ink-muted mt-0.5">z {num(p.zScore, 1)} · {p.relevantPostsLast24h} relevant, 24 h</p>
                </li>
              ))}
            </ol>
            <table className="hidden sm:table w-full text-[14px] leading-5" data-testid="table-hazard-places">
              <thead className="text-[12px] text-ink-muted text-left"><tr className="border-b border-rule-strong"><th className="font-normal px-4 h-8">Place</th><th className="font-normal px-3">Level</th><th className="font-normal px-3 text-right">z</th><th className="font-normal px-3 text-right hidden sm:table-cell">Relevant, 1 h</th><th className="font-normal px-3 text-right">Relevant, 24 h</th><th className="font-normal px-4 hidden md:table-cell">Trend</th></tr></thead>
              <tbody className="divide-y divide-rule">
                {places.map((p) => (
                  <tr key={p.placeId}>
                    <td className="px-4 py-2.5"><Link href={`/places/${p.placeId}${scopeQuery(scope)}`} className="ink-link font-semibold" data-testid={`link-place-${p.placeId}`}>{placeLabel(p.name, p.country)}</Link></td>
                    <td className="px-3"><LevelBadge level={p.level} /></td>
                    <td className="px-3 text-right mono text-[13px]">{num(p.zScore, 1)}</td>
                    <td className="px-3 text-right mono text-[13px] hidden sm:table-cell">{p.relevantPostsLastHour}</td>
                    <td className="px-3 text-right mono text-[13px]">{p.relevantPostsLast24h}</td>
                    <td className="px-4 hidden md:table-cell"><TrendText trend={p.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table></>
          )}
        </div>
      </Part>

      <Part id="alerts" title={`${label} alerts`}>
        <div className="bg-sheet border border-rule-strong min-h-[120px]">
          {alerts.isPending && <LoadingRows rows={3} />}
          {alerts.isError && <ErrorState what="the alerts" onRetry={() => alerts.refetch()} />}
          {alerts.data && alerts.data.length === 0 && <EmptyState>No {label.toLowerCase()} alert has opened in this record.{!scope && <> <Link href={`/alerts?hazard=${hazard}`} className="ink-link text-ink">Read the ledger</Link> to switch to a replay.</>}</EmptyState>}
          {alerts.data && alerts.data.length > 0 && <AlertLedger alerts={alerts.data} atEnd={atEnd} scope={scope} testId="ledger-hazard-alerts" />}
        </div>
      </Part>

      <Part id="official" title="Official records" note="Last 7 days of the record, newest first.">
        <div className="bg-sheet border border-rule-strong min-h-[120px]">
          {events.isPending && <LoadingRows rows={3} />}
          {events.isError && <ErrorState what="official records" onRetry={() => events.refetch()} />}
          {events.data && events.data.length === 0 && <EmptyState>No official {label.toLowerCase()} record in the last 7 days of this record.</EmptyState>}
          {events.data && events.data.length > 0 && <OfficialLedger events={showAll ? events.data : events.data.slice(0, EVENT_LIST)} testId="ledger-hazard-official" />}
          {events.data && events.data.length > EVENT_LIST && (
            <div className="px-4 py-3 border-t border-rule">
              <button type="button" className={btn} onClick={() => setShowAll((v) => !v)} data-testid="button-toggle-events">{showAll ? `Show the first ${EVENT_LIST}` : `Show all ${events.data.length} records`}</button>
            </div>
          )}
        </div>
      </Part>

      <Part id="posts" title="Recent posts">
        <div className="bg-sheet border border-rule-strong">
          {d && d.recentPosts.length === 0 && <EmptyState>No recent {label.toLowerCase()} posts.</EmptyState>}
          {d && d.recentPosts.length > 0 && <ol className="divide-y divide-rule" data-testid="ledger-hazard-posts">{d.recentPosts.slice(0, 20).map((p) => <PostRow key={p.id} post={p} full scope={scope} />)}</ol>}
          {detail.isPending && <LoadingRows rows={3} />}
        </div>
      </Part>
      <ExperimentalNote className="mt-10" />
    </Page>
  );
}
