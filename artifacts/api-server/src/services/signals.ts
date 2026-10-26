import { db, signalsHourlyTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import type { RiskLevel } from "../lib/hazards";
import { baselineOf, levelFor, robustZ, round } from "../lib/stats";
import { HOUR_MS } from "../lib/time";

export interface HourAggregate {
  placeId: number;
  hazard: string;
  hour: Date;
  nPosts: number;
  nRelevant: number;
  fearMass: number;
  angerMass: number;
  sadnessMass: number;
  optimismMass: number;
  meanSentiment: number | null;
}

export interface ComputedSignal extends HourAggregate {
  baselineMedian: number;
  baselineMad: number;
  zScore: number;
  level: RiskLevel;
}

interface AggRow {
  place_id: number;
  hazard: string;
  hour: Date;
  n_posts: string | number;
  n_relevant: string | number;
  fear_mass: number | null;
  anger_mass: number | null;
  sadness_mass: number | null;
  optimism_mass: number | null;
  mean_sentiment: number | null;
}

export const seriesKey = (placeId: number, hazard: string) => `${placeId}:${hazard}`;

/** Hourly aggregates per (place, hazard) for posts in [from, to). Only confident place resolutions count. */
export async function aggregateHours(scenario: string, from: Date, to: Date): Promise<HourAggregate[]> {
  const res = await db.execute<AggRow & Record<string, unknown>>(sql`
    select pp.place_id, s.hazard, date_trunc('hour', p.created_at) as hour,
      count(*) as n_posts,
      count(*) filter (where s.p_relevant >= ${DETECTOR.relevanceThreshold}) as n_relevant,
      sum(s.p_relevant * s.p_fear) as fear_mass,
      sum(s.p_relevant * s.p_anger) as anger_mass,
      sum(s.p_relevant * s.p_sadness) as sadness_mass,
      sum(s.p_relevant * coalesce((s.emotions->>'optimism')::real, 0)) as optimism_mass,
      avg(s.sentiment_score) filter (where s.p_relevant >= ${DETECTOR.relevanceThreshold}) as mean_sentiment
    from posts p
    join post_scores s on s.post_id = p.id
    join post_places pp on pp.post_id = p.id and pp.confidence >= ${DETECTOR.placeConfidenceMin}
    where p.scenario = ${scenario} and p.created_at >= ${from} and p.created_at < ${to}
    group by 1, 2, 3
    order by 3
  `);
  return res.rows.map((r) => ({
    placeId: Number(r.place_id),
    hazard: r.hazard,
    hour: new Date(r.hour),
    nPosts: Number(r.n_posts),
    nRelevant: Number(r.n_relevant),
    fearMass: Number(r.fear_mass ?? 0),
    angerMass: Number(r.anger_mass ?? 0),
    sadnessMass: Number(r.sadness_mass ?? 0),
    optimismMass: Number(r.optimism_mass ?? 0),
    meanSentiment: r.mean_sentiment === null ? null : Number(r.mean_sentiment),
  }));
}

/**
 * Recompute signals_hourly for [from, to): aggregate posts, derive the 7-day robust baseline per series
 * (zero-filled, all hours), score each hour and upsert. Returns the computed rows in hour order.
 */
export async function rebuildSignals(scenario: string, from: Date, to: Date): Promise<ComputedSignal[]> {
  const aggregates = await aggregateHours(scenario, from, to);
  if (aggregates.length === 0) return [];
  const series = new Map<string, Map<number, number>>();
  const keys = new Set<string>();
  for (const a of aggregates) keys.add(seriesKey(a.placeId, a.hazard));

  // History for the baseline window that precedes [from, to).
  const historyFrom = new Date(from.getTime() - DETECTOR.baselineDays * 24 * HOUR_MS);
  const history = await db.execute<{ place_id: number; hazard: string; hour_utc: Date; fear_mass: number }>(sql`
    select place_id, hazard, hour_utc, fear_mass from signals_hourly
    where scenario = ${scenario} and hour_utc >= ${historyFrom} and hour_utc < ${from}
  `);
  for (const h of history.rows) {
    const key = seriesKey(Number(h.place_id), h.hazard);
    if (!keys.has(key)) continue;
    let m = series.get(key);
    if (!m) series.set(key, (m = new Map()));
    m.set(new Date(h.hour_utc).getTime(), Number(h.fear_mass));
  }

  const windowHours = DETECTOR.baselineDays * 24;
  const computed: ComputedSignal[] = [];
  for (const a of aggregates) {
    const key = seriesKey(a.placeId, a.hazard);
    let m = series.get(key);
    if (!m) series.set(key, (m = new Map()));
    const t = a.hour.getTime();
    const window: number[] = new Array(windowHours);
    for (let k = 1; k <= windowHours; k++) window[k - 1] = m.get(t - k * HOUR_MS) ?? 0;
    const { median, mad } = baselineOf(window);
    const z = robustZ(a.fearMass, median, mad);
    const level = levelFor(z, a.nRelevant);
    m.set(t, a.fearMass);
    computed.push({ ...a, baselineMedian: round(median, 4), baselineMad: round(mad, 4), zScore: round(z, 3), level });
  }

  // Replace rows in the window so hours that lost all posts (re-scoring) do not linger.
  await db.execute(sql`delete from signals_hourly where scenario = ${scenario} and hour_utc >= ${from} and hour_utc < ${to}`);
  const BATCH = 500;
  for (let i = 0; i < computed.length; i += BATCH) {
    await db.insert(signalsHourlyTable).values(
      computed.slice(i, i + BATCH).map((c) => ({
        placeId: c.placeId,
        hazard: c.hazard,
        hourUtc: c.hour,
        scenario,
        nPosts: c.nPosts,
        nRelevant: c.nRelevant,
        fearMass: round(c.fearMass, 4),
        angerMass: round(c.angerMass, 4),
        sadnessMass: round(c.sadnessMass, 4),
        optimismMass: round(c.optimismMass, 4),
        meanSentiment: c.meanSentiment === null ? null : round(c.meanSentiment, 4),
        baselineMedian: c.baselineMedian,
        baselineMad: c.baselineMad,
        zScore: c.zScore,
        level: c.level,
        computedAt: new Date(),
      })),
    );
  }
  return computed;
}
