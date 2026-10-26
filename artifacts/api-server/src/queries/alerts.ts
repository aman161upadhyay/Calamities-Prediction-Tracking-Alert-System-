import { db, alertEventsTable, alertsTable, officialEventsTable, placesTable, postPlacesTable, postScoresTable, postsTable } from "@workspace/db";
import { and, desc, eq, gt, gte, inArray, isNull, lte, or, sql, asc } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { levelRank } from "../lib/hazards";
import { HOUR_MS } from "../lib/time";
import { ApiError, asOfAdjustments, mapAlert, type Scope } from "./common";
import { postsWithPlaces } from "./posts";
import { buildTimeline } from "./series";

async function hydrate(rows: (typeof alertsTable.$inferSelect)[], scope: Scope) {
  if (rows.length === 0) return [];
  const [places, officials, adjust] = await Promise.all([
    db.select().from(placesTable).where(inArray(placesTable.id, [...new Set(rows.map((r) => r.placeId))])),
    (async () => {
      const ids = rows.map((r) => r.officialEventId).filter((x): x is number => x !== null);
      return ids.length ? db.select().from(officialEventsTable).where(inArray(officialEventsTable.id, ids)) : [];
    })(),
    asOfAdjustments(rows, scope),
  ]);
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const officialMap = new Map(officials.map((o) => [o.id, o]));
  return rows
    .filter((r) => placeMap.has(r.placeId))
    .map((r) => mapAlert(r, placeMap.get(r.placeId)!, r.officialEventId ? officialMap.get(r.officialEventId) ?? null : null, scope, adjust.get(r.id)));
}

export async function openAlerts(scope: Scope, opts: { hazard?: string; placeId?: number; limit?: number } = {}) {
  const conds = [eq(alertsTable.scenario, scope.scenario), lte(alertsTable.openedAt, scope.asOf), or(isNull(alertsTable.closedAt), gt(alertsTable.closedAt, scope.asOf))];
  if (opts.hazard) conds.push(eq(alertsTable.hazard, opts.hazard));
  if (opts.placeId) conds.push(eq(alertsTable.placeId, opts.placeId));
  const rows = await db.select().from(alertsTable).where(and(...conds)).orderBy(desc(alertsTable.openedAt)).limit(opts.limit ?? 200);
  const mapped = await hydrate(rows, scope);
  mapped.sort((a, b) => levelRank(b.currentLevel) - levelRank(a.currentLevel) || b.openedAt.localeCompare(a.openedAt));
  return mapped;
}

export async function listAlerts(scope: Scope, opts: { status?: "open" | "closed"; hazard?: string; placeId?: number; limit: number }) {
  const conds = [eq(alertsTable.scenario, scope.scenario), lte(alertsTable.openedAt, scope.asOf)];
  if (opts.status === "open") conds.push(or(isNull(alertsTable.closedAt), gt(alertsTable.closedAt, scope.asOf))!);
  if (opts.status === "closed") conds.push(lte(alertsTable.closedAt, scope.asOf));
  if (opts.hazard) conds.push(eq(alertsTable.hazard, opts.hazard));
  if (opts.placeId) conds.push(eq(alertsTable.placeId, opts.placeId));
  const rows = await db.select().from(alertsTable).where(and(...conds)).orderBy(desc(alertsTable.openedAt)).limit(opts.limit);
  const mapped = await hydrate(rows, scope);
  mapped.sort((a, b) => (a.status === b.status ? b.openedAt.localeCompare(a.openedAt) : a.status === "open" ? -1 : 1));
  return mapped;
}

export async function alertDetail(alertId: number, asOfParam: Date | null) {
  const [row] = await db.select().from(alertsTable).where(eq(alertsTable.id, alertId)).limit(1);
  if (!row) throw new ApiError(404, "Alert not found");
  const scope: Scope = { scenario: row.scenario, asOf: asOfParam ?? new Date(), isReplay: row.scenario !== "" };
  if (row.openedAt.getTime() > scope.asOf.getTime()) throw new ApiError(404, "Alert has not opened yet at this point of the replay");
  const [alert] = await hydrate([row], scope);
  const endAt = new Date(Math.min(scope.asOf.getTime(), row.closedAt ? row.closedAt.getTime() + 24 * HOUR_MS : scope.asOf.getTime()));
  const startAt = new Date(row.openedAt.getTime() - 48 * HOUR_MS);
  const hours = Math.max(12, Math.min(336, Math.ceil((endAt.getTime() - startAt.getTime()) / HOUR_MS)));
  const timeline = await buildTimeline({ ...scope, asOf: endAt }, row.hazard, row.placeId, hours);
  const evidenceEnd = new Date(Math.min(scope.asOf.getTime(), row.closedAt ? row.closedAt.getTime() : scope.asOf.getTime()));
  const evidenceRows = await db
    .select({ post: postsTable, score: postScoresTable })
    .from(postsTable)
    .innerJoin(postScoresTable, eq(postScoresTable.postId, postsTable.id))
    // The same eligibility as the hourly aggregation: a place resolution at or above the confidence floor and a
    // relevant score. Anything weaker never counted toward the series, so it is not evidence.
    .innerJoin(postPlacesTable, and(eq(postPlacesTable.postId, postsTable.id), eq(postPlacesTable.placeId, row.placeId), gte(postPlacesTable.confidence, DETECTOR.placeConfidenceMin)))
    .where(
      and(
        eq(postsTable.scenario, row.scenario),
        eq(postScoresTable.hazard, row.hazard),
        gte(postScoresTable.pRelevant, DETECTOR.relevanceThreshold),
        gte(postsTable.createdAt, new Date(row.openedAt.getTime() - 3 * HOUR_MS)),
        lte(postsTable.createdAt, evidenceEnd),
      ),
    )
    .orderBy(desc(sql`${postScoresTable.pRelevant} * ${postScoresTable.pFear}`))
    .limit(20);
  const evidencePosts = await postsWithPlaces(evidenceRows);
  const events = await db.select().from(alertEventsTable).where(and(eq(alertEventsTable.alertId, alertId), lte(alertEventsTable.at, scope.asOf))).orderBy(asc(alertEventsTable.at));
  return {
    alert: alert!,
    timeline,
    evidencePosts,
    events: events.map((e) => ({ at: e.at.toISOString(), type: e.type, detail: e.detail })),
  };
}
