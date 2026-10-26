import { useParams, useSearch, Link } from "wouter";
import { useGetAlert, getGetAlertQueryKey } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, HazardTag, LevelBadge, LoadingRows, PageTitle, Panel } from "@/components/kit";
import { FearTimeline } from "@/components/charts/charts";
import { PostRow, scopeQuery } from "@/components/board/rows";
import { HAZARD_FALLBACK_COLOR, HAZARD_LABEL, isNotFound, leadText, num, utcDate, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";
import NotFound from "./not-found";

const EVENT_LABEL: Record<string, string> = { opened: "Opened", level_changed: "Level changed", corroborated: "Corroborated", closed: "Closed", notified: "Subscribers notified" };

export default function AlertPage() {
  const { alertId } = useParams<{ alertId: string }>();
  const search = new URLSearchParams(useSearch());
  // A replay link carries its scenario and playhead so the alert reads as of that moment, not its final state.
  const scenario = search.get("scenario");
  const asOf = search.get("asOf");
  const id = Number(alertId);
  const params = asOf ? { asOf } : undefined;
  const q = useGetAlert(id, params, { query: { queryKey: [...getGetAlertQueryKey(id), params ?? {}], enabled: Number.isFinite(id) } });
  const d = q.data;
  useTitle(d ? `${d.alert.placeName} ${d.alert.hazard} alert` : "Alert");
  if (!Number.isFinite(id) || (q.isError && isNotFound(q.error))) return <NotFound />;
  const backHref = scenario ? `/replay?s=${encodeURIComponent(scenario)}${asOf ? `&t=${encodeURIComponent(asOf)}` : ""}` : "/alerts";

  return (
    <Page>
      <p className="mb-3 text-[14px]">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground underline underline-offset-2" data-testid="link-back-alerts">{scenario ? "Back to the replay" : "All alerts"}</Link>
        {scenario && asOf && <span className="text-muted-foreground"> · read as of <span className="num">{utcDateTime(asOf)}</span></span>}
      </p>
      {q.isLoading && <LoadingRows rows={6} />}
      {q.isError && !d && <ErrorState what="this alert" onRetry={() => q.refetch()} />}
      {d && (() => {
        const a = d.alert;
        const c = a.corroboration;
        return (
          <>
            <PageTitle>
              {HAZARD_LABEL[a.hazard]} alert, <Link href={`/places/${a.placeId}${scopeQuery(scenario ? { scenario, asOf } : null)}`} className="hover:underline" data-testid="link-alert-place">{a.placeName}</Link>
            </PageTitle>
            <div className="border-l-2 pl-3 mb-6 text-[14px] leading-5" style={{ borderColor: "#9A6700" }} data-testid="text-alert-disclaimer">
              Experimental research signal from public posts. Not an official warning: follow your local authorities.
              {a.scenario && <> This alert comes from the replay scenario <span className="num">{a.scenario}</span>, not live data.</>}
            </div>
            <p className="max-w-[72ch] text-[16px] leading-6" data-testid="text-alert-summary">{a.summary}</p>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-[14px]">
              <div><dt className="text-[12px] text-muted-foreground">Status</dt><dd>{a.status === "open" ? "Open" : `Closed ${utcDateTime(a.closedAt)}`}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Current level</dt><dd><LevelBadge level={a.currentLevel} /></dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Peak</dt><dd><LevelBadge level={a.peakLevel} /> <span className="num">z {num(a.peakZ, 1)}</span></dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Hazard</dt><dd><HazardTag hazard={a.hazard} /></dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Opened</dt><dd className="num">{utcDateTime(a.openedAt)}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Peak at</dt><dd className="num">{utcDateTime(a.peakAt)}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Evidence posts</dt><dd className="num">{a.postCount}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Location</dt><dd className="num">{a.lat.toFixed(2)}, {a.lon.toFixed(2)}</dd></div>
            </dl>

            <Panel className="mt-6" title="Official corroboration" testId="panel-corroboration">
              <div className="px-4 pb-4 text-[14px] leading-5">
                {c.state === "corroborated" ? (
                  <>
                    <p className="text-official font-bold">
                      Corroborated by {c.feed ?? "an official feed"}
                      {c.hazardRelation === "related" && c.officialHazard && <> (a {c.officialHazard} record, not a {HAZARD_LABEL[a.hazard].toLowerCase()} one)</>}
                    </p>
                    <p className="mt-1">
                      {c.title}
                      {c.officialAt && c.officialTimePrecision === "day" && <>, dated <span className="num">{utcDate(c.officialAt)}</span> (the source gives the day only)</>}
                      {c.officialAt && c.officialTimePrecision === "hour" && <>, about <span className="num">{utcDateTime(c.officialAt)}</span> (the source gives the hour, not the minute)</>}
                      {c.officialAt && (!c.officialTimePrecision || c.officialTimePrecision === "minute") && <> at <span className="num">{utcDateTime(c.officialAt)}</span></>}
                      {c.officialUrl && <> · <a href={c.officialUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground" data-testid="link-official-source">source</a></>}
                    </p>
                    <p className="mt-1" data-testid="text-lead-time">{c.officialTimePrecision === "day" ? "Timing" : "Lead time"}: <span className="num">{leadText(c, a.openedAt)}</span></p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      A match means an official record of the same or a related hazard existed near this place in the window; it does not show that the posts predicted it.
                      {c.hazardRelation === "related" && <> Related here means the feeds reported a {c.officialHazard} where the posts read as {HAZARD_LABEL[a.hazard].toLowerCase()}; cyclone, storm and flood count for each other because one brings the others, and the classifier's hazard label can be wrong even when its relevance is right.</>}
                    </p>
                  </>
                ) : c.state === "pending" ? (
                  <p>Pending. The system checks GDACS, USGS, NWS and NASA FIRMS for an event of the same or a related hazard (cyclone, storm and flood count for each other) within 250 km (or the region's own extent) that is active between 24 hours before the alert opened and 48 hours after.</p>
                ) : (
                  <p>Uncorroborated. No matching official event was found in the corroboration window. This may be a false alarm or an event the official feeds do not cover.</p>
                )}
              </div>
            </Panel>

            <Panel className="mt-3" title="The signal that triggered it">
              <div className="px-3 pb-4"><FearTimeline timeline={d.timeline} color={HAZARD_FALLBACK_COLOR[a.hazard]} /></div>
            </Panel>

            <div className="mt-3 grid gap-3 lg:grid-cols-[3fr_2fr]">
              <Panel title="Evidence posts" meta={d.evidencePosts.length < a.postCount ? `${d.evidencePosts.length} of the ${a.postCount} that counted, ranked by relevance × fear` : "the posts that counted toward this alert"}>
                {d.evidencePosts.length === 0 ? <EmptyState>No evidence posts are stored for this alert.</EmptyState> : <ul>{d.evidencePosts.map((p) => <PostRow key={p.id} post={p} full scope={scenario ? { scenario, asOf } : null} />)}</ul>}
              </Panel>
              <Panel title="Event log">
                {d.events.length === 0 ? <EmptyState>No events recorded.</EmptyState> : (
                  <ol className="px-4 pb-4">
                    {d.events.map((e, i) => (
                      <li key={i} className="border-t border-line first:border-t-0 py-2 text-[14px] leading-5" data-testid={`row-alert-event-${i}`}>
                        <p className="num text-[12px] text-muted-foreground">{utcDateTime(e.at)}</p>
                        <p><span className={e.type === "corroborated" ? "text-official" : "font-bold"}>{EVENT_LABEL[e.type] ?? e.type}</span> {e.detail}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
          </>
        );
      })()}
    </Page>
  );
}
