import { db, signalsHourlyTable, type Alert as AlertRow, type OfficialEvent as OfficialEventRow, type Place, type Post, type PostScore } from "@workspace/db";
import { sql } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { hazardMeta, isHazardId, levelRank, type RiskLevel } from "../lib/hazards";
import { HOUR_MS, floorHour } from "../lib/time";
import { alertSummary } from "../lib/summary";
import { scenarioById } from "../services/replay";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Scope {
  scenario: string;
  asOf: Date;
  isReplay: boolean;
}

/** A query parameter that must be a single string when present; repeated or bracketed forms are refused, not ignored. */
export function singleParam(query: Record<string, unknown>, name: string): string | undefined {
  const v = query[name];
  // With the plain query parser, "scenario[]=x" arrives under the key "scenario[]"; it is a malformed scenario, not
  // an unrelated parameter, so it is refused rather than silently falling back to the live scope.
  const bracketed = Object.keys(query).some((k) => k.startsWith(`${name}[`));
  if (bracketed || Array.isArray(v) || (v !== undefined && typeof v !== "string")) {
    throw new ApiError(400, `${name} must be given once, as a plain string`);
  }
  return v as string | undefined;
}

// The data starts with the 2017 tapes and nothing is known about the future beyond the clock's drift; a JavaScript
// Date reaches year ±271821, which Postgres refuses with a server error, so the bound is applied here as a 400.
const AS_OF_MIN = Date.UTC(2000, 0, 1);
const AS_OF_SLACK_MS = 366 * 24 * 3_600_000;

export function parseAsOf(value: string | undefined): Date | undefined {
  if (value === undefined || value === "") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "asOf must be an ISO 8601 timestamp");
  if (d.getTime() < AS_OF_MIN || d.getTime() > Date.now() + AS_OF_SLACK_MS) {
    throw new ApiError(400, "asOf must be between 2000-01-01 and one year from now");
  }
  return d;
}

export function parseScope(query: Record<string, unknown>): Scope {
  const scenario = singleParam(query, "scenario") ?? "";
  if (scenario && !scenarioById(scenario)) throw new ApiError(400, `Unknown replay scenario "${scenario}"`);
  const asOf = parseAsOf(singleParam(query, "asOf")) ?? new Date();
  return { scenario, asOf, isReplay: scenario !== "" };
}

/**
 * The latest hourly row that is fully known at the playhead. Live rows for the current hour are recomputed each tick
 * from the posts seen so far, so they are safe to show; replay rows are computed from whole hours, so the hour that
 * contains the playhead would include posts from after it. In replay the last complete hour is used instead.
 */
export function knownHour(scope: Scope): Date {
  const h = floorHour(scope.asOf);
  return scope.isReplay ? new Date(h.getTime() - HOUR_MS) : h;
}

export function parseHazard(value: unknown): string {
  if (!isHazardId(value)) throw new ApiError(400, `Unknown hazard "${String(value)}"`);
  return value;
}

import { FEED_LABELS } from "../lib/feeds";
export { FEED_LABELS };

export const REPLAY_TEXT_PLACEHOLDER = "Text withheld under the HumAID data terms (tweet ids may be shared, text may not). Open the original on X to read it.";

export function mapOfficialEvent(e: OfficialEventRow) {
  return {
    id: e.id,
    feed: e.feed,
    feedLabel: FEED_LABELS[e.feed] ?? e.feed,
    externalId: e.externalId,
    hazard: e.hazard,
    title: e.title,
    severity: e.severity,
    lat: e.lat,
    lon: e.lon,
    country: e.country,
    startsAt: e.startsAt.toISOString(),
    timePrecision: (e.timePrecision === "hour" || e.timePrecision === "day" ? e.timePrecision : "minute") as "minute" | "hour" | "day",
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    url: e.url,
  };
}

export interface PostPlaceRef {
  placeId: number;
  name: string;
  country: string;
  confidence: number;
  method: string;
}

export function mapPost(p: Post, s: PostScore, places: PostPlaceRef[]) {
  return {
    id: p.id,
    source: p.source,
    externalId: p.externalId,
    url: p.url,
    text: p.source === "replay" ? REPLAY_TEXT_PLACEHOLDER : p.text,
    createdAt: p.createdAt.toISOString(),
    lang: p.lang,
    pRelevant: s.pRelevant,
    hazard: s.hazard,
    hazardProbs: s.hazardProbs,
    pFear: s.pFear,
    pAnger: s.pAnger,
    pSadness: s.pSadness,
    sentiment: s.sentiment,
    sentimentScore: s.sentimentScore,
    places,
  };
}

interface AsOfAdjust {
  currentLevel: RiskLevel;
  peakZ: number;
  peakAt: Date;
  peakN: number;
  postCount: number;
}

/**
 * Alerts carry their final state; when the playhead is earlier than that state, derive the level, peak
 * and post count from the hourly rows up to the playhead so a replay never shows the future.
 */
export async function asOfAdjustments(alerts: AlertRow[], scope: Scope): Promise<Map<number, AsOfAdjust>> {
  const out = new Map<number, AsOfAdjust>();
  const needs = alerts.filter((a) => scope.isReplay || a.updatedAt.getTime() > scope.asOf.getTime());
  if (needs.length === 0) return out;
  const minOpened = Math.min(...needs.map((a) => a.openedAt.getTime()));
  const upto = knownHour(scope);
  const res = await db.execute<{ place_id: number; hazard: string; hour_utc: Date; z_score: number | null; level: string; n_relevant: number }>(sql`
    select place_id, hazard, hour_utc, z_score, level, n_relevant from signals_hourly
    where scenario = ${scope.scenario} and hour_utc >= ${new Date(minOpened - 2 * HOUR_MS)} and hour_utc <= ${upto}
      and (place_id, hazard) in (${sql.join(needs.map((a) => sql`(${a.placeId}, ${a.hazard})`), sql`, `)})
    order by hour_utc
  `);
  const rows = res.rows.map((r) => ({ ...r, hour: new Date(r.hour_utc).getTime(), place_id: Number(r.place_id) }));
  for (const a of needs) {
    const mine = rows.filter((r) => r.place_id === a.placeId && r.hazard === a.hazard && r.hour >= a.openedAt.getTime() - 2 * HOUR_MS);
    // The level at the playhead is the level of the latest known hour, exactly as the detector reads it: the row for
    // that hour, or "insufficient" when no post fell in it. Borrowing an earlier row would show the previous hour.
    const atKnown = mine.find((r) => r.hour === upto.getTime());
    let peakZ = 0;
    let peakAt = a.openedAt;
    let peakN = 0;
    let postCount = 0;
    for (const r of mine) {
      postCount += Number(r.n_relevant);
      if ((r.z_score ?? 0) > peakZ) {
        peakZ = r.z_score ?? 0;
        peakAt = new Date(r.hour);
        peakN = Number(r.n_relevant);
      }
    }
    const closed = a.closedAt && a.closedAt.getTime() <= scope.asOf.getTime();
    out.set(a.id, {
      currentLevel: closed ? (a.currentLevel as RiskLevel) : atKnown ? (atKnown.level as RiskLevel) : "insufficient",
      peakZ: closed ? a.peakZ : Math.max(peakZ, 0),
      peakAt: closed ? a.peakAt : peakAt,
      peakN: closed ? (a.peakN ?? peakN) : peakN,
      postCount: closed ? a.postCount : postCount,
    });
  }
  return out;
}

export function mapAlert(a: AlertRow, place: Place, official: OfficialEventRow | null, scope: Scope, adjust?: AsOfAdjust) {
  const asOf = scope.asOf.getTime();
  const closed = a.closedAt !== null && a.closedAt.getTime() <= asOf;
  const windowEnd = a.openedAt.getTime() + DETECTOR.corroborationWindowHours * HOUR_MS;
  type Corroboration = {
    state: "corroborated" | "uncorroborated" | "pending";
    officialEventId: number | null;
    feed: string | null;
    title: string | null;
    officialAt: string | null;
    officialTimePrecision: "minute" | "hour" | "day" | null;
    officialUrl: string | null;
    officialHazard: string | null;
    hazardRelation: "same" | "related" | null;
    leadMinutes: number | null;
  };
  const none: Corroboration = { state: "pending", officialEventId: null, feed: null, title: null, officialAt: null, officialTimePrecision: null, officialUrl: null, officialHazard: null, hazardRelation: null, leadMinutes: null };
  let corroboration: Corroboration;
  if (a.corroborationState === "corroborated" && official && official.startsAt.getTime() <= asOf) {
    const precision = (official.timePrecision === "hour" || official.timePrecision === "day" ? official.timePrecision : "minute") as "minute" | "hour" | "day";
    corroboration = {
      state: "corroborated",
      officialEventId: official.id,
      feed: FEED_LABELS[official.feed] ?? official.feed,
      title: official.title,
      officialAt: official.startsAt.toISOString(),
      officialTimePrecision: precision,
      officialUrl: official.url,
      officialHazard: official.hazard,
      hazardRelation: official.hazard === a.hazard ? "same" : "related",
      // A day-level record cannot support a lead time in minutes; the interface compares dates instead.
      leadMinutes: precision === "day" ? null : a.leadMinutes,
    };
  } else if (asOf > windowEnd && a.corroborationState !== "pending") {
    corroboration = { ...none, state: "uncorroborated" };
  } else {
    corroboration = none;
  }
  const peakLevel = adjust ? maxOf(adjust.currentLevel, levelForZ(adjust.peakZ)) : a.peakLevel;
  // The summary is rebuilt for the playhead so that an earlier moment in a replay never quotes a later peak.
  const summary = adjust ? alertSummary(a.hazard, place.name, adjust.peakN, adjust.peakZ, adjust.peakAt, peakLevel) : a.summary;
  return {
    id: a.id,
    placeId: a.placeId,
    placeName: place.name,
    country: place.country,
    lat: place.lat,
    lon: place.lon,
    hazard: a.hazard,
    status: closed ? "closed" : "open",
    peakLevel,
    currentLevel: adjust ? adjust.currentLevel : a.currentLevel,
    openedAt: a.openedAt.toISOString(),
    closedAt: closed && a.closedAt ? a.closedAt.toISOString() : null,
    peakZ: adjust ? adjust.peakZ : a.peakZ,
    peakAt: (adjust ? adjust.peakAt : a.peakAt).toISOString(),
    corroboration,
    summary,
    postCount: adjust ? adjust.postCount : a.postCount,
    scenario: a.scenario === "" ? null : a.scenario,
  };
}

function levelForZ(z: number): RiskLevel {
  if (z >= DETECTOR.thresholds.severe) return "severe";
  if (z >= DETECTOR.thresholds.high) return "high";
  if (z >= DETECTOR.thresholds.elevated) return "elevated";
  return "low";
}

function maxOf(a: RiskLevel, b: RiskLevel): RiskLevel {
  return levelRank(a) >= levelRank(b) ? a : b;
}

export function hazardLabel(id: string): string {
  return hazardMeta(id).label;
}

export { signalsHourlyTable };
