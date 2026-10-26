import { db, ingestRunsTable } from "@workspace/db";
import { and, eq, inArray, max, sql } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { HAZARDS, levelRank, maxLevel, type RiskLevel } from "../lib/hazards";
import { round } from "../lib/stats";
import { HOUR_MS, floorHour } from "../lib/time";
import { openAlerts } from "./alerts";
import type { Scope } from "./common";
import { currentRows, officialEventsInScope, placeSignals } from "./series";
import { placesByIds } from "../services/places";

export async function lastIngestAt(): Promise<Date | null> {
  const rows = await db
    .select({ at: max(ingestRunsTable.finishedAt) })
    .from(ingestRunsTable)
    .where(and(inArray(ingestRunsTable.source, ["x", "bluesky"]), eq(ingestRunsTable.status, "ok")));
  return rows[0]?.at ?? null;
}

export function staleness(last: Date | null, now = new Date()): boolean {
  return !last || now.getTime() - last.getTime() > DETECTOR.staleAfterMinutes * 60_000;
}

interface HazardAgg {
  hazard: string;
  posts24: number;
  rel24: number;
  fearNow: number;
  fearPrev: number;
}

export async function hazardSummaries(scope: Scope) {
  const asOf = scope.asOf;
  const h24 = new Date(asOf.getTime() - 24 * HOUR_MS);
  const h25 = new Date(asOf.getTime() - 25 * HOUR_MS);
  const h1 = new Date(asOf.getTime() - HOUR_MS);
  const [aggRes, sparkRes, cur, alerts] = await Promise.all([
    db.execute<HazardAgg & Record<string, unknown>>(sql`
      select s.hazard,
        count(*) filter (where p.created_at > ${h24})::int as posts24,
        count(*) filter (where p.created_at > ${h24} and s.p_relevant >= ${DETECTOR.relevanceThreshold})::int as rel24,
        coalesce(sum(s.p_relevant * s.p_fear) filter (where p.created_at > ${h1}), 0)::float8 as "fearNow",
        coalesce(sum(s.p_relevant * s.p_fear) filter (where p.created_at > ${h25} and p.created_at <= ${h24}), 0)::float8 as "fearPrev"
      from posts p join post_scores s on s.post_id = p.id
      where p.scenario = ${scope.scenario} and p.created_at > ${h25} and p.created_at <= ${asOf}
      group by 1
    `),
    db.execute<{ hazard: string; hour: Date; fear: number }>(sql`
      select s.hazard, date_trunc('hour', p.created_at) as hour, coalesce(sum(s.p_relevant * s.p_fear), 0)::float8 as fear
      from posts p join post_scores s on s.post_id = p.id
      where p.scenario = ${scope.scenario} and p.created_at >= ${new Date(floorHour(asOf).getTime() - 23 * HOUR_MS)} and p.created_at <= ${asOf}
      group by 1, 2
    `),
    currentRows(scope),
    openAlerts(scope),
  ]);
  const agg = new Map(aggRes.rows.map((r) => [r.hazard, r]));
  const spark = new Map<string, Map<number, number>>();
  for (const r of sparkRes.rows) {
    let m = spark.get(r.hazard);
    if (!m) spark.set(r.hazard, (m = new Map()));
    m.set(new Date(r.hour).getTime(), Number(r.fear));
  }
  const top = new Map<string, { placeId: number; z: number; level: RiskLevel }[]>();
  for (const row of cur.values()) {
    if (levelRank(row.level) < levelRank("elevated")) continue;
    const list = top.get(row.hazard) ?? [];
    list.push({ placeId: row.placeId, z: row.zScore, level: row.level });
    top.set(row.hazard, list);
  }
  const topIds = [...top.values()].flat().map((t) => t.placeId);
  const places = await placesByIds(topIds);
  const start = floorHour(asOf).getTime() - 23 * HOUR_MS;
  return HAZARDS.map((h) => {
    const a = agg.get(h.id);
    const m = spark.get(h.id) ?? new Map<number, number>();
    const sparkline: number[] = [];
    for (let t = start; t <= floorHour(asOf).getTime(); t += HOUR_MS) sparkline.push(round(m.get(t) ?? 0, 2));
    const levels = [...cur.values()].filter((r) => r.hazard === h.id).map((r) => r.level);
    const topPlaces = (top.get(h.id) ?? [])
      .sort((x, y) => levelRank(y.level) - levelRank(x.level) || y.z - x.z)
      .slice(0, 3)
      .map((t) => ({ placeId: t.placeId, name: places.get(t.placeId)?.name ?? "", country: places.get(t.placeId)?.country ?? "", level: t.level }))
      .filter((t) => t.name !== "");
    const fearNow = Number(a?.fearNow ?? 0);
    const fearPrev = Number(a?.fearPrev ?? 0);
    return {
      hazard: h.id,
      label: h.label,
      description: h.description,
      color: h.color,
      postsLast24h: Number(a?.posts24 ?? 0),
      relevantLast24h: Number(a?.rel24 ?? 0),
      fearIndexNow: round(fearNow, 2),
      fearIndexDelta24h: round(fearNow - fearPrev, 2),
      maxLevel: levels.length ? maxLevel(levels) : ("insufficient" as RiskLevel),
      openAlerts: alerts.filter((al) => al.hazard === h.id).length,
      topPlaces,
      sparkline,
    };
  });
}

export async function boardSnapshot(scope: Scope) {
  const [hazards, places, alerts, officialEvents, last] = await Promise.all([
    hazardSummaries(scope),
    placeSignals(scope, { limit: 300 }),
    openAlerts(scope, { limit: 100 }),
    officialEventsInScope(scope, { hours: 72, limit: 200 }),
    scope.isReplay ? Promise.resolve(null) : lastIngestAt(),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    asOf: scope.asOf.toISOString(),
    scenario: scope.isReplay ? scope.scenario : null,
    lastIngestAt: scope.isReplay ? scope.asOf.toISOString() : last ? last.toISOString() : null,
    isStale: scope.isReplay ? false : staleness(last),
    hazards,
    places,
    openAlerts: alerts,
    officialEvents,
  };
}
