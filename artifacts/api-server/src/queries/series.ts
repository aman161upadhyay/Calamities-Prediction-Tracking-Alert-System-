import { db, officialEventsTable, placesTable, alertsTable } from "@workspace/db";
import { and, eq, gte, inArray, isNotNull, lte, sql, desc } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { HAZARDS, levelRank, type HazardId, type RiskLevel } from "../lib/hazards";
import { baselineOf, haversineKm, levelFor, robustZ, round, trendOf } from "../lib/stats";
import { HOUR_MS, floorHour } from "../lib/time";
import { FEED_LABELS, type Scope, knownHour, mapOfficialEvent } from "./common";

export interface CurrentRow {
  placeId: number;
  hazard: string;
  hour: Date;
  level: RiskLevel;
  zScore: number;
  nRelevant: number;
  fearMass: number;
}

/** Latest row per series within the last two hour buckets up to the playhead. */
export async function currentRows(scope: Scope): Promise<Map<string, CurrentRow>> {
  const upto = knownHour(scope);
  const res = await db.execute<{ place_id: number; hazard: string; hour_utc: Date; level: string; z_score: number | null; n_relevant: number; fear_mass: number }>(sql`
    select distinct on (place_id, hazard) place_id, hazard, hour_utc, level, z_score, n_relevant, fear_mass
    from signals_hourly
    where scenario = ${scope.scenario} and hour_utc <= ${upto} and hour_utc >= ${new Date(upto.getTime() - HOUR_MS)}
    order by place_id, hazard, hour_utc desc
  `);
  const out = new Map<string, CurrentRow>();
  for (const r of res.rows) {
    out.set(`${r.place_id}:${r.hazard}`, {
      placeId: Number(r.place_id),
      hazard: r.hazard,
      hour: new Date(r.hour_utc),
      level: r.level as RiskLevel,
      zScore: Number(r.z_score ?? 0),
      nRelevant: Number(r.n_relevant),
      fearMass: Number(r.fear_mass),
    });
  }
  return out;
}

export interface DaySummary {
  placeId: number;
  hazard: string;
  rel24: number;
  recent3: number;
  prev3: number;
  lastHour: Date;
}

/** 24-hour sums per series up to the playhead, with the two 3-hour windows used for the trend arrow. */
export async function daySummaries(scope: Scope): Promise<Map<string, DaySummary>> {
  const upto = knownHour(scope);
  const res = await db.execute<{ place_id: number; hazard: string; rel24: number; recent3: number | null; prev3: number | null; last_hour: Date }>(sql`
    select place_id, hazard, sum(n_relevant)::int as rel24,
      coalesce(sum(fear_mass) filter (where hour_utc >= ${new Date(upto.getTime() - 2 * HOUR_MS)}), 0)::float8 as recent3,
      coalesce(sum(fear_mass) filter (where hour_utc < ${new Date(upto.getTime() - 2 * HOUR_MS)} and hour_utc >= ${new Date(upto.getTime() - 5 * HOUR_MS)}), 0)::float8 as prev3,
      max(hour_utc) as last_hour
    from signals_hourly
    where scenario = ${scope.scenario} and hour_utc <= ${upto} and hour_utc > ${new Date(upto.getTime() - 24 * HOUR_MS)}
    group by 1, 2
    having sum(n_relevant) >= 1
  `);
  const out = new Map<string, DaySummary>();
  for (const r of res.rows) {
    out.set(`${r.place_id}:${r.hazard}`, {
      placeId: Number(r.place_id),
      hazard: r.hazard,
      rel24: Number(r.rel24),
      recent3: Number(r.recent3 ?? 0),
      prev3: Number(r.prev3 ?? 0),
      lastHour: new Date(r.last_hour),
    });
  }
  return out;
}

export interface PlaceSignalOut {
  placeId: number;
  name: string;
  country: string;
  lat: number;
  lon: number;
  hazard: string;
  level: RiskLevel;
  zScore: number;
  relevantPostsLastHour: number;
  relevantPostsLast24h: number;
  fearMassLastHour: number;
  trend: "rising" | "falling" | "flat";
  updatedAt: string;
}

/** PlaceSignal rows for every series with at least one relevant post in the last 24 hours. */
export async function placeSignals(scope: Scope, opts: { hazard?: string; limit?: number } = {}): Promise<PlaceSignalOut[]> {
  const [cur, day] = await Promise.all([currentRows(scope), daySummaries(scope)]);
  const upto = knownHour(scope).getTime();
  const keys = [...day.keys()].filter((k) => !opts.hazard || k.endsWith(`:${opts.hazard}`));
  if (keys.length === 0) return [];
  const placeIds = [...new Set(keys.map((k) => Number(k.split(":")[0])))];
  const places = new Map((await db.select().from(placesTable).where(inArray(placesTable.id, placeIds))).map((p) => [p.id, p] as const));
  const out: PlaceSignalOut[] = [];
  for (const key of keys) {
    const d = day.get(key)!;
    const c = cur.get(key);
    const place = places.get(d.placeId);
    if (!place) continue;
    const isCurrentHour = c !== undefined && c.hour.getTime() === upto;
    out.push({
      placeId: place.id,
      name: place.name,
      country: place.country,
      lat: place.lat,
      lon: place.lon,
      hazard: d.hazard,
      level: c ? c.level : "insufficient",
      zScore: c ? round(c.zScore, 2) : 0,
      relevantPostsLastHour: isCurrentHour ? c!.nRelevant : 0,
      relevantPostsLast24h: d.rel24,
      fearMassLastHour: isCurrentHour ? round(c!.fearMass, 2) : 0,
      trend: trendOf(d.recent3, d.prev3),
      updatedAt: new Date(Math.min(d.lastHour.getTime() + HOUR_MS, scope.asOf.getTime())).toISOString(),
    });
  }
  out.sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.zScore - a.zScore || b.relevantPostsLast24h - a.relevantPostsLast24h);
  return out.slice(0, opts.limit ?? 300);
}

export interface TimelinePointOut {
  hour: string;
  nPosts: number;
  nRelevant: number;
  fearMass: number;
  angerMass: number;
  meanSentiment: number | null;
  baselineMedian: number | null;
  zScore: number | null;
  level: RiskLevel;
}

interface HourAgg {
  hour: number;
  nPosts: number;
  nRelevant: number;
  fearMass: number;
  angerMass: number;
  meanSentiment: number | null;
}

async function placeSeries(scope: Scope, hazard: string, placeId: number, from: Date, to: Date): Promise<HourAgg[]> {
  const res = await db.execute<{ hour_utc: Date; n_posts: number; n_relevant: number; fear_mass: number; anger_mass: number; mean_sentiment: number | null }>(sql`
    select hour_utc, n_posts, n_relevant, fear_mass, anger_mass, mean_sentiment from signals_hourly
    where scenario = ${scope.scenario} and hazard = ${hazard} and place_id = ${placeId} and hour_utc >= ${from} and hour_utc <= ${to}
    order by hour_utc
  `);
  return res.rows.map((r) => ({ hour: new Date(r.hour_utc).getTime(), nPosts: Number(r.n_posts), nRelevant: Number(r.n_relevant), fearMass: Number(r.fear_mass), angerMass: Number(r.anger_mass), meanSentiment: r.mean_sentiment === null ? null : Number(r.mean_sentiment) }));
}

async function hazardSeries(scope: Scope, hazard: string, from: Date, asOf: Date): Promise<HourAgg[]> {
  const res = await db.execute<{ hour: Date; n_posts: number; n_relevant: number; fear_mass: number; anger_mass: number; mean_sentiment: number | null }>(sql`
    select date_trunc('hour', p.created_at) as hour, count(*)::int as n_posts,
      count(*) filter (where s.p_relevant >= ${DETECTOR.relevanceThreshold})::int as n_relevant,
      coalesce(sum(s.p_relevant * s.p_fear), 0)::float8 as fear_mass,
      coalesce(sum(s.p_relevant * s.p_anger), 0)::float8 as anger_mass,
      avg(s.sentiment_score) filter (where s.p_relevant >= ${DETECTOR.relevanceThreshold})::float8 as mean_sentiment
    from posts p join post_scores s on s.post_id = p.id
    where p.scenario = ${scope.scenario} and s.hazard = ${hazard} and p.created_at >= ${from} and p.created_at <= ${asOf}
    group by 1 order by 1
  `);
  return res.rows.map((r) => ({ hour: new Date(r.hour).getTime(), nPosts: Number(r.n_posts), nRelevant: Number(r.n_relevant), fearMass: Number(r.fear_mass), angerMass: Number(r.anger_mass), meanSentiment: r.mean_sentiment === null ? null : Number(r.mean_sentiment) }));
}

export interface TimelineOut {
  hazard: string;
  placeId: number | null;
  placeName: string | null;
  hours: number;
  unit: string;
  points: TimelinePointOut[];
  officialMarkers: { at: string; feed: string; feedLabel: string; title: string; severity: string; eventId: number }[];
}

export async function buildTimeline(scope: Scope, hazard: string, placeId: number | null, hours: number): Promise<TimelineOut> {
  const end = knownHour(scope);
  const start = new Date(end.getTime() - (hours - 1) * HOUR_MS);
  const baselineStart = new Date(start.getTime() - DETECTOR.baselineDays * 24 * HOUR_MS);
  let place: { id: number; name: string; lat: number; lon: number } | null = null;
  if (placeId !== null) {
    const rows = await db.select().from(placesTable).where(eq(placesTable.id, placeId)).limit(1);
    place = rows[0] ?? null;
  }
  const series = placeId !== null ? await placeSeries(scope, hazard, placeId, baselineStart, end) : await hazardSeries(scope, hazard, baselineStart, scope.asOf);
  const byHour = new Map(series.map((s) => [s.hour, s]));
  const windowHours = DETECTOR.baselineDays * 24;
  const points: TimelinePointOut[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += HOUR_MS) {
    const agg = byHour.get(t);
    const window: number[] = new Array(windowHours);
    for (let k = 1; k <= windowHours; k++) window[k - 1] = byHour.get(t - k * HOUR_MS)?.fearMass ?? 0;
    const hasHistory = t - windowHours * HOUR_MS >= baselineStart.getTime() - HOUR_MS;
    const { median, mad } = baselineOf(window);
    const fear = agg?.fearMass ?? 0;
    const z = hasHistory ? robustZ(fear, median, mad) : null;
    points.push({
      hour: new Date(t).toISOString(),
      nPosts: agg?.nPosts ?? 0,
      nRelevant: agg?.nRelevant ?? 0,
      fearMass: round(fear, 3),
      angerMass: round(agg?.angerMass ?? 0, 3),
      meanSentiment: agg?.meanSentiment === undefined || agg?.meanSentiment === null ? null : round(agg.meanSentiment, 3),
      baselineMedian: hasHistory ? round(median, 3) : null,
      zScore: z === null ? null : round(z, 2),
      level: levelFor(z, agg?.nRelevant ?? 0),
    });
  }
  // Markers are the same hazard only; the wider COMPATIBLE set is for corroborating alerts, not for the chart.
  const events = await db
    .select()
    .from(officialEventsTable)
    .where(and(eq(officialEventsTable.scenario, scope.scenario), eq(officialEventsTable.hazard, hazard), gte(officialEventsTable.startsAt, start), lte(officialEventsTable.startsAt, scope.asOf), isNotNull(officialEventsTable.lat)))
    .orderBy(desc(officialEventsTable.startsAt))
    .limit(400);
  // Keep the most recent 60 within the window, returned oldest first.
  const markers = events
    .filter((e) => !place || haversineKm(place.lat, place.lon, e.lat!, e.lon!) <= DETECTOR.corroborationRadiusKm)
    .slice(0, 60)
    .reverse()
    .map((e) => ({ at: e.startsAt.toISOString(), feed: e.feed, feedLabel: FEED_LABELS[e.feed] ?? e.feed, title: e.title, severity: e.severity, eventId: e.id }));
  return {
    hazard,
    placeId,
    placeName: place?.name ?? null,
    hours,
    unit: "fear mass per hour (sum of p_relevant x p_fear)",
    points,
    officialMarkers: markers,
  };
}

/** Official events visible in the scope within the last `hours`, optionally near a point. */
export async function officialEventsInScope(scope: Scope, opts: { hours: number; hazard?: string; near?: { lat: number; lon: number; km: number }; limit: number }) {
  const since = new Date(scope.asOf.getTime() - opts.hours * HOUR_MS);
  const conds = [eq(officialEventsTable.scenario, scope.scenario), gte(officialEventsTable.startsAt, since), lte(officialEventsTable.startsAt, scope.asOf)];
  if (opts.hazard) conds.push(eq(officialEventsTable.hazard, opts.hazard));
  if (opts.near) {
    const dLat = opts.near.km / 111;
    const dLon = opts.near.km / (111 * Math.max(0.2, Math.cos((opts.near.lat * Math.PI) / 180)));
    conds.push(isNotNull(officialEventsTable.lat), gte(officialEventsTable.lat, opts.near.lat - dLat), lte(officialEventsTable.lat, opts.near.lat + dLat), gte(officialEventsTable.lon, opts.near.lon - dLon), lte(officialEventsTable.lon, opts.near.lon + dLon));
  }
  const rows = await db.select().from(officialEventsTable).where(and(...conds)).orderBy(desc(officialEventsTable.startsAt)).limit(opts.near ? opts.limit * 3 : opts.limit);
  const filtered = opts.near ? rows.filter((e) => haversineKm(opts.near!.lat, opts.near!.lon, e.lat!, e.lon!) <= opts.near!.km).slice(0, opts.limit) : rows;
  return filtered.map(mapOfficialEvent);
}

export function hazardsForBoard() {
  return HAZARDS;
}

export { alertsTable };
