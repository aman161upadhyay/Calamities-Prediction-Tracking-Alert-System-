import { useParams, useSearch, Link } from "wouter";
import { useGetPlace, getGetPlaceQueryKey } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, ExperimentalNote, HazardTag, LevelBadge, LoadingRows, PageTitle, Panel, TrendText } from "@/components/kit";
import { Sparkline } from "@/components/charts/charts";
import { AlertRow, PostRow } from "@/components/board/rows";
import { HAZARD_FALLBACK_COLOR, isNotFound, LEVEL_RANK, num, placeLabel, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";
import NotFound from "./not-found";

export default function PlacePage() {
  const { placeId } = useParams<{ placeId: string }>();
  const id = Number(placeId);
  const search = new URLSearchParams(useSearch());
  // From a replay, the page reads the place as of the playhead; live otherwise.
  const scenario = search.get("scenario");
  const asOf = search.get("asOf");
  const scope = scenario ? { scenario, asOf: asOf ?? undefined } : null;
  const params = scope ? { scenario: scope.scenario, ...(scope.asOf ? { asOf: scope.asOf } : {}) } : undefined;
  const q = useGetPlace(id, params, { query: { queryKey: [...getGetPlaceQueryKey(id), params ?? {}], enabled: Number.isFinite(id), refetchInterval: scope ? false : 60_000 } });
  const d = q.data;
  useTitle(d ? placeLabel(d.place.name, d.place.country) : "Place");
  if (!Number.isFinite(id) || (q.isError && isNotFound(q.error))) return <NotFound />;

  return (
    <Page wide>
      {q.isLoading && <LoadingRows rows={6} />}
      {q.isError && !d && <ErrorState what="this place" onRetry={() => q.refetch()} />}
      {d && (
        <>
          {scope && (
            <p className="mb-3 text-[14px]" data-testid="text-place-scope">
              <Link href={`/replay?s=${encodeURIComponent(scope.scenario)}${scope.asOf ? `&t=${encodeURIComponent(scope.asOf)}` : ""}`} className="text-muted-foreground hover:text-foreground underline underline-offset-2" data-testid="link-back-replay">Back to the replay</Link>
              <span className="text-muted-foreground"> · read as of <span className="num">{scope.asOf ? utcDateTime(scope.asOf) : "the end of the replay"}</span>; the signals, alerts and posts below are from that replay, not live.</span>
            </p>
          )}
          <PageTitle sub={<span className="num text-[13px]">{[d.place.admin1, d.place.country].filter(Boolean).join(", ")} · {d.place.lat.toFixed(3)}, {d.place.lon.toFixed(3)}{d.place.population ? ` · pop. ${num(d.place.population)}` : ""}</span>}>
            {d.place.name}
          </PageTitle>
          <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
            <div className="grid gap-3 content-start">
              <Panel title="Hazard levels" meta="per hazard; sparkline is hourly fear mass over the last 24 h">
                {d.hazards.length === 0 ? (
                  <EmptyState>No hazard posts resolved to {d.place.name} in the last 24 hours.</EmptyState>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px] leading-5" data-testid="table-place-hazards">
                      <thead className="text-[12px] text-muted-foreground"><tr><th className="text-left font-medium px-4 py-1">Hazard</th><th className="text-left font-medium px-2">Level</th><th className="text-right font-medium px-2">z</th><th className="text-right font-medium px-2">Relevant, 24 h</th><th className="text-left font-medium px-2">Trend</th><th className="text-left font-medium px-4">24 h</th></tr></thead>
                      <tbody>
                        {[...d.hazards].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]).map((h) => (
                          <tr key={h.hazard} className="border-t border-line">
                            <td className="px-4 py-2"><HazardTag hazard={h.hazard} /></td>
                            <td className="px-2"><LevelBadge level={h.level} /></td>
                            <td className="px-2 text-right num">{h.zScore == null ? "n/a" : num(h.zScore, 1)}</td>
                            <td className="px-2 text-right num">{h.relevantLast24h}</td>
                            <td className="px-2"><TrendText trend={h.trend} /></td>
                            <td className="px-4"><Sparkline values={h.sparkline} color={HAZARD_FALLBACK_COLOR[h.hazard]} label={`${h.hazard} at ${d.place.name}`} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <Panel title="Alerts for this place">
                {d.alerts.length === 0 ? <EmptyState>No alerts have been raised for {d.place.name}.</EmptyState> : <ul>{d.alerts.map((a) => <AlertRow key={a.id} alert={a} scope={scope} />)}</ul>}
                <ExperimentalNote className="px-4 pb-3" />
              </Panel>
              <Panel title="Recent posts">
                {d.recentPosts.length === 0 ? <EmptyState>No recent posts mention {d.place.name}.</EmptyState> : <ul>{d.recentPosts.map((p) => <PostRow key={p.id} post={p} full scope={scope} />)}</ul>}
              </Panel>
            </div>
            <div className="grid gap-3 content-start">
              <Panel title="Weather context" meta={d.weather ? `${d.weather.provider}, fetched ${utcDateTime(d.weather.fetchedAt)}` : undefined}>
                {d.weather ? (
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 pb-4 text-[14px]" data-testid="list-weather">
                    <dt className="text-muted-foreground">River discharge today</dt><dd className="num text-right">{d.weather.riverDischargeM3s == null ? "n/a" : `${num(d.weather.riverDischargeM3s, 1)} m³/s`}</dd>
                    <dt className="text-muted-foreground">River discharge, 7-day max</dt><dd className="num text-right">{d.weather.riverDischargeMax7dM3s == null ? "n/a" : `${num(d.weather.riverDischargeMax7dM3s, 1)} m³/s`}</dd>
                    <dt className="text-muted-foreground">Precipitation, next 72 h</dt><dd className="num text-right">{d.weather.precipitationNext72hMm == null ? "n/a" : `${num(d.weather.precipitationNext72hMm, 1)} mm`}</dd>
                    <dt className="text-muted-foreground">Max temperature, next 72 h</dt><dd className="num text-right">{d.weather.tempMaxNext72hC == null ? "n/a" : `${num(d.weather.tempMaxNext72hC, 1)} °C`}</dd>
                    <dt className="text-muted-foreground">Max wind gust, next 72 h</dt><dd className="num text-right">{d.weather.windGustMaxNext72hKmh == null ? "n/a" : `${num(d.weather.windGustMaxNext72hKmh, 0)} km/h`}</dd>
                  </dl>
                ) : (
                  <EmptyState>No weather context for this place right now. The Open-Meteo lookup has not run or returned nothing.</EmptyState>
                )}
              </Panel>
              <Panel title="Nearby official events">
                {d.nearbyOfficialEvents.length === 0 ? (
                  <EmptyState>No official events near {d.place.name} in the current window.</EmptyState>
                ) : (
                  <ul>
                    {d.nearbyOfficialEvents.map((e) => (
                      <li key={e.id} className="px-4 py-2 border-t border-line first:border-t-0 text-[14px] leading-5">
                        <p><span className="text-official">{e.feedLabel}</span> <span className="num text-[12px] text-muted-foreground">{utcDateTime(e.startsAt)}</span></p>
                        <p>{e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:underline">{e.title}</a> : e.title} <span className="text-muted-foreground">({e.severity})</span></p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <p className="text-[14px]"><Link href={`/subscribe?place=${d.place.id}`} className="text-[#7FB8FF] underline underline-offset-2" data-testid="link-subscribe-place">Get alerts for {d.place.name}</Link></p>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
