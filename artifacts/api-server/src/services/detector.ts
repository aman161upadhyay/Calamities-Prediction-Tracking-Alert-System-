import { db, alertEventsTable, alertsTable, officialEventsTable, placesTable, type Alert } from "@workspace/db";
import { and, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { DETECTOR } from "../lib/config";
import { COMPATIBLE, levelRank, type HazardId, type RiskLevel } from "../lib/hazards";
import { logger } from "../lib/logger";
import { feedLabel } from "../lib/feeds";
import { haversineKm } from "../lib/stats";
import { HOUR_MS, fmtUtc, minutesBetween } from "../lib/time";
import { alertSummary } from "../lib/summary";
import type { ComputedSignal } from "./signals";
import { seriesKey } from "./signals";

export interface DetectorOptions {
  scenario: string;
  rows: ComputedSignal[];
  /** First hour (inclusive) that is not yet complete; hours before it are final. */
  firstIncompleteHour: Date;
  /** When true, openedAt is the wall clock (live). Otherwise the end of the second elevated hour (replay). */
  live: boolean;
}

export interface DetectorOutcome {
  opened: Alert[];
  upgraded: Alert[];
  closed: number;
}

const ELEVATED = levelRank("elevated");
const LOW = levelRank("low");


async function addEvent(alertId: number, at: Date, type: string, detail: string) {
  await db.insert(alertEventsTable).values({ alertId, at, type, detail });
}

/** Apply the open/close state machine to computed signal rows. Idempotent per complete hour. */
export async function runDetector(opts: DetectorOptions): Promise<DetectorOutcome> {
  const outcome: DetectorOutcome = { opened: [], upgraded: [], closed: 0 };
  const bySeries = new Map<string, Map<number, ComputedSignal>>();
  for (const r of opts.rows) {
    const key = seriesKey(r.placeId, r.hazard);
    let m = bySeries.get(key);
    if (!m) bySeries.set(key, (m = new Map()));
    m.set(r.hour.getTime(), r);
  }
  const openAlerts = await db.select().from(alertsTable).where(and(eq(alertsTable.scenario, opts.scenario), eq(alertsTable.status, "open")));
  const openBySeries = new Map(openAlerts.map((a) => [seriesKey(a.placeId, a.hazard), a] as const));
  const seriesToVisit = new Set<string>([...openBySeries.keys()]);
  for (const [key, m] of bySeries) if ([...m.values()].some((r) => levelRank(r.level) >= ELEVATED)) seriesToVisit.add(key);
  if (seriesToVisit.size === 0) return outcome;

  const placeIds = [...seriesToVisit].map((k) => Number(k.split(":")[0]));
  const places = new Map((await db.select().from(placesTable).where(inArray(placesTable.id, [...new Set(placeIds)]))).map((p) => [p.id, p] as const));
  const firstIncomplete = opts.firstIncompleteHour.getTime();

  for (const key of seriesToVisit) {
    const [placeIdRaw, hazard] = key.split(":") as [string, string];
    const placeId = Number(placeIdRaw);
    const place = places.get(placeId);
    if (!place) continue;
    const rows = bySeries.get(key) ?? new Map<number, ComputedSignal>();
    const levelAt = (t: number): { level: RiskLevel; z: number; n: number } => {
      const r = rows.get(t);
      return r ? { level: r.level, z: r.zScore, n: r.nRelevant } : { level: "insufficient", z: 0, n: 0 };
    };
    let alert: Alert | null = openBySeries.get(key) ?? null;
    const hours = [...rows.keys()].sort((a, b) => a - b);
    let start = alert?.lastHourUtc ? alert.lastHourUtc.getTime() + HOUR_MS : hours[0];
    if (start === undefined) continue;
    const lastComplete = firstIncomplete - HOUR_MS;
    // Do not walk through long silent stretches hour by hour when nothing is open.
    if (!alert && hours.length > 0 && start < hours[0]!) start = hours[0]!;

    for (let t = start; t <= lastComplete; t += HOUR_MS) {
      const cur = levelAt(t);
      if (!alert) {
        if (!rows.has(t)) {
          const next = hours.find((h) => h > t);
          if (next === undefined) break;
          t = next - HOUR_MS;
          continue;
        }
        const prev = levelAt(t - HOUR_MS);
        if (levelRank(cur.level) >= ELEVATED && levelRank(prev.level) >= ELEVATED) {
          const peak = cur.z >= prev.z ? { z: cur.z, at: new Date(t), level: cur.level, n: cur.n } : { z: prev.z, at: new Date(t - HOUR_MS), level: prev.level, n: prev.n };
          const peakLevel = levelRank(cur.level) >= levelRank(prev.level) ? cur.level : prev.level;
          const openedAt = opts.live ? new Date() : new Date(t + HOUR_MS);
          const [created] = await db
            .insert(alertsTable)
            .values({
              placeId,
              hazard,
              scenario: opts.scenario,
              status: "open",
              peakLevel,
              currentLevel: cur.level,
              openedAt,
              peakZ: peak.z,
              peakAt: peak.at,
              peakN: peak.n,
              postCount: cur.n + prev.n,
              summary: alertSummary(hazard, place.name, peak.n, peak.z, peak.at, peakLevel),
              corroborationState: "pending",
              lowStreak: 0,
              lastHourUtc: new Date(t),
              updatedAt: new Date(),
            })
            .returning();
          alert = created!;
          await addEvent(alert.id, openedAt, "opened", `Two consecutive hours at elevated or above (z ${prev.z.toFixed(1)} then ${cur.z.toFixed(1)}); level ${cur.level}.`);
          outcome.opened.push(alert);
        }
        continue;
      }
      // Open alert: update, count low hours, close after the streak.
      const patch: Partial<Alert> = { lastHourUtc: new Date(t), updatedAt: new Date(), postCount: alert.postCount + cur.n };
      if (cur.z > alert.peakZ) {
        patch.peakZ = cur.z;
        patch.peakAt = new Date(t);
        patch.peakN = cur.n;
      }
      if (levelRank(cur.level) > levelRank(alert.peakLevel)) patch.peakLevel = cur.level;
      if (cur.level !== alert.currentLevel) {
        await addEvent(alert.id, new Date(t + HOUR_MS), "level_changed", `${alert.currentLevel} to ${cur.level} for the hour starting ${fmtUtc(new Date(t))} (z ${cur.z.toFixed(1)}, ${cur.n} relevant posts).`);
        if (levelRank(cur.level) > levelRank(alert.currentLevel)) outcome.upgraded.push({ ...alert, ...patch, currentLevel: cur.level } as Alert);
        patch.currentLevel = cur.level;
      }
      patch.lowStreak = levelRank(cur.level) <= LOW ? alert.lowStreak + 1 : 0;
      if (patch.peakZ !== undefined || patch.peakLevel !== undefined) {
        patch.summary = alertSummary(hazard, place.name, patch.peakN ?? alert.peakN ?? cur.n, patch.peakZ ?? alert.peakZ, patch.peakAt ?? alert.peakAt, patch.peakLevel ?? alert.peakLevel);
      }
      if (patch.lowStreak >= DETECTOR.closeAfterHours) {
        patch.status = "closed";
        patch.closedAt = new Date(t + HOUR_MS);
        await addEvent(alert.id, patch.closedAt, "closed", `${DETECTOR.closeAfterHours} consecutive hours at low or insufficient.`);
        outcome.closed += 1;
      }
      await db.update(alertsTable).set(patch).where(eq(alertsTable.id, alert.id));
      alert = patch.status === "closed" ? null : ({ ...alert, ...patch } as Alert);
    }

    // Partial (current) hour: may open or raise, never close.
    const partial = rows.get(firstIncomplete);
    if (partial && opts.live) {
      const cur = { level: partial.level, z: partial.zScore, n: partial.nRelevant };
      const prev = levelAt(firstIncomplete - HOUR_MS);
      if (!alert && levelRank(cur.level) >= ELEVATED && levelRank(prev.level) >= ELEVATED) {
        const peak = cur.z >= prev.z ? { z: cur.z, at: new Date(firstIncomplete), n: cur.n } : { z: prev.z, at: new Date(firstIncomplete - HOUR_MS), n: prev.n };
        const peakLevel = levelRank(cur.level) >= levelRank(prev.level) ? cur.level : prev.level;
        const openedAt = new Date();
        const [created] = await db
          .insert(alertsTable)
          .values({
            placeId,
            hazard,
            scenario: opts.scenario,
            status: "open",
            peakLevel,
            currentLevel: cur.level,
            openedAt,
            peakZ: peak.z,
            peakAt: peak.at,
            peakN: peak.n,
            postCount: prev.n,
            summary: alertSummary(hazard, place.name, peak.n, peak.z, peak.at, peakLevel),
            corroborationState: "pending",
            lowStreak: 0,
            lastHourUtc: new Date(firstIncomplete - HOUR_MS),
            updatedAt: new Date(),
          })
          .returning();
        await addEvent(created!.id, openedAt, "opened", `The previous hour and the current hour so far are both at elevated or above (z ${prev.z.toFixed(1)} then ${cur.z.toFixed(1)}); level ${cur.level}.`);
        outcome.opened.push(created!);
      } else if (alert && levelRank(cur.level) > levelRank(alert.currentLevel)) {
        const patch: Partial<Alert> = { currentLevel: cur.level, updatedAt: new Date() };
        if (cur.z > alert.peakZ) {
          patch.peakZ = cur.z;
          patch.peakAt = new Date(firstIncomplete);
          patch.peakN = cur.n;
        }
        if (levelRank(cur.level) > levelRank(alert.peakLevel)) patch.peakLevel = cur.level;
        if (patch.peakZ !== undefined || patch.peakLevel !== undefined) {
          patch.summary = alertSummary(hazard, place.name, patch.peakN ?? alert.peakN ?? cur.n, patch.peakZ ?? alert.peakZ, patch.peakAt ?? alert.peakAt, patch.peakLevel ?? alert.peakLevel);
        }
        await addEvent(alert.id, new Date(), "level_changed", `Level rose from ${alert.currentLevel} to ${cur.level} in the current hour (z ${cur.z.toFixed(1)}, ${cur.n} relevant posts so far).`);
        await db.update(alertsTable).set(patch).where(eq(alertsTable.id, alert.id));
        outcome.upgraded.push({ ...alert, ...patch } as Alert);
      }
    }
  }
  if (outcome.opened.length || outcome.closed) logger.info({ scenario: opts.scenario || "live", opened: outcome.opened.length, closed: outcome.closed }, "detector");
  return outcome;
}

/**
 * Match pending alerts with official events: same hazard family, within 250 km (or the place's own extent for a
 * region or country), and active in the window from 24 h before the alert opened to 48 h after. An event is active
 * from its start until its recorded end, or for 72 h when the feed records none, so an alert raised on day two of a
 * flood still matches the flood.
 */
export async function corroborateAlerts(scenario: string, asOf: Date): Promise<number> {
  const pending = await db.select().from(alertsTable).where(and(eq(alertsTable.scenario, scenario), eq(alertsTable.corroborationState, "pending")));
  if (pending.length === 0) return 0;
  const places = new Map((await db.select().from(placesTable).where(inArray(placesTable.id, [...new Set(pending.map((a) => a.placeId))]))).map((p) => [p.id, p] as const));
  let matched = 0;
  for (const alert of pending) {
    const place = places.get(alert.placeId);
    if (!place) continue;
    const from = new Date(alert.openedAt.getTime() - DETECTOR.corroborationLookbackHours * HOUR_MS);
    const to = new Date(alert.openedAt.getTime() + DETECTOR.corroborationWindowHours * HOUR_MS);
    const candidates = await db
      .select()
      .from(officialEventsTable)
      .where(
        and(
          eq(officialEventsTable.scenario, scenario),
          inArray(officialEventsTable.hazard, COMPATIBLE[alert.hazard as HazardId] ?? [alert.hazard]),
          lte(officialEventsTable.startsAt, to),
          gte(sql`coalesce(${officialEventsTable.endsAt}, ${officialEventsTable.startsAt} + make_interval(hours => ${DETECTOR.corroborationActiveHours}))`, from),
          isNotNull(officialEventsTable.lat),
        ),
      );
    const near = candidates
      .map((e) => ({ e, km: haversineKm(place.lat, place.lon, e.lat!, e.lon!) }))
      .filter((c) => c.km <= Math.max(DETECTOR.corroborationRadiusKm, place.radiusKm ?? 0))
      .sort((a, b) => Math.abs(a.e.startsAt.getTime() - alert.openedAt.getTime()) - Math.abs(b.e.startsAt.getTime() - alert.openedAt.getTime()));
    if (near.length > 0) {
      const { e, km } = near[0]!;
      const lead = minutesBetween(alert.openedAt, e.startsAt);
      await db.update(alertsTable).set({ corroborationState: "corroborated", officialEventId: e.id, leadMinutes: lead, updatedAt: new Date() }).where(eq(alertsTable.id, alert.id));
      const when = lead > 0 ? `${Math.round(lead / 60)} h after the alert opened` : `${Math.round(-lead / 60)} h before the alert opened`;
      await addEvent(alert.id, new Date(Math.max(e.startsAt.getTime(), alert.openedAt.getTime())), "corroborated", `${feedLabel(e.feed)}: ${e.title} (${Math.round(km)} km away, ${when}).`);
      matched += 1;
    } else if (asOf.getTime() > to.getTime()) {
      await db.update(alertsTable).set({ corroborationState: "uncorroborated", updatedAt: new Date() }).where(eq(alertsTable.id, alert.id));
    }
  }
  return matched;
}

export { sql };
