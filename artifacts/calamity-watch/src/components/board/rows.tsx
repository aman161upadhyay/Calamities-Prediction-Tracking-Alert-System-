import { Link } from "wouter";
import type { Alert, ScoredPost } from "@workspace/api-client-react";
import { HAZARD_LABEL, SOURCE_LABEL, isWithheldText, leadText, num, placeLabel, prob, utcDateTime, utcTime } from "@/lib/format";
import { HazardDot, LevelBadge } from "@/components/kit";
import { StampGlyph } from "@/components/instruments/stamp";
import { cn } from "@/lib/utils";

/** One ledger row for a scored post: mono time column, the text, then the scores. */
export function PostRow({ post, full, scope, fresh }: { post: ScoredPost; color?: string; full?: boolean; scope?: { scenario?: string | null; asOf?: string | null } | null; fresh?: boolean }) {
  const place = post.places[0];
  return (
    <li data-testid={`row-post-${post.id}`} className={cn("grid grid-cols-[52px_1fr] gap-x-3 px-4 py-3", fresh && "log-print")}>
      <span className="mono text-[11px] leading-5 text-ink-muted">{full ? utcDateTime(post.createdAt) : utcTime(post.createdAt).replace(" UTC", "")}</span>
      <div className="min-w-0">
        {isWithheldText(post.text) ? (
          <p className="text-[13px] leading-5 text-ink-muted">
            Text withheld under the HumAID data terms; tweet ids may be shared, text may not.{" "}
            {post.url && <a href={post.url} target="_blank" rel="noreferrer" className="ink-link text-ink">Read the original on X</a>}
          </p>
        ) : (
          <p className={cn("text-[14px] leading-5 break-words", !full && "line-clamp-3")}>{post.text}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-4">
          <span className="inline-flex items-center gap-1.5">
            <HazardDot hazard={post.hazard} />
            {HAZARD_LABEL[post.hazard]}
          </span>
          <span className="mono"><span className="text-ink-muted">rel</span> {prob(post.pRelevant)}</span>
          <span className="mono"><span className="text-pen">fear</span> {prob(post.pFear)}</span>
          {full && (
            <span className="mono text-ink-muted">
              anger {prob(post.pAnger)} sad {prob(post.pSadness)} sent {num(post.sentimentScore, 2)}
            </span>
          )}
          {place ? (
            <Link href={`/places/${place.placeId}${scopeQuery(scope)}`} className="text-ink-muted ink-link" data-testid={`link-post-place-${post.id}`}>
              {placeLabel(place.name, place.country)}
            </Link>
          ) : (
            <span className="text-ink-muted">no place resolved</span>
          )}
          <span className="text-ink-muted">{SOURCE_LABEL[post.source] ?? post.source}</span>
          {post.url && (
            <a href={post.url} target="_blank" rel="noreferrer" className="ink-link text-ink-muted" data-testid={`link-post-source-${post.id}`}>
              original
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/** Query string that keeps a replay's scenario and playhead on the alert page, so it reads as of the same moment. */
export function scopeQuery(scope?: { scenario?: string | null; asOf?: string | null } | null): string {
  if (!scope?.scenario) return "";
  const q = new URLSearchParams({ scenario: scope.scenario });
  if (scope.asOf) q.set("asOf", scope.asOf);
  return `?${q.toString()}`;
}

/** One alert in the ledger. The whole row opens the evidence dossier. */
export function AlertRow({ alert, compact, scope, fresh }: { alert: Alert; compact?: boolean; scope?: { scenario?: string | null; asOf?: string | null } | null; fresh?: boolean }) {
  const c = alert.corroboration;
  const at = alert.status === "open" ? alert.openedAt : alert.closedAt ?? alert.openedAt;
  return (
    <li data-testid={`row-alert-${alert.id}`} className={cn(fresh && "log-print")}>
      <Link href={`/alerts/${alert.id}${scopeQuery(scope)}`} className="group grid grid-cols-[52px_1fr] gap-x-3 px-4 py-3 hover:bg-paper focus-visible:bg-paper" data-testid={`link-alert-${alert.id}`}>
        <span className="mono text-[11px] leading-5 text-ink-muted">{utcTime(at).replace(" UTC", "")}</span>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-[15px] leading-5 group-hover:underline underline-offset-2">
              {alert.placeName} <span className="font-normal text-ink-muted">{HAZARD_LABEL[alert.hazard].toLowerCase()}</span>
            </span>
            <LevelBadge level={alert.currentLevel} testId={`status-alert-level-${alert.id}`} />
          </div>
          <p className="mt-0.5 text-[12px] leading-4 text-ink-muted">
            {alert.status === "open" ? "Opened" : "Closed"} <span className="mono">{utcDateTime(at)}</span>, peak z <span className="mono text-ink">{num(alert.peakZ, 1)}</span>, <span className="mono text-ink">{alert.postCount}</span> posts
          </p>
          <p className="mt-1 text-[12px] leading-4 flex flex-wrap items-center gap-x-2">
            <StampGlyph state={c.state} />
            {c.state === "corroborated" && <span className="text-ink-muted">{c.feed ?? "official feed"}{c.hazardRelation === "related" && c.officialHazard ? ` (a ${c.officialHazard} record)` : ""}, {leadText(c, alert.openedAt)}</span>}
          </p>
          {!compact && <p className="mt-1.5 text-[14px] leading-5 text-ink-muted max-w-[72ch]">{alert.summary}</p>}
        </div>
      </Link>
    </li>
  );
}
