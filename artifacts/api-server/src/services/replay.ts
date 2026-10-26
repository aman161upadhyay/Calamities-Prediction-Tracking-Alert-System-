import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { db, officialEventsTable, postsTable, replayScenarioStateTable, signalsHourlyTable, alertsTable, type ReplayScenarioState } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { ML_DATA_DIR } from "../lib/config";
import type { HazardId } from "../lib/hazards";
import { waitForModelService } from "../ml/client";
import { logger } from "../lib/logger";
import { HOUR_MS, floorHour } from "../lib/time";
import { corroborateAlerts, runDetector } from "./detector";
import { upsertOfficialEvents } from "./official";
import { upsertPlaces, type PlaceSeed } from "./places";
import { scorePending } from "./scoring";
import { rebuildSignals } from "./signals";

export interface ScenarioOfficialEvent {
  key: string;
  hazard: HazardId;
  title: string;
  severity: string;
  lat: number;
  lon: number;
  startsAt: string;
  url: string;
  source: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  hazard: HazardId;
  region: string;
  country: string;
  lat: number;
  lon: number;
  /** HumAID event folder name. */
  humaidEvent: string;
  description: string;
  datasetSource: string;
  anchor: PlaceSeed;
  officialEvents: ScenarioOfficialEvent[];
  moments: { at: string; label: string }[];
}

const HUMAID = "HumAID (Alam, Qazi, Imran, Ofli 2021), tweet ids and labels only; text is scored locally and never shown";

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "hurricane-harvey-2017",
    name: "Hurricane Harvey, Texas, August 2017",
    hazard: "cyclone",
    region: "Texas Gulf Coast",
    country: "United States",
    lat: 29.76,
    lon: -95.37,
    humaidEvent: "hurricane_harvey_2017",
    description:
      "9,112 labelled posts from 25 August to 1 September 2017. The collection starts about 27 hours before landfall near Rockport, so this is the one scenario where the social signal can be compared with the official warnings as they were issued.",
    datasetSource: HUMAID,
    anchor: { key: "geonames:4699066", name: "Houston", admin1: "TX", country: "United States", countryCode: "US", lat: 29.7633, lon: -95.3633, population: 2304580, kind: "city" },
    officialEvents: [
      { key: "nhc-hurricane-warning", hazard: "cyclone", title: "NHC hurricane warning for the Texas coast, Port Mansfield to Matagorda", severity: "warning", lat: 27.8, lon: -97.4, startsAt: "2017-08-24T15:00:00Z", url: "https://www.nhc.noaa.gov/data/tcr/AL092017_Harvey.pdf", source: "National Hurricane Center tropical cyclone report" },
      { key: "landfall-rockport", hazard: "cyclone", title: "Harvey makes landfall near Rockport as a category 4 hurricane", severity: "category 4", lat: 28.02, lon: -97.05, startsAt: "2017-08-26T03:00:00Z", url: "https://www.nhc.noaa.gov/data/tcr/AL092017_Harvey.pdf", source: "National Hurricane Center tropical cyclone report" },
      { key: "houston-flash-flood-emergency", hazard: "flood", title: "NWS Houston flash flood emergency for the Houston metro", severity: "emergency", lat: 29.76, lon: -95.37, startsAt: "2017-08-27T06:30:00Z", url: "https://www.weather.gov/hgx/hurricaneharvey", source: "NWS Houston/Galveston event summary" },
    ],
    moments: [
      { at: "2017-08-25T00:00:00Z", label: "HumAID collection begins" },
      { at: "2017-08-26T03:00:00Z", label: "Landfall near Rockport, category 4" },
      { at: "2017-08-27T06:30:00Z", label: "Flash flood emergency, Houston" },
      { at: "2017-08-28T18:00:00Z", label: "Addicks and Barker reservoir releases under way" },
    ],
  },
  {
    id: "kerala-floods-2018",
    name: "Kerala floods, India, August 2018",
    hazard: "flood",
    region: "Kerala",
    country: "India",
    lat: 10.0,
    lon: 76.3,
    humaidEvent: "kerala_floods_2018",
    description:
      "7,984 labelled posts from 17 August to 12 September 2018. The collection begins two days after the worst rainfall, so the replay shows the detector on the peak of the relief phase and the long tail, not on the onset. The 2018 project this site descends from was built for exactly these floods.",
    datasetSource: HUMAID,
    anchor: { key: "region:in-kl", name: "Kerala", admin1: null, country: "India", countryCode: "IN", lat: 10.5, lon: 76.3, population: null, kind: "region" },
    officialEvents: [
      { key: "cochin-airport-closed", hazard: "flood", title: "Cochin International Airport suspends operations because of flooding", severity: "closure", lat: 10.152, lon: 76.402, startsAt: "2018-08-15T08:30:00Z", url: "https://en.wikipedia.org/wiki/2018_Kerala_floods", source: "Airport and state government notices, as collected on Wikipedia" },
      { key: "severe-calamity", hazard: "flood", title: "Union Home Ministry declares the Kerala floods a calamity of severe nature", severity: "national", lat: 10.5, lon: 76.3, startsAt: "2018-08-20T09:00:00Z", url: "https://en.wikipedia.org/wiki/2018_Kerala_floods", source: "Ministry of Home Affairs statement, as collected on Wikipedia" },
    ],
    moments: [
      { at: "2018-08-15T08:30:00Z", label: "Cochin airport closed (before the collection starts)" },
      { at: "2018-08-17T09:18:00Z", label: "HumAID collection begins" },
      { at: "2018-08-20T09:00:00Z", label: "Declared a calamity of severe nature" },
      { at: "2018-08-29T00:00:00Z", label: "Cochin airport reopens" },
    ],
  },
  {
    id: "california-wildfires-2018",
    name: "Camp and Woolsey fires, California, November 2018",
    hazard: "wildfire",
    region: "California",
    country: "United States",
    lat: 39.76,
    lon: -121.62,
    humaidEvent: "california_wildfires_2018",
    description:
      "7,376 labelled posts from 10 November to 7 December 2018. Both fires started on 8 November; the collection joins two days in, during the evacuations and the search for the missing in Paradise.",
    datasetSource: HUMAID,
    anchor: { key: "region:us-ca", name: "California", admin1: null, country: "United States", countryCode: "US", lat: 36.8, lon: -119.4, population: null, kind: "region" },
    officialEvents: [
      { key: "camp-fire-ignition", hazard: "wildfire", title: "Camp Fire reported near Pulga, Butte County", severity: "major incident", lat: 39.81, lon: -121.44, startsAt: "2018-11-08T14:33:00Z", url: "https://www.fire.ca.gov/incidents/2018/11/8/camp-fire/", source: "CAL FIRE incident page" },
      { key: "woolsey-fire-ignition", hazard: "wildfire", title: "Woolsey Fire reported near Simi Valley, Ventura County", severity: "major incident", lat: 34.24, lon: -118.7, startsAt: "2018-11-08T22:24:00Z", url: "https://www.fire.ca.gov/incidents/2018/11/8/woolsey-fire/", source: "CAL FIRE incident page" },
    ],
    moments: [
      { at: "2018-11-08T14:33:00Z", label: "Camp Fire starts (before the collection starts)" },
      { at: "2018-11-10T05:54:00Z", label: "HumAID collection begins" },
      { at: "2018-11-21T18:00:00Z", label: "First significant rain over the Camp Fire area" },
      { at: "2018-11-25T18:00:00Z", label: "Camp Fire fully contained" },
    ],
  },
  {
    id: "cyclone-idai-2019",
    name: "Cyclone Idai, Mozambique, March 2019",
    hazard: "cyclone",
    region: "Sofala",
    country: "Mozambique",
    lat: -19.84,
    lon: 34.84,
    humaidEvent: "cyclone_idai_2019",
    description:
      "3,933 labelled posts from 15 March to 16 April 2019. Idai made landfall at Beira the night before the collection starts; most of the posts concern the inland flooding in Mozambique, Zimbabwe and Malawi that followed.",
    datasetSource: HUMAID,
    anchor: { key: "geonames:1052373", name: "Beira", admin1: "Sofala", country: "Mozambique", countryCode: "MZ", lat: -19.8436, lon: 34.8389, population: 530604, kind: "city" },
    officialEvents: [
      { key: "landfall-beira", hazard: "cyclone", title: "Idai makes landfall near Beira", severity: "intense tropical cyclone", lat: -19.84, lon: 34.84, startsAt: "2019-03-14T22:30:00Z", url: "https://www.gdacs.org/report.aspx?eventid=1000552&eventtype=TC", source: "GDACS tropical cyclone report" },
      { key: "mozambique-emergency", hazard: "flood", title: "Mozambique declares a national emergency", severity: "national", lat: -19.84, lon: 34.84, startsAt: "2019-03-19T12:00:00Z", url: "https://reliefweb.int/disaster/tc-2019-000021-moz", source: "ReliefWeb disaster page" },
    ],
    moments: [
      { at: "2019-03-14T22:30:00Z", label: "Landfall at Beira (before the collection starts)" },
      { at: "2019-03-15T09:38:00Z", label: "HumAID collection begins" },
      { at: "2019-03-19T12:00:00Z", label: "National emergency declared" },
    ],
  },
  {
    id: "puebla-earthquake-2017",
    name: "Puebla earthquake, Mexico, September 2017",
    hazard: "earthquake",
    region: "Puebla and Mexico City",
    country: "Mexico",
    lat: 18.58,
    lon: -98.4,
    humaidEvent: "puebla_mexico_earthquake_2017",
    description:
      "2,015 labelled posts from 20 September to 6 October 2017. The M7.1 earthquake struck at 18:14 UTC on 19 September, about 21 hours before the first post in the collection, so the replay covers the rescue effort rather than the shaking itself.",
    datasetSource: HUMAID,
    anchor: { key: "geonames:3530597", name: "Mexico City", admin1: "CMX", country: "Mexico", countryCode: "MX", lat: 19.4285, lon: -99.1277, population: 12294193, kind: "city" },
    officialEvents: [
      { key: "usgs-us2000ar20", hazard: "earthquake", title: "M 7.1, 1 km ESE of Ayutla, Mexico", severity: "M7.1", lat: 18.584, lon: -98.399, startsAt: "2017-09-19T18:14:39Z", url: "https://earthquake.usgs.gov/earthquakes/eventpage/us2000ar20", source: "USGS event page" },
    ],
    moments: [
      { at: "2017-09-19T18:14:39Z", label: "M7.1 earthquake (before the collection starts)" },
      { at: "2017-09-20T15:18:00Z", label: "HumAID collection begins" },
    ],
  },
];

export function scenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

interface ReplayLine {
  tweet_id: string;
  created_at: string;
  text: string;
  class_label: string;
  hazard: string;
  author_hash: string;
}

export function replayFile(def: ScenarioDefinition): string {
  return path.join(ML_DATA_DIR, "replay", `${def.humaidEvent}.jsonl`);
}

export async function scenarioStates(): Promise<Map<string, ReplayScenarioState>> {
  const rows = await db.select().from(replayScenarioStateTable);
  return new Map(rows.map((r) => [r.id, r]));
}

async function setState(id: string, patch: Partial<ReplayScenarioState>) {
  await db
    .insert(replayScenarioStateTable)
    .values({ id, state: "not_prepared", ...patch, updatedAt: new Date() })
    .onConflictDoUpdate({ target: replayScenarioStateTable.id, set: { ...patch, updatedAt: new Date() } });
}

/** Time span of the scenario's posts, from the replay file (cheap: first and last line) or the database. */
export async function scenarioSpan(def: ScenarioDefinition): Promise<{ startsAt: Date; endsAt: Date; postCount: number }> {
  const res = await db.execute<{ min: Date | null; max: Date | null; n: string }>(sql`select min(created_at) as min, max(created_at) as max, count(*) as n from posts where scenario = ${def.id}`);
  const row = res.rows[0]!;
  if (row.min && row.max && Number(row.n) > 0) return { startsAt: new Date(row.min), endsAt: new Date(row.max), postCount: Number(row.n) };
  const file = replayFile(def);
  if (!fs.existsSync(file)) return { startsAt: new Date(def.moments[0]!.at), endsAt: new Date(def.moments[def.moments.length - 1]!.at), postCount: 0 };
  let first: string | null = null;
  let last: string | null = null;
  let n = 0;
  for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
    if (!line.trim()) continue;
    n += 1;
    if (!first) first = line;
    last = line;
  }
  const a = JSON.parse(first ?? "{}") as ReplayLine;
  const b = JSON.parse(last ?? "{}") as ReplayLine;
  return { startsAt: new Date(a.created_at), endsAt: new Date(b.created_at), postCount: n };
}

const running = new Set<string>();

/** Load, score and detect a scenario end to end. Safe to call again; it resumes scoring and rebuilds signals. */
export async function prepareScenario(id: string): Promise<void> {
  const def = scenarioById(id);
  if (!def) throw new Error(`Unknown scenario ${id}`);
  if (running.has(id)) return;
  running.add(id);
  const log = logger.child({ scenario: id });
  try {
    await setState(id, { state: "preparing", progress: 0.01, error: null });
    const file = replayFile(def);
    if (!fs.existsSync(file)) throw new Error(`Replay file missing: ${file}. Run services/ml/scripts/prepare_data.py.`);

    const placeIds = await upsertPlaces([def.anchor]);
    const anchorId = placeIds.get(def.anchor.key) ?? null;

    // 1. Load posts (tweet ids, timestamps, text for local scoring only).
    const existing = await db.select({ n: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.scenario, id));
    if (Number(existing[0]!.n) === 0) {
      let batch: (typeof postsTable.$inferInsert)[] = [];
      let total = 0;
      const flush = async () => {
        if (batch.length === 0) return;
        await db.insert(postsTable).values(batch).onConflictDoNothing({ target: [postsTable.source, postsTable.externalId] });
        total += batch.length;
        batch = [];
      };
      for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
        if (!line.trim()) continue;
        const r = JSON.parse(line) as ReplayLine;
        batch.push({
          source: "replay",
          externalId: r.tweet_id,
          url: `https://x.com/i/web/status/${r.tweet_id}`,
          text: r.text,
          lang: "en",
          createdAt: new Date(r.created_at),
          authorHash: r.author_hash,
          scenario: id,
          queryHazard: r.hazard,
        });
        if (batch.length >= 500) await flush();
      }
      await flush();
      log.info({ total }, "replay posts loaded");
    }
    const span = await scenarioSpan(def);
    await setState(id, { progress: 0.05, postCount: span.postCount });

    // 2. Official events for corroboration, tagged with the scenario.
    await upsertOfficialEvents(
      def.officialEvents.map((e) => ({
        feed: "scenario",
        externalId: `${id}:${e.key}`,
        hazard: e.hazard,
        title: e.title,
        severity: e.severity,
        lat: e.lat,
        lon: e.lon,
        country: def.country,
        startsAt: new Date(e.startsAt),
        endsAt: null,
        url: e.url,
        scenario: id,
      })),
    );

    // 3. Score everything that is not scored yet. The model service takes about a minute to load after a start.
    if (!(await waitForModelService())) throw new Error("The model service did not become ready; check its logs and try again.");
    for (;;) {
      const pendingRes = await db.execute<{ n: string }>(sql`select count(*) as n from posts p left join post_scores s on s.post_id = p.id where p.scenario = ${id} and s.post_id is null`);
      const pending = Number(pendingRes.rows[0]!.n);
      if (pending === 0) break;
      const done = span.postCount - pending;
      await setState(id, { progress: 0.05 + 0.8 * (done / Math.max(1, span.postCount)) });
      const scored = await scorePending({
        scenario: id,
        limit: 512,
        fallbackPlaceId: anchorId,
        onProgress: async (d) => setState(id, { progress: 0.05 + 0.8 * ((done + d) / Math.max(1, span.postCount)) }),
      });
      if (scored === 0) break;
    }

    // 4. Signals and alerts from scratch for this scenario.
    await db.delete(alertsTable).where(eq(alertsTable.scenario, id));
    await db.delete(signalsHourlyTable).where(eq(signalsHourlyTable.scenario, id));
    const from = floorHour(span.startsAt);
    const to = new Date(floorHour(span.endsAt).getTime() + HOUR_MS);
    const rows = await rebuildSignals(id, from, to);
    await setState(id, { progress: 0.9 });
    const outcome = await runDetector({ scenario: id, rows, firstIncompleteHour: to, live: false });
    await corroborateAlerts(id, new Date(to.getTime() + 72 * HOUR_MS));
    const firstAlert = await db
      .select({ openedAt: alertsTable.openedAt })
      .from(alertsTable)
      .where(and(eq(alertsTable.scenario, id)))
      .orderBy(alertsTable.openedAt)
      .limit(1);
    const alertCount = await db.select({ n: sql<number>`count(*)::int` }).from(alertsTable).where(eq(alertsTable.scenario, id));
    await setState(id, {
      state: "ready",
      progress: 1,
      postCount: span.postCount,
      alertsOpened: Number(alertCount[0]!.n),
      firstAlertAt: firstAlert[0]?.openedAt ?? null,
      preparedAt: new Date(),
      error: null,
    });
    log.info({ signals: rows.length, opened: outcome.opened.length }, "scenario ready");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err: message }, "scenario preparation failed");
    await setState(id, { state: "failed", error: message.slice(0, 500) });
  } finally {
    running.delete(id);
  }
}

export function isPreparing(id: string): boolean {
  return running.has(id);
}

/** After a restart, finish any scenario that was still being prepared. Runs them one at a time in the background. */
export async function resumeInterruptedScenarios(): Promise<void> {
  const rows = await db.select({ id: replayScenarioStateTable.id, state: replayScenarioStateTable.state }).from(replayScenarioStateTable);
  const ids = rows.filter((r) => r.state === "preparing" && scenarioById(r.id)).map((r) => r.id);
  if (ids.length === 0) return;
  logger.info({ ids }, "resuming interrupted replay preparation");
  void (async () => {
    for (const id of ids) {
      try {
        await prepareScenario(id);
      } catch (err) {
        logger.error({ err, scenario: id }, "resume failed");
      }
    }
  })();
}

export { officialEventsTable };
