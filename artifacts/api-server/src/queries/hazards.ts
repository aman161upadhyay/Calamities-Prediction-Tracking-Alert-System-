import { knownHour } from "./common";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { hazardMeta } from "../lib/hazards";
import { round } from "../lib/stats";
import { HOUR_MS, floorHour } from "../lib/time";
import { hazardSummaries } from "./board";
import type { Scope } from "./common";
import { listPosts } from "./posts";
import { buildTimeline, placeSignals } from "./series";

async function emotionMix(scope: Scope, hazard: string, hours = 72) {
  const end = knownHour(scope);
  const start = new Date(end.getTime() - (hours - 1) * HOUR_MS);
  const res = await db.execute<{ hour: Date; n: number; fear: number; anger: number; sadness: number; optimism: number; other: number }>(sql`
    select date_trunc('hour', p.created_at) as hour, count(*)::int as n,
      avg(s.p_fear)::float8 as fear, avg(s.p_anger)::float8 as anger, avg(s.p_sadness)::float8 as sadness,
      avg(coalesce((s.emotions->>'optimism')::float8, 0))::float8 as optimism,
      avg(greatest(coalesce((s.emotions->>'joy')::float8, 0), coalesce((s.emotions->>'surprise')::float8, 0), coalesce((s.emotions->>'anticipation')::float8, 0),
                   coalesce((s.emotions->>'disgust')::float8, 0), coalesce((s.emotions->>'pessimism')::float8, 0), coalesce((s.emotions->>'trust')::float8, 0)))::float8 as other
    from posts p join post_scores s on s.post_id = p.id
    where p.scenario = ${scope.scenario} and s.hazard = ${hazard} and s.p_relevant >= ${DETECTOR.relevanceThreshold}
      and p.created_at >= ${start} and p.created_at <= ${scope.asOf}
    group by 1 order by 1
  `);
  const by = new Map(res.rows.map((r) => [new Date(r.hour).getTime(), r]));
  const out = [];
  for (let t = start.getTime(); t <= end.getTime(); t += HOUR_MS) {
    const r = by.get(t);
    out.push({
      hour: new Date(t).toISOString(),
      fear: round(Number(r?.fear ?? 0), 3),
      anger: round(Number(r?.anger ?? 0), 3),
      sadness: round(Number(r?.sadness ?? 0), 3),
      optimism: round(Number(r?.optimism ?? 0), 3),
      other: round(Number(r?.other ?? 0), 3),
      nRelevant: Number(r?.n ?? 0),
    });
  }
  return out;
}

export async function hazardDetail(scope: Scope, hazard: string) {
  const meta = hazardMeta(hazard);
  const [summaries, mix, places, recentPosts, timeline] = await Promise.all([
    hazardSummaries(scope),
    emotionMix(scope, hazard),
    placeSignals(scope, { hazard, limit: 200 }),
    listPosts(scope, { hazard, minRelevance: DETECTOR.relevanceThreshold, limit: 20 }),
    buildTimeline(scope, hazard, null, 72),
  ]);
  const summary = summaries.find((s) => s.hazard === hazard)!;
  return {
    summary,
    keywords: [...new Set([...meta.search, ...meta.terms])],
    emotionMix: mix,
    places,
    recentPosts,
    timeline,
  };
}
