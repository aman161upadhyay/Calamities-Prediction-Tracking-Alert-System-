import { Link } from "wouter";
import type { Alert, ScoredPost } from "@workspace/api-client-react";
import { HAZARD_LABEL, SOURCE_LABEL, isWithheldText, leadText, num, placeLabel, prob, utcDateTime, utcTime } from "@/lib/format";
import { HazardDot, LevelBadge } from "@/components/kit";

export function PostRow({ post, color, full }: { post: ScoredPost; color?: string; full?: boolean }) {
  const place = post.places[0];
  return (
    <li data-testid={`row-post-${post.id}`} className="px-4 py-3 border-t border-line first:border-t-0">
      <div className="flex items-center gap-2 text-[12px] leading-4 text-muted-foreground">
        <span className="num">{full ? utcDateTime(post.createdAt) : utcTime(post.createdAt)}</span>
        <span>{SOURCE_LABEL[post.source] ?? post.source}</span>
        {post.url && (
          <a href={post.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground" data-testid={`link-post-source-${post.id}`}>
            original
          </a>
        )}
      </div>
      {isWithheldText(post.text) ? (
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground italic">
          Text withheld under the HumAID data terms; tweet ids may be shared, text may not.{" "}
          {post.url && (
            <a href={post.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 not-italic hover:text-foreground">
              Read the original on X
            </a>
          )}
        </p>
      ) : (
        <p className={`mt-1 text-[14px] leading-5 break-words ${full ? "" : "line-clamp-3"}`}>{post.text}</p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-4">
        <span className="inline-flex items-center gap-1.5">
          <HazardDot hazard={post.hazard} color={color} />
          {HAZARD_LABEL[post.hazard]} <span className="num">{prob(post.pRelevant)}</span>
        </span>
        <span>
          <span className="text-fear">fear</span> <span className="num">{prob(post.pFear)}</span>
        </span>
        {full && (
          <span className="text-muted-foreground">
            anger <span className="num">{prob(post.pAnger)}</span> sadness <span className="num">{prob(post.pSadness)}</span> sentiment <span className="num">{num(post.sentimentScore, 2)}</span>
          </span>
        )}
        {place ? (
          <Link href={`/places/${place.placeId}`} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" data-testid={`link-post-place-${post.id}`}>
            {placeLabel(place.name, place.country)}
          </Link>
        ) : (
          <span className="text-muted-foreground">no place resolved</span>
        )}
      </div>
    </li>
  );
}

export function AlertRow({ alert, compact }: { alert: Alert; compact?: boolean }) {
  const c = alert.corroboration;
  return (
    <li data-testid={`row-alert-${alert.id}`} className="border-t border-line first:border-t-0">
      <Link href={`/alerts/${alert.id}`} className="block px-4 py-3 hover:bg-surface-2 focus-visible:bg-surface-2" data-testid={`link-alert-${alert.id}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold text-[14px] leading-5">
            {alert.placeName} <span className="font-normal text-muted-foreground">{HAZARD_LABEL[alert.hazard].toLowerCase()}</span>
          </span>
          <LevelBadge level={alert.currentLevel} testId={`status-alert-level-${alert.id}`} />
        </div>
        <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
          {alert.status === "open" ? "Opened" : "Closed"} <span className="num">{utcDateTime(alert.status === "open" ? alert.openedAt : alert.closedAt ?? alert.openedAt)}</span> · peak z <span className="num">{num(alert.peakZ, 1)}</span> · <span className="num">{alert.postCount}</span> posts
        </p>
        <p className="mt-0.5 text-[12px] leading-4">
          {c.state === "corroborated" ? (
            <span className="text-official">Corroborated by {c.feed ?? "an official feed"}, {leadText(c.leadMinutes, c.feed === "Historical record" ? "the recorded event" : c.feed ?? "the official record")}</span>
          ) : c.state === "pending" ? (
            <span className="text-muted-foreground">Awaiting official corroboration</span>
          ) : (
            <span className="text-muted-foreground">No matching official event</span>
          )}
        </p>
        {!compact && <p className="mt-1 text-[14px] leading-5 text-muted-foreground max-w-[72ch]">{alert.summary}</p>}
      </Link>
    </li>
  );
}
