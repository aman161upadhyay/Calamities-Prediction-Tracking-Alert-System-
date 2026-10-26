import { useState } from "react";
import { useParams, useSearch, Link } from "wouter";
import { useGetHazard, useGetHazardTimeline, useListOfficialEvents, getGetHazardQueryKey, getGetHazardTimelineQueryKey, getListOfficialEventsQueryKey, type Hazard } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, HazardDot, LevelBadge, LoadingRows, PageTitle, Panel, Skel, TrendText, ExperimentalNote } from "@/components/kit";
import { EmotionMix, FearTimeline } from "@/components/charts/charts";
import { PostRow, scopeQuery } from "@/components/board/rows";
import { HAZARD_LABEL, isHazard, isNotFound, num, placeLabel, signed, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";
import NotFound from "./not-found";

const EVENT_LIST = 20;

export default function HazardPage() {
  const { hazard } = useParams<{ hazard: string }>();
  if (!isHazard(hazard)) return <NotFound />;
  return <HazardInner hazard={hazard} />;
}

function HazardInner({ hazard }: { hazard: Hazard }) {
  useTitle(`${HAZARD_LABEL[hazard]} signal`);
  const search = new URLSearchParams(useSearch());
  // From a replay, the page reads the hazard as of the playhead; live otherwise.
  const scenario = search.get("scenario");
  const asOf = search.get("asOf");
  const scope = scenario ? { scenario, asOf: asOf ?? undefined } : null;
  const params = scope ? { scenario: scope.scenario, ...(scope.asOf ? { asOf: scope.asOf } : {}) } : undefined;
  const refetchInterval = scope ? false : 60_000;
  const detail = useGetHazard(hazard, params, { query: { queryKey: [...getGetHazardQueryKey(hazard), params ?? {}], refetchInterval } });
  const tlP = { hours: 168, ...params };
  const tl = useGetHazardTimeline(hazard, tlP, { query: { queryKey: getGetHazardTimelineQueryKey(hazard, tlP) } });
  const evP = { hazard, hours: 72, limit: 50, ...params };
  const [showAllEvents, setShowAllEvents] = useState(false);
  const events = useListOfficialEvents(evP, { query: { queryKey: getListOfficialEventsQueryKey(evP) } });
  const d = detail.data;
  const color = d?.summary.color ?? "#15140F";

  if (detail.isError && isNotFound(detail.error)) return <NotFound />;

  return (
    <Page wide>
      {scope && (
        <p className="mb-3 text-[14px]" data-testid="text-hazard-scope">
          <Link href={`/replay?s=${encodeURIComponent(scope.scenario)}${scope.asOf ? `&t=${encodeURIComponent(scope.asOf)}` : ""}`} className="text-muted-foreground hover:text-foreground underline underline-offset-2" data-testid="link-back-replay">Back to the replay</Link>
          <span className="text-muted-foreground"> · read as of <span className="num">{scope.asOf ? utcDateTime(scope.asOf) : "the end of the replay"}</span>; the levels, places, posts and official events below are from that replay, not live.</span>
        </p>
      )}
      <PageTitle sub={d ? d.summary.description : undefined}>
        <span className="inline-flex items-center gap-3"><HazardDot hazard={hazard} color={color} />{HAZARD_LABEL[hazard]}</span>
      </PageTitle>
      {detail.isLoading && <LoadingRows rows={6} />}
      {detail.isError && !d && <ErrorState what={`the ${hazard} detail`} onRetry={() => detail.refetch()} />}
      {d && (
        <div className="grid gap-3">
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]" data-testid="stats-hazard">
            <div><dt className="text-muted-foreground text-[12px]">{scope ? "Highest level at the playhead" : "Highest level now"}</dt><dd><LevelBadge level={d.summary.maxLevel} /></dd></div>
            <div><dt className="text-muted-foreground text-[12px]">Fear mass, last hour</dt><dd className="num">{num(d.summary.fearIndexNow, 2)} <span className="text-muted-foreground">({signed(d.summary.fearIndexDelta24h, 2)} vs 24 h ago)</span></dd></div>
            <div><dt className="text-muted-foreground text-[12px]">Relevant posts, 24 h</dt><dd className="num">{num(d.summary.relevantLast24h)} of {num(d.summary.postsLast24h)}</dd></div>
            <div><dt className="text-muted-foreground text-[12px]">Open alerts</dt><dd className="num">{d.summary.openAlerts}</dd></div>
          </dl>
          <p className="text-[12px] text-muted-foreground">Search terms: {d.keywords.join(", ") || "none listed"}</p>

          <Panel title="Fear index, last 7 days" meta="hourly, all places combined; dashed line is the baseline median">
            <div className="px-3 pb-4">
              {tl.isLoading && <Skel className="h-[220px]" />}
              {tl.isError && <ErrorState what="the timeline" onRetry={() => tl.refetch()} />}
              {tl.data && <FearTimeline timeline={tl.data} color={color} height={220} />}
            </div>
          </Panel>

          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="Emotion mix, last 72 hours"><EmotionMix points={d.emotionMix} /></Panel>
            <Panel title="Places" meta="one row per place with a relevant post in the last 24 hours">
              {d.places.length === 0 ? (
                <EmptyState>No place has a relevant {hazard} post in the last 24 hours. <Link href="/replay" className="text-[#15140F] underline">Replay a past event</Link>.</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px] leading-5" data-testid="table-hazard-places">
                    <thead className="text-[12px] text-muted-foreground"><tr><th className="text-left font-medium px-4 py-1">Place</th><th className="text-left font-medium px-2">Level</th><th className="text-right font-medium px-2">z</th><th className="text-right font-medium px-2">Relevant, 1 h</th><th className="text-right font-medium px-2">Relevant, 24 h</th><th className="text-left font-medium px-4">Trend</th></tr></thead>
                    <tbody>
                      {[...d.places].sort((a, b) => b.zScore - a.zScore).map((p) => (
                        <tr key={p.placeId} className="border-t border-line">
                          <td className="px-4 py-2"><Link href={`/places/${p.placeId}${scopeQuery(scope)}`} className="hover:underline" data-testid={`link-place-${p.placeId}`}>{placeLabel(p.name, p.country)}</Link></td>
                          <td className="px-2"><LevelBadge level={p.level} /></td>
                          <td className="px-2 text-right num">{num(p.zScore, 1)}</td>
                          <td className="px-2 text-right num">{p.relevantPostsLastHour}</td>
                          <td className="px-2 text-right num">{p.relevantPostsLast24h}</td>
                          <td className="px-4"><TrendText trend={p.trend} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
            <Panel title="Recent posts" meta="with relevance and fear scores">
              {d.recentPosts.length === 0 ? <EmptyState>No recent {hazard} posts.</EmptyState> : <ul>{d.recentPosts.map((p) => <PostRow key={p.id} post={p} color={color} full scope={scope} />)}</ul>}
            </Panel>
            <Panel title="Official events, last 72 hours" meta={scope ? "the replay's historical record" : "GDACS, USGS, NWS, NASA FIRMS"}>
              {events.isLoading && <LoadingRows rows={3} />}
              {events.isError && <ErrorState what="official events" onRetry={() => events.refetch()} />}
              {events.data && events.data.length === 0 && <EmptyState>No official {hazard} events in the last 72 hours.</EmptyState>}
              {events.data && events.data.length > 0 && (
                <ul>
                  {(showAllEvents ? events.data : events.data.slice(0, EVENT_LIST)).map((e) => (
                    <li key={e.id} className="px-4 py-2 border-t border-line first:border-t-0 text-[14px] leading-5" data-testid={`row-event-${e.id}`}>
                      <p><span className="text-official">{e.feedLabel}</span> <span className="num text-[12px] text-muted-foreground">{utcDateTime(e.startsAt)}</span></p>
                      <p>{e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:underline">{e.title}</a> : e.title} <span className="text-muted-foreground">({e.severity})</span></p>
                    </li>
                  ))}
                </ul>
              )}
              {events.data && events.data.length > EVENT_LIST && (
                <div className="px-4 py-3 border-t border-line">
                  <button type="button" className="text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => setShowAllEvents((v) => !v)} data-testid="button-toggle-events">
                    {showAllEvents ? `Show the first ${EVENT_LIST} only` : `Show all ${events.data.length} events`}
                  </button>
                </div>
              )}
            </Panel>
          </div>
          <ExperimentalNote />
        </div>
      )}
    </Page>
  );
}
