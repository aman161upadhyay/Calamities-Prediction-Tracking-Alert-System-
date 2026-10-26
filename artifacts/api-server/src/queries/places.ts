import { db, placesTable, type Place } from "@workspace/db";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { HAZARDS, levelRank, type RiskLevel } from "../lib/hazards";
import { round, trendOf } from "../lib/stats";
import { HOUR_MS, floorHour } from "../lib/time";
import { latestWeather } from "../services/weather";
import { listAlerts, openAlerts } from "./alerts";
import { ApiError, type Scope, knownHour } from "./common";
import { listPosts } from "./posts";
import { currentRows, daySummaries, officialEventsInScope } from "./series";

function mapPlace(p: Place) {
  return { id: p.id, name: p.name, admin1: p.admin1, country: p.country, countryCode: p.countryCode, lat: p.lat, lon: p.lon, population: p.population, featured: p.featured };
}

export async function listPlaces(scope: Scope, opts: { q?: string; featured?: boolean }) {
  const [cur, day, alerts] = await Promise.all([currentRows(scope), daySummaries(scope), openAlerts(scope, { limit: 500 })]);
  const activeIds = new Set([...day.values()].map((d) => d.placeId));
  let rows: Place[];
  if (opts.q) {
    rows = await db.select().from(placesTable).where(ilike(placesTable.name, `%${opts.q.replace(/[%_]/g, "")}%`)).limit(100);
  } else if (opts.featured) {
    rows = await db.select().from(placesTable).where(eq(placesTable.featured, true));
  } else {
    const ids = [...activeIds];
    rows = await db.select().from(placesTable).where(ids.length ? or(eq(placesTable.featured, true), inArray(placesTable.id, ids))! : eq(placesTable.featured, true));
  }
  const items = rows.map((p) => {
    let worstLevel: RiskLevel = "insufficient";
    let worstHazard: string | undefined;
    let rel24 = 0;
    for (const h of HAZARDS) {
      const c = cur.get(`${p.id}:${h.id}`);
      const d = day.get(`${p.id}:${h.id}`);
      rel24 += d?.rel24 ?? 0;
      if (c && levelRank(c.level) > levelRank(worstLevel)) {
        worstLevel = c.level;
        worstHazard = h.id;
      }
    }
    return { place: mapPlace(p), worstLevel, ...(worstHazard ? { worstHazard } : {}), relevantLast24h: rel24, openAlerts: alerts.filter((a) => a.placeId === p.id).length };
  });
  items.sort((a, b) => levelRank(b.worstLevel) - levelRank(a.worstLevel) || b.relevantLast24h - a.relevantLast24h || Number(b.place.featured) - Number(a.place.featured) || a.place.name.localeCompare(b.place.name));
  return items.slice(0, 200);
}

export async function placeDetail(scope: Scope, placeId: number) {
  const [place] = await db.select().from(placesTable).where(eq(placesTable.id, placeId)).limit(1);
  if (!place) throw new ApiError(404, "Place not found");
  const upto = knownHour(scope);
  const [cur, day, sparkRes, alerts, nearby, weather, recentPosts] = await Promise.all([
    currentRows(scope),
    daySummaries(scope),
    db.execute<{ hazard: string; hour_utc: Date; fear_mass: number }>(sql`
      select hazard, hour_utc, fear_mass from signals_hourly
      where scenario = ${scope.scenario} and place_id = ${placeId} and hour_utc > ${new Date(upto.getTime() - 24 * HOUR_MS)} and hour_utc <= ${upto}
    `),
    listAlerts(scope, { placeId, limit: 20 }),
    officialEventsInScope(scope, { hours: 72, near: { lat: place.lat, lon: place.lon, km: DETECTOR.corroborationRadiusKm }, limit: 20 }),
    scope.isReplay ? Promise.resolve(null) : latestWeather(placeId),
    listPosts(scope, { placeId, minRelevance: 0, limit: 20 }),
  ]);
  const spark = new Map<string, Map<number, number>>();
  for (const r of sparkRes.rows) {
    let m = spark.get(r.hazard);
    if (!m) spark.set(r.hazard, (m = new Map()));
    m.set(new Date(r.hour_utc).getTime(), Number(r.fear_mass));
  }
  const hazards = HAZARDS.map((h) => {
    const c = cur.get(`${placeId}:${h.id}`);
    const d = day.get(`${placeId}:${h.id}`);
    const m = spark.get(h.id) ?? new Map<number, number>();
    const sparkline: number[] = [];
    for (let t = upto.getTime() - 23 * HOUR_MS; t <= upto.getTime(); t += HOUR_MS) sparkline.push(round(m.get(t) ?? 0, 2));
    return {
      hazard: h.id,
      level: c ? c.level : ("insufficient" as RiskLevel),
      zScore: c ? round(c.zScore, 2) : null,
      relevantLast24h: d?.rel24 ?? 0,
      trend: d ? trendOf(d.recent3, d.prev3) : ("flat" as const),
      sparkline,
    };
  });
  return {
    place: mapPlace(place),
    hazards,
    alerts,
    nearbyOfficialEvents: nearby,
    weather: weather
      ? {
          fetchedAt: weather.fetchedAt.toISOString(),
          provider: "Open-Meteo (GloFAS river discharge and 3-day forecast)",
          riverDischargeM3s: weather.riverDischargeM3s,
          riverDischargeMax7dM3s: weather.riverDischargeMax7dM3s,
          precipitationNext72hMm: weather.precipitationNext72hMm === null ? null : round(weather.precipitationNext72hMm, 1),
          tempMaxNext72hC: weather.tempMaxNext72hC,
          windGustMaxNext72hKmh: weather.windGustMaxNext72hKmh,
        }
      : null,
    recentPosts,
  };
}

export { and };
