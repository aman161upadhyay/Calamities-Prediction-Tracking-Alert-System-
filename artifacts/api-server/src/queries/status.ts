import { db, alertsTable, officialEventsTable, placesTable, postPlacesTable, postScoresTable, postsTable, signalsHourlyTable, sourceStateTable, ingestRunsTable } from "@workspace/db";
import { and, count, countDistinct, eq, gte, isNull, or, sql, gt } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { HOUR_MS } from "../lib/time";
import { mlHealth } from "../ml/client";
import { xBudgetStatus } from "../services/ingest/x";
import { lastIngestAt, staleness } from "./board";
import { emailConfigured } from "../services/notify";

const SOURCE_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  bluesky: "Bluesky",
  model: "Model service",
  gdacs: "GDACS",
  usgs: "USGS earthquakes",
  nws: "US National Weather Service",
  firms: "NASA FIRMS",
  openmeteo: "Open-Meteo",
};

export async function systemStatus() {
  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * HOUR_MS);
  const h72 = new Date(now.getTime() - 72 * HOUR_MS);
  const [states, health, budget, last, posts24, scored24, relevant24, geolocated24, series24, alerts24, openAlerts, official24, official72, placesTracked, runs24] = await Promise.all([
    db.select().from(sourceStateTable),
    mlHealth(),
    xBudgetStatus(),
    lastIngestAt(),
    db.select({ n: count() }).from(postsTable).where(and(eq(postsTable.scenario, ""), gte(postsTable.ingestedAt, h24))),
    db.select({ n: count() }).from(postScoresTable).innerJoin(postsTable, eq(postsTable.id, postScoresTable.postId)).where(and(eq(postsTable.scenario, ""), gte(postScoresTable.scoredAt, h24))),
    db.select({ n: count() }).from(postScoresTable).innerJoin(postsTable, eq(postsTable.id, postScoresTable.postId)).where(and(eq(postsTable.scenario, ""), gte(postsTable.createdAt, h24), gte(postScoresTable.pRelevant, DETECTOR.relevanceThreshold))),
    db.execute<{ n: string }>(sql`select count(distinct p.id) as n from posts p join post_places pp on pp.post_id = p.id and pp.confidence >= ${DETECTOR.placeConfidenceMin} where p.scenario = '' and p.created_at >= ${h24}`),
    db.execute<{ n: string }>(sql`select count(*) as n from (select distinct place_id, hazard from signals_hourly where scenario = '' and hour_utc >= ${h24}) s`),
    db.select({ n: count() }).from(alertsTable).where(and(eq(alertsTable.scenario, ""), gte(alertsTable.openedAt, h24))),
    db.select({ n: count() }).from(alertsTable).where(and(eq(alertsTable.scenario, ""), eq(alertsTable.status, "open"))),
    db.select({ n: count() }).from(officialEventsTable).where(and(eq(officialEventsTable.scenario, ""), gte(officialEventsTable.fetchedAt, h24))),
    db.select({ n: count() }).from(officialEventsTable).where(and(eq(officialEventsTable.scenario, ""), gte(officialEventsTable.startsAt, h72))),
    db.execute<{ n: string }>(sql`select count(distinct place_id) as n from signals_hourly where scenario = '' and hour_utc >= ${h24}`),
    db.select({ source: ingestRunsTable.source, items: sql<number>`coalesce(sum(${ingestRunsTable.itemsNew}), 0)::int` }).from(ingestRunsTable).where(and(gte(ingestRunsTable.startedAt, h24), eq(ingestRunsTable.status, "ok"))).groupBy(ingestRunsTable.source),
  ]);
  const stateMap = new Map(states.map((s) => [s.name, s]));
  const items24 = new Map(runs24.map((r) => [r.source, Number(r.items)]));
  const sourceHealth = (name: string) => {
    const s = stateMap.get(name);
    return {
      name,
      label: SOURCE_LABELS[name] ?? name,
      state: (s?.state ?? "idle") as "ok" | "offline" | "not_configured" | "budget_reached" | "error" | "idle",
      lastSuccessAt: s?.lastSuccessAt ? s.lastSuccessAt.toISOString() : null,
      detail: s?.detail ?? "No run yet.",
      itemsLast24h: items24.get(name) ?? null,
    };
  };
  const modelHealth = {
    name: "model",
    label: SOURCE_LABELS.model!,
    state: (health ? (health.ready ? "ok" : health.error ? "error" : "idle") : "offline") as "ok" | "offline" | "error" | "idle",
    lastSuccessAt: health?.ready ? now.toISOString() : null,
    detail: health ? (health.ready ? `Ready, version ${health.modelVersion}, ${health.gazetteerPlaces.toLocaleString("en-US")} gazetteer places` : health.error ?? "Loading models (about a minute after start)") : "Model service is not responding.",
    itemsLast24h: Number(scored24[0]!.n),
  };
  return {
    now: now.toISOString(),
    lastIngestAt: last ? last.toISOString() : null,
    modelVersion: health?.modelVersion ?? "unknown",
    modelReady: Boolean(health?.ready),
    experimental: true,
    emailDeliveryConfigured: emailConfigured(),
    isStale: staleness(last, now),
    sources: [sourceHealth("x"), sourceHealth("bluesky"), modelHealth],
    officialFeeds: ["gdacs", "usgs", "nws", "firms", "openmeteo"].map(sourceHealth),
    pipeline: [
      { key: "fetched", label: "Fetched", description: "Public posts matching the hazard search terms", countLast24h: Number(posts24[0]!.n), unit: "posts" },
      { key: "scored", label: "Scored", description: "Posts run through relevance, hazard, emotion and sentiment models", countLast24h: Number(scored24[0]!.n), unit: "posts" },
      { key: "relevant", label: "Relevant", description: "Posts the model judged to be about a real hazard (p_relevant at or above 0.5)", countLast24h: Number(relevant24[0]!.n), unit: "posts" },
      { key: "geolocated", label: "Placed", description: "Posts with a place resolved at confidence 0.5 or more", countLast24h: Number(geolocated24.rows[0]!.n), unit: "posts" },
      { key: "series", label: "Series updated", description: "Place and hazard pairs with an hourly signal", countLast24h: Number(series24.rows[0]!.n), unit: "series" },
      { key: "alerts", label: "Alerts opened", description: "Series that stayed at elevated or above for two consecutive hours", countLast24h: Number(alerts24[0]!.n), unit: "alerts" },
      { key: "official", label: "Official events", description: "Events fetched from GDACS, USGS, NWS and FIRMS", countLast24h: Number(official24[0]!.n), unit: "events" },
    ],
    counts: {
      postsLast24h: Number(posts24[0]!.n),
      relevantLast24h: Number(relevant24[0]!.n),
      openAlerts: Number(openAlerts[0]!.n),
      placesTracked: Number(placesTracked.rows[0]!.n),
      officialEventsLast72h: Number(official72[0]!.n),
    },
    xBudget: budget,
    activeScenario: null,
  };
}

export { placesTable, postPlacesTable, signalsHourlyTable, countDistinct, isNull, or, gt };
