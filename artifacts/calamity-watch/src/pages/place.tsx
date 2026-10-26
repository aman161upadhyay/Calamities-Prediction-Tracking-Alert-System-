import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueries } from "@tanstack/react-query";
import { useGetPlace, useListAlerts, getGetPlaceQueryKey, getListAlertsQueryKey, getGetHazardTimelineQueryOptions } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, ExperimentalNote, HazardTag, LevelBadge, LoadingRows, Skel, TrendText } from "@/components/kit";
import { Recorder, WindowSwitch, type RecorderLane } from "@/components/instruments/recorder";
import { PostRow } from "@/components/board/rows";
import { AlertLedger, Figure, OfficialLedger, Part, ScopeNote, useScope } from "@/components/evidence/parts";
import { HAZARD_LABEL, LEVEL_RANK, isNotFound, num, placeLabel, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";
import NotFound from "./not-found";

const WINDOWS: (24 | 72 | 168)[] = [24, 72, 168];

export default function PlacePage() {
  const { placeId } = useParams<{ placeId: string }>();
  const id = Number(placeId);
  const { scope, params, ready, atEnd, levelLabel } = useScope();
  const live = !scope;
  const q = useGetPlace(id, params, { query: { queryKey: [...getGetPlaceQueryKey(id), params], enabled: Number.isFinite(id) && ready, refetchInterval: live ? 60_000 : false } });
  const d = q.data;
  const alP = { placeId: id, limit: 50, ...params };
  const alerts = useListAlerts(alP, { query: { queryKey: getListAlertsQueryKey(alP), enabled: Number.isFinite(id) && ready } });
  const [win, setWin] = useState<24 | 72 | 168>(24);

  const hz = d ? [...d.hazards].filter((h) => h.relevantLast24h > 0 || LEVEL_RANK[h.level] >= 2).sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.relevantLast24h - a.relevantLast24h).slice(0, 4).map((h) => h.hazard) : [];
  // With nothing in the last 24 h, still draw the hazards that have alerts here.
  const alertHz = [...new Set((alerts.data ?? []).map((a) => a.hazard))];
  const laneHz = hz.length ? hz : alertHz.slice(0, 3);
  const traces = useQueries({ queries: laneHz.map((h) => ({ ...getGetHazardTimelineQueryOptions(h, { placeId: id, hours: win, ...params }), refetchInterval: live ? 60_000 : (false as const), enabled: ready })) });
  const lanes: RecorderLane[] = laneHz.map((h, i) => ({ hazard: h, label: HAZARD_LABEL[h], timeline: traces[i]?.data, failed: traces[i]?.isError }));

  useTitle(d ? placeLabel(d.place.name, d.place.country) : "Place");
  if (!Number.isFinite(id) || (q.isError && isNotFound(q.error))) return <NotFound />;

  return (
    <Page wide>
      <ScopeNote atEnd={atEnd} scope={scope} what="The signals, alerts and posts" />
      {(q.isPending || !ready) && <><Skel className="h-[92px] max-w-[700px]" /><div className="mt-8 h-[260px] bg-sheet border border-rule-strong"><LoadingRows rows={4} label="Reading the place" /></div></>}
      {q.isError && !d && <div className="bg-sheet border border-rule-strong"><ErrorState what="this place" onRetry={() => q.refetch()} /></div>}
      {d && (
        <>
          <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end">
            <h1 className="display h1-station" data-testid="text-place-name">{d.place.name}</h1>
            <dl className="border border-rule-strong grid grid-cols-2 gap-px bg-rule" data-testid="figures-place">
              <Figure label="Region">{[d.place.admin1 && !/^[A-Z0-9]{1,3}$|^\d+$/i.test(d.place.admin1.trim()) ? d.place.admin1 : null, d.place.country].filter(Boolean).join(", ") || "n/a"}</Figure>
              <Figure label="Coordinates"><span className="mono text-[13px]">{d.place.lat.toFixed(3)}, {d.place.lon.toFixed(3)}</span></Figure>
              <Figure label="Population"><span className="mono">{d.place.population ? num(d.place.population) : "not recorded"}</span></Figure>
              <Figure label="Tracking">{d.place.featured ? "Featured place" : "From the gazetteer"}</Figure>
            </dl>
          </header>

          <div className="mt-10">
            <Recorder
              lanes={lanes.length ? lanes : [{ hazard: "flood", label: "No signal" }]}
              live={live}
              loading={alerts.isPending || traces.some((t) => t.isPending)}
              label={["Recorder", "fear mass", d.place.name, `last ${win} h`, "UTC"]}
              controls={<WindowSwitch value={win} options={WINDOWS} onChange={(v) => setWin(v === 24 ? 24 : v === 168 ? 168 : 72)} />}
              testId="recorder-place"
              empty={<>No relevant posts placed at {d.place.name} in this window, so the pen rests at zero.</>}
            />
            <p className="mt-2 text-[12px] text-ink-muted">One lane per hazard with signal here in the last 24 hours. Red is fear mass per hour, dashed is the 7-day baseline, green stamps are official records.</p>
          </div>

          <Part id="levels" title="Signal by hazard" note="Each hazard against this place's own 7-day baseline, last 24 hours.">
            {d.hazards.length === 0 ? <EmptyState>No hazard posts resolved to {d.place.name} in the last 24 hours.</EmptyState> : (
              <div className="bg-sheet border border-rule-strong overflow-hidden sm:overflow-x-auto">
                <ol className="sm:hidden divide-y divide-rule" data-testid="list-place-hazards">
                  {[...d.hazards].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]).map((h) => (
                    <li key={h.hazard} className="px-4 py-2.5 min-w-0">
                      <div className="flex items-baseline justify-between gap-3"><HazardTag hazard={h.hazard} /><LevelBadge level={h.level} /></div>
                      <p className="mono text-[12px] text-ink-muted mt-0.5">z {h.zScore == null ? "n/a" : num(h.zScore, 1)} · {num(h.relevantLast24h)} relevant, 24 h</p>
                    </li>
                  ))}
                </ol>
                <table className="hidden sm:table w-full text-[14px] leading-5" data-testid="table-place-hazards">
                  <thead className="text-[12px] text-ink-muted text-left"><tr className="border-b border-rule-strong"><th className="font-normal px-4 h-8">Hazard</th><th className="font-normal px-3">Level</th><th className="font-normal px-3 text-right">z</th><th className="font-normal px-3 text-right">Relevant posts, 24 h</th><th className="font-normal px-4">Trend</th></tr></thead>
                  <tbody className="divide-y divide-rule">
                    {[...d.hazards].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]).map((h) => (
                      <tr key={h.hazard} data-testid={`row-place-hazard-${h.hazard}`}>
                        <td className="px-4 py-2.5"><HazardTag hazard={h.hazard} /></td>
                        <td className="px-3"><LevelBadge level={h.level} /></td>
                        <td className="px-3 text-right mono text-[13px]">{h.zScore == null ? "n/a" : num(h.zScore, 1)}</td>
                        <td className="px-3 text-right mono text-[13px]">{num(h.relevantLast24h)}</td>
                        <td className="px-4"><TrendText trend={h.trend} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Part>

          <Part id="alerts" title="Alerts for this place">
            <div className="bg-sheet border border-rule-strong min-h-[120px]">
              {alerts.isPending && <LoadingRows rows={3} />}
              {alerts.isError && <ErrorState what="the alerts" onRetry={() => alerts.refetch()} />}
              {alerts.data && alerts.data.length === 0 && <EmptyState>No alert has opened for {d.place.name} in this record.</EmptyState>}
              {alerts.data && alerts.data.length > 0 && <AlertLedger alerts={alerts.data} levelLabel={levelLabel} scope={scope} showPlace={false} testId="ledger-place-alerts" />}
            </div>
          </Part>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Part id="posts" title="Recent posts">
              <div className="bg-sheet border border-rule-strong">
                {d.recentPosts.length === 0 ? <EmptyState>No recent posts mention {d.place.name}.</EmptyState> : <ol className="divide-y divide-rule" data-testid="ledger-place-posts">{d.recentPosts.map((p) => <PostRow key={p.id} post={p} full scope={scope} />)}</ol>}
              </div>
            </Part>
            <div>
              <Part id="official" title="Nearby official records">
                <div className="bg-sheet border border-rule-strong">
                  {d.nearbyOfficialEvents.length === 0 ? <EmptyState>No official record near {d.place.name} in the current window.</EmptyState> : <OfficialLedger events={d.nearbyOfficialEvents} testId="ledger-place-official" />}
                </div>
              </Part>
              <Part id="weather" title="Weather context" note={d.weather ? <>{d.weather.provider}, fetched <span className="mono">{utcDateTime(d.weather.fetchedAt)}</span></> : undefined}>
                <div className="bg-sheet border border-rule-strong">
                  {d.weather ? (
                    <dl className="grid grid-cols-2 gap-px bg-rule" data-testid="list-weather">
                      <Figure label="River discharge today"><span className="mono">{d.weather.riverDischargeM3s == null ? "n/a" : `${num(d.weather.riverDischargeM3s, 1)} m³/s`}</span></Figure>
                      <Figure label="River discharge, 7-day max"><span className="mono">{d.weather.riverDischargeMax7dM3s == null ? "n/a" : `${num(d.weather.riverDischargeMax7dM3s, 1)} m³/s`}</span></Figure>
                      <Figure label="Rain, next 72 h"><span className="mono">{d.weather.precipitationNext72hMm == null ? "n/a" : `${num(d.weather.precipitationNext72hMm, 1)} mm`}</span></Figure>
                      <Figure label="Max temperature, next 72 h"><span className="mono">{d.weather.tempMaxNext72hC == null ? "n/a" : `${num(d.weather.tempMaxNext72hC, 1)} °C`}</span></Figure>
                      <Figure label="Max gust, next 72 h"><span className="mono">{d.weather.windGustMaxNext72hKmh == null ? "n/a" : `${num(d.weather.windGustMaxNext72hKmh, 0)} km/h`}</span></Figure>
                    </dl>
                  ) : <EmptyState>No weather context for this place. The Open-Meteo lookup has not run or returned nothing.</EmptyState>}
                </div>
              </Part>
              <p className="mt-6 text-[14px]"><Link href={`/subscribe?place=${d.place.id}`} className="ink-link" data-testid="link-subscribe-place">Get alerts for {d.place.name}</Link></p>
            </div>
          </div>
          <ExperimentalNote className="mt-10" />
        </>
      )}
    </Page>
  );
}
