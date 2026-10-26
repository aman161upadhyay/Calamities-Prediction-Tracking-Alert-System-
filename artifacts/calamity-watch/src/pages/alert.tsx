import { useParams, useSearch, Link } from "wouter";
import { useGetAlert, useListPosts, getGetAlertQueryKey, getListPostsQueryKey } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, LevelBadge, LoadingRows, Skel, btn } from "@/components/kit";
import { Recorder } from "@/components/instruments/recorder";
import { Stamp } from "@/components/instruments/stamp";
import { PlateLabel } from "@/components/instruments/plate";
import { PostRow, scopeQuery } from "@/components/board/rows";
import { Figure, Part, replayHref } from "@/components/evidence/parts";
import { HAZARD_LABEL, isNotFound, leadText, num, utcDate, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";
import NotFound from "./not-found";

const EVENT_LABEL: Record<string, string> = { opened: "Opened", level_changed: "Level changed", corroborated: "Stamped by an official record", closed: "Closed", notified: "Subscribers notified" };
const HOUR = 3_600_000;

function span(a: string, b: string) {
  const m = Math.round((+new Date(b) - +new Date(a)) / 60000);
  return m >= 120 ? `${num(m / 60, m % 60 ? 1 : 0)} h` : `${m} min`;
}

export default function AlertPage() {
  const { alertId } = useParams<{ alertId: string }>();
  const search = new URLSearchParams(useSearch());
  // A replay link carries its scenario and playhead so the alert reads as of that moment, not its final state.
  const urlScenario = search.get("scenario");
  const asOf = search.get("asOf") || undefined;
  const id = Number(alertId);
  const params = asOf ? { asOf } : undefined;
  const q = useGetAlert(id, params, { query: { queryKey: [...getGetAlertQueryKey(id), params ?? {}], enabled: Number.isFinite(id) } });
  const d = q.data;
  const a = d?.alert;
  const scenario = urlScenario ?? a?.scenario ?? null;
  const scope = scenario ? { scenario, asOf } : null;

  // Posts in the window: read up to the alert's close (or the playhead, whichever is earlier), then keep the window.
  // Read to an hour past closing (the stated window), never past the playhead or now.
  const until = a ? [asOf, a.closedAt ? new Date(+new Date(a.closedAt) + 3_600_000).toISOString() : undefined, a.closedAt ? new Date().toISOString() : undefined].filter(Boolean).map((t) => t as string).sort((x, y) => +new Date(x) - +new Date(y))[0] : undefined;
  const postParams = a ? { placeId: a.placeId, hazard: a.hazard, limit: 200, ...(scenario ? { scenario } : {}), ...(until ? { asOf: until } : {}) } : {};
  const posts = useListPosts(postParams, { query: { queryKey: getListPostsQueryKey(postParams), enabled: !!a } });

  useTitle(a ? `${HAZARD_LABEL[a.hazard]} alert, ${a.placeName}` : "Alert");
  if (!Number.isFinite(id) || (q.isError && isNotFound(q.error))) return <NotFound />;
  const backHref = urlScenario ? replayHref({ scenario: urlScenario, asOf }) : `/alerts${scope ? scopeQuery(scope) : ""}`;

  return (
    <Page wide>
      <p className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
        <Link href={backHref} className="ink-link text-ink" data-testid="link-back-alerts">{urlScenario ? "Back to the replay" : "The alert ledger"}</Link>
        <span className="mono text-ink-muted" data-testid="text-case-number">Alert {Number.isFinite(id) ? id : ""}</span>
        {scope?.asOf && <span className="text-ink-muted">read as of <span className="mono text-ink">{utcDateTime(scope.asOf)}</span></span>}
      </p>

      {q.isLoading && (
        <div>
          <Skel className="h-[92px] max-w-[800px]" />
          <div className="mt-8 h-[300px] bg-sheet border border-rule-strong"><LoadingRows rows={5} label="Opening the case file" /></div>
        </div>
      )}
      {q.isError && !d && <div className="bg-sheet border border-rule-strong"><ErrorState what="this alert" onRetry={() => q.refetch()} /></div>}

      {d && a && (() => {
        const c = a.corroboration;
        const end = a.closedAt ?? (asOf ?? d.timeline.points[d.timeline.points.length - 1]?.hour ?? new Date().toISOString());
        const peakT = Math.floor(+new Date(a.peakAt) / HOUR) * HOUR;
        const peak = d.timeline.points.find((p) => Math.floor(+new Date(p.hour) / HOUR) * HOUR === peakT);
        const from = +new Date(a.openedAt) - HOUR;
        const to = +new Date(end) + HOUR;
        const inWindow = (posts.data ?? []).filter((p) => { const t = +new Date(p.createdAt); return t >= from && t <= to; });
        const placeHref = `/places/${a.placeId}${scopeQuery(scope)}`;
        const hazardHref = `/hazards/${a.hazard}${scopeQuery(scope)}`;
        return (
          <>
            <header className="grid gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-start">
              <div>
                <h1 className="display h1-station" data-testid="text-alert-title">
                  {HAZARD_LABEL[a.hazard]} alert, <Link href={placeHref} className="hover:underline decoration-2 underline-offset-[6px]" data-testid="link-alert-place">{a.placeName}</Link>
                </h1>
                <p className="mt-5 max-w-[66ch] text-[17px] leading-7" data-testid="text-alert-summary">{a.summary}</p>
                <p className="mt-3 text-[13px] leading-5 text-ink-muted max-w-[66ch]" data-testid="text-alert-disclaimer">
                  Experimental research signal from public posts, not an official warning.
                  {a.scenario && <> This alert comes from the replay <span className="mono text-ink">{a.scenario}</span>, not live data.</>}
                </p>
              </div>
              <aside className="lg:pt-3" data-testid="panel-corroboration">
                {c.state === "corroborated" ? (
                  <div>
                    <Stamp c={c} openedAt={a.openedAt} testId="stamp-alert" />
                    <p className="mt-4 text-[14px] leading-5" data-testid="text-lead-time">
                      The alert opened <span className="mono">{utcDateTime(a.openedAt)}</span>; {leadText(c, a.openedAt).replace(/^opened /, "it opened ")}.
                    </p>
                  </div>
                ) : c.state === "pending" ? (
                  <div className="border border-dashed border-rule-strong p-4 text-[14px] leading-5">
                    <p className="font-semibold">Awaiting an official record</p>
                    <p className="mt-1 text-ink-muted">The feeds are checked for a matching event within 250 km, from 24 h before the alert opened to 48 h after.</p>
                  </div>
                ) : (
                  <div className="border border-rule-strong p-4 text-[14px] leading-5">
                    <p className="font-semibold">No official record matched within 72 h</p>
                    <p className="mt-1 text-ink-muted">This may be a false alarm, or an event the official feeds do not cover.</p>
                  </div>
                )}
              </aside>
            </header>

            <dl className="mt-10 border border-rule-strong grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-px bg-rule [&>*:last-child]:col-span-2 min-[480px]:[&>*:last-child]:col-span-3 md:[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1" data-testid="figures-alert">
              <Figure label="Opened" testId="text-opened"><span className="mono text-[13px]">{utcDateTime(a.openedAt)}</span></Figure>
              <Figure label={a.status === "open" ? "Status" : "Closed"} testId="text-closed">{a.status === "open" ? <span className="text-pen font-semibold">Open</span> : <span className="mono text-[13px]">{utcDateTime(a.closedAt)}</span>}</Figure>
              <Figure label="Open for" testId="text-duration"><span className="mono">{span(a.openedAt, end)}</span>{a.status === "open" && <span className="text-ink-muted text-[12px]"> so far</span>}</Figure>
              <Figure label="Peak level"><LevelBadge level={a.peakLevel} testId="status-peak-level" /></Figure>
              <Figure label="Peak hour" testId="text-peak-at"><span className="mono text-[13px]">{utcDateTime(a.peakAt)}</span></Figure>
              <Figure label="Peak z, robust σ" testId="text-peak-z"><span className="mono">{num(a.peakZ, 1)}</span></Figure>
              <Figure label="Posts that counted" testId="text-post-count"><span className="mono">{num(a.postCount)}</span></Figure>
            </dl>

            <div className="mt-10">
              <Recorder
                lanes={[{ hazard: a.hazard, label: `${HAZARD_LABEL[a.hazard]}, ${a.placeName}`, timeline: d.timeline }]}
                label={["Recorder", "fear mass", a.placeName, `${d.timeline.hours} h`, "UTC"]}
                laneHeight={168}
                shade={{ from: a.openedAt, to: end, label: a.status === "open" ? "window, open" : "alert window" }}
                mark={{ at: a.openedAt, label: "opened" }}
                testId="recorder-alert"
                empty="The detector stored no hourly trace for this place and hazard."
              />
              <p className="mt-2 text-[12px] text-ink-muted">Shaded is the alert window, from opening to {a.status === "open" ? "now" : "closing"}; the red rule marks the opening hour. Red trace is fear mass per hour, dashed is the 7-day baseline, green stamps are official records.</p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <section aria-labelledby="peak-h" className="bg-sheet border border-rule-strong">
                <PlateLabel id="peak-h" parts={["Detector", "peak hour", peak ? utcDateTime(peak.hour) : utcDateTime(a.peakAt)]} />
                {peak ? (
                  <dl className="grid grid-cols-2 gap-px bg-rule border-t-0" data-testid="figures-peak">
                    <Figure label="Fear mass, sum of relevance × fear" testId="text-peak-fear"><span className="mono text-pen">{num(peak.fearMass, 2)}</span></Figure>
                    <Figure label="7-day baseline median" testId="text-peak-baseline"><span className="mono">{peak.baselineMedian == null ? "n/a" : num(peak.baselineMedian, 2)}</span></Figure>
                    <Figure label="z against the baseline" testId="text-peak-zscore"><span className="mono">{peak.zScore == null ? "n/a" : num(peak.zScore, 1)}</span></Figure>
                    <Figure label="Relevant posts that hour" testId="text-peak-posts"><span className="mono">{num(peak.nRelevant)}</span> <span className="text-[12px] text-ink-muted">of {num(peak.nPosts)}</span></Figure>
                    <Figure label="Level"><LevelBadge level={peak.level} testId="status-peak-hour-level" /></Figure>
                    <Figure label={a.status === "open" && !a.closedAt ? (asOf ? "Level at playhead" : scenario ? "Level at end" : "Level now") : "Level at closing"}><LevelBadge level={a.currentLevel} testId="status-current-level" /></Figure>
                  </dl>
                ) : (
                  <EmptyState>The peak hour falls outside the stored trace; the peak z above is the detector's own record.</EmptyState>
                )}
              </section>

              <section aria-labelledby="official-h" className="bg-sheet border border-rule-strong">
                <PlateLabel id="official-h" parts={["Official record", c.state === "corroborated" ? "matched" : c.state === "pending" ? "pending" : "none"]} />
                <div className="p-4 text-[14px] leading-6" data-testid="text-official">
                  {c.state === "corroborated" ? (
                    <>
                      <p className="font-semibold text-[16px]">{c.title ?? "Untitled record"}</p>
                      <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-1 text-[13px]">
                        <dt className="text-ink-muted">Feed</dt><dd className="font-semibold"><span aria-hidden className="inline-block size-2.5 border-[1.5px] border-stamp rotate-[-6deg] mr-1.5 align-[-1px]" />{c.feed ?? "official feed"}</dd>
                        <dt className="text-ink-muted">Recorded</dt>
                        <dd className="mono">{c.officialTimePrecision === "day" ? `${utcDate(c.officialAt)} (day only)` : `${utcDateTime(c.officialAt)}${c.officialTimePrecision === "hour" ? " (to the hour)" : ""}`}</dd>
                        <dt className="text-ink-muted">Hazard</dt><dd>{c.officialHazard ?? HAZARD_LABEL[a.hazard].toLowerCase()}{c.hazardRelation === "related" ? `, related to ${HAZARD_LABEL[a.hazard].toLowerCase()}` : ""}</dd>
                        <dt className="text-ink-muted">Lead or lag</dt><dd>{leadText(c, a.openedAt)}</dd>
                      </dl>
                      {c.officialUrl && <p className="mt-3"><a href={c.officialUrl} target="_blank" rel="noreferrer" className="ink-link" data-testid="link-official-source">Read the cited source</a></p>}
                      <p className="mt-3 text-[12px] leading-5 text-ink-muted">A match means an official record of the same or a related hazard existed near this place in the window. It does not show that the posts predicted it. The API does not report the distance between the two.</p>
                    </>
                  ) : c.state === "pending" ? (
                    <p className="text-ink-muted">The system checks GDACS, USGS, NWS and NASA FIRMS for an event of the same or a related hazard within 250 km, active from 24 h before the alert opened to 48 h after. Nothing has matched yet.</p>
                  ) : (
                    <p className="text-ink-muted">No official record matched within 72 h. No lead or lag can be measured.</p>
                  )}
                </div>
              </section>
            </div>

            <Part id="posts" title="Posts in the window" note={<>Relevant {HAZARD_LABEL[a.hazard].toLowerCase()} posts placed at {a.placeName}, from an hour before opening to an hour after {a.status === "open" ? "now" : "closing"}, newest first.</>}>
              <div className="bg-sheet border border-rule-strong min-h-[240px]">
                <PlateLabel parts={["Ledger", "posts", "UTC"]} right={posts.data ? <span className="mono" data-testid="text-window-count">{inWindow.length} in window{(posts.data.length === 200) ? ", first 200 read" : ""}</span> : null} />
                {posts.isLoading && <LoadingRows rows={5} label="Reading the posts" />}
                {posts.isError && <ErrorState what="the posts" onRetry={() => posts.refetch()} />}
                {posts.data && inWindow.length === 0 && (
                  d.evidencePosts.length > 0 ? (
                    <>
                      <p className="px-4 pt-3 text-[13px] text-ink-muted">The feed returned none in the window; these are the evidence posts the detector stored with the alert.</p>
                      <ol className="divide-y divide-rule" data-testid="ledger-evidence">{d.evidencePosts.map((p) => <PostRow key={p.id} post={p} full scope={scope} />)}</ol>
                    </>
                  ) : <EmptyState>No posts are stored for this window.</EmptyState>
                )}
                {inWindow.length > 0 && <ol className="divide-y divide-rule" data-testid="ledger-posts">{inWindow.map((p) => <PostRow key={p.id} post={p} full scope={scope} />)}</ol>}
              </div>
            </Part>

            <Part id="log" title="Event log" note="What the detector wrote, in order.">
              {d.events.length === 0 ? <EmptyState>No events recorded.</EmptyState> : (
                <ol className="border-l border-ink ml-1" data-testid="ledger-events">
                  {d.events.map((e, i) => (
                    <li key={i} className="relative pl-6 pb-5 last:pb-0" data-testid={`row-alert-event-${i}`}>
                      <span aria-hidden className={`absolute -left-[5px] top-1.5 size-[9px] ${e.type === "corroborated" ? "border-[1.5px] border-stamp bg-sheet rotate-[-6deg]" : e.type === "opened" ? "bg-pen" : "bg-ink"}`} />
                      <p className="mono text-[12px] text-ink-muted">{utcDateTime(e.at)}</p>
                      <p className="text-[14px] leading-5"><span className="font-semibold">{EVENT_LABEL[e.type] ?? e.type}.</span> {e.detail}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Part>

            <nav aria-label="Related records" className="mt-12 md:mt-16 border-t border-ink pt-4 flex flex-wrap gap-3">
              <Link href={placeHref} className={btn} data-testid="link-place">Read {a.placeName} over time</Link>
              <Link href={hazardHref} className={btn} data-testid="link-hazard">Read {HAZARD_LABEL[a.hazard].toLowerCase()} across places</Link>
              <Link href={`/alerts?${new URLSearchParams({ placeId: String(a.placeId), ...(scope ? { scenario: scope.scenario } : {}), ...(scope?.asOf ? { asOf: scope.asOf } : {}) }).toString()}`} className={btn} data-testid="link-place-alerts">Every alert for {a.placeName}</Link>
            </nav>
          </>
        );
      })()}
    </Page>
  );
}
