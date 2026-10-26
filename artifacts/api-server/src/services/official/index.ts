import { db, officialEventsTable, type InsertOfficialEvent } from "@workspace/db";
import { sql } from "drizzle-orm";
import { config } from "../../lib/config";
import { fetchJson, fetchText } from "../../lib/http";
import { hazardMeta, type HazardId } from "../../lib/hazards";
import { runSource, setSourceState } from "../sources";
import { db as _db, placesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function upsertOfficialEvents(rows: InsertOfficialEvent[]): Promise<number> {
  if (rows.length === 0) return 0;
  const result = await db
    .insert(officialEventsTable)
    .values(rows)
    .onConflictDoUpdate({
      target: [officialEventsTable.feed, officialEventsTable.externalId],
      set: {
        title: sql`excluded.title`,
        severity: sql`excluded.severity`,
        endsAt: sql`excluded.ends_at`,
        startsAt: sql`excluded.starts_at`,
        timePrecision: sql`excluded.time_precision`,
        url: sql`excluded.url`,
        lat: sql`excluded.lat`,
        lon: sql`excluded.lon`,
        fetchedAt: sql`now()`,
      },
    })
    .returning({ id: officialEventsTable.id, inserted: sql<boolean>`(xmax = 0)` });
  return result.filter((r) => r.inserted).length;
}

// ---------- GDACS ----------
const GDACS_HAZARD: Record<string, HazardId> = { EQ: "earthquake", TC: "cyclone", FL: "flood", WF: "wildfire", DR: "heat", TS: "tsunami" };

function xmlField(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  if (!m) return null;
  return m[1]!.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

/** GDACS publishes a stable RSS feed (CC BY 4.0); the JSON API needs one call per event type. */
export async function ingestGdacs(): Promise<void> {
  await runSource("gdacs", async () => {
    const xml = await fetchText("https://www.gdacs.org/xml/rss.xml", { timeoutMs: 25_000 });
    const items = xml.split("<item>").slice(1);
    const rows: InsertOfficialEvent[] = [];
    for (const item of items) {
      const type = xmlField(item, "gdacs:eventtype") ?? "";
      const hazard = GDACS_HAZARD[type];
      const eventId = xmlField(item, "gdacs:eventid");
      const lat = Number(xmlField(item, "geo:lat"));
      const lon = Number(xmlField(item, "geo:long"));
      if (!hazard || !eventId || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const name = xmlField(item, "gdacs:eventname");
      const severity = xmlField(item, "gdacs:severity");
      const level = xmlField(item, "gdacs:alertlevel") ?? "";
      const country = xmlField(item, "gdacs:country");
      const title = xmlField(item, "title") ?? `GDACS ${type} event`;
      const from = xmlField(item, "gdacs:fromdate");
      const to = xmlField(item, "gdacs:todate");
      rows.push({
        feed: "gdacs",
        externalId: `${type}-${eventId}`,
        hazard,
        title: (name ? `${hazardMeta(hazard).label} ${name}${severity ? `: ${severity}` : ""}` : title.replace(/\.\s+Population affected.*$/i, "")).slice(0, 200),
        severity: level,
        lat,
        lon,
        country: country && country !== "[unknown]" ? country : null,
        startsAt: from ? new Date(from) : new Date(),
        endsAt: to ? new Date(to) : null,
        url: `https://www.gdacs.org/report.aspx?eventid=${eventId}&eventtype=${type}`,
        scenario: "",
      });
    }
    const itemsNew = await upsertOfficialEvents(rows);
    return { requests: 1, itemsFetched: rows.length, itemsNew };
  });
}

// ---------- USGS ----------
interface UsgsFeature {
  id: string;
  properties: { mag: number | null; place: string | null; time: number; url: string; title: string; tsunami: number };
  geometry: { coordinates: [number, number, number] };
}

export async function ingestUsgs(): Promise<void> {
  await runSource("usgs", async () => {
    const data = await fetchJson<{ features: UsgsFeature[] }>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", { timeoutMs: 25_000 });
    const rows: InsertOfficialEvent[] = (data.features ?? []).map((f) => ({
      feed: "usgs",
      externalId: f.id,
      hazard: "earthquake",
      title: f.properties.title.slice(0, 200),
      severity: f.properties.mag !== null ? `M${f.properties.mag.toFixed(1)}` : "",
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      country: null,
      startsAt: new Date(f.properties.time),
      endsAt: null,
      url: f.properties.url,
      scenario: "",
    }));
    const itemsNew = await upsertOfficialEvents(rows);
    return { requests: 1, itemsFetched: rows.length, itemsNew };
  });
}

// ---------- NWS ----------
interface NwsFeature {
  id: string;
  geometry: { type: string; coordinates: unknown } | null;
  properties: {
    id: string;
    event: string;
    severity: string;
    headline?: string | null;
    areaDesc?: string;
    onset?: string | null;
    effective?: string | null;
    ends?: string | null;
    expires?: string | null;
    sent?: string;
  };
}

function nwsHazard(event: string): HazardId | null {
  const e = event.toLowerCase();
  if (e.includes("tsunami")) return "tsunami";
  if (e.includes("hurricane") || e.includes("tropical") || e.includes("storm surge") || e.includes("typhoon")) return "cyclone";
  if (e.includes("flood")) return "flood";
  if (e.includes("fire") || e.includes("red flag")) return "wildfire";
  if (e.includes("heat")) return "heat";
  if (e.includes("tornado") || e.includes("thunderstorm") || e.includes("winter storm") || e.includes("blizzard") || e.includes("ice storm") || e.includes("high wind")) return "storm";
  return null;
}

function centroid(geometry: { type: string; coordinates: unknown } | null): [number, number] | null {
  if (!geometry) return null;
  const pts: number[][] = [];
  const walk = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") pts.push(c as number[]);
    else for (const x of c) walk(x);
  };
  walk(geometry.coordinates);
  if (pts.length === 0) return null;
  const lon = pts.reduce((s, p) => s + p[0]!, 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1]!, 0) / pts.length;
  return [lat, lon];
}

export async function ingestNws(): Promise<void> {
  await runSource("nws", async () => {
    const data = await fetchJson<{ features: NwsFeature[] }>("https://api.weather.gov/alerts/active?status=actual&message_type=alert,update", {
      headers: { accept: "application/geo+json" },
      timeoutMs: 25_000,
    });
    const rows: InsertOfficialEvent[] = [];
    for (const f of data.features ?? []) {
      const hazard = nwsHazard(f.properties.event);
      const c = centroid(f.geometry);
      if (!hazard || !c) continue;
      if (!["Severe", "Extreme", "Moderate"].includes(f.properties.severity)) continue;
      const starts = f.properties.onset ?? f.properties.effective ?? f.properties.sent;
      rows.push({
        feed: "nws",
        externalId: f.properties.id,
        hazard,
        title: `${f.properties.event}: ${f.properties.areaDesc ?? ""}`.slice(0, 200),
        severity: f.properties.severity,
        lat: c[0],
        lon: c[1],
        country: "United States",
        startsAt: starts ? new Date(starts) : new Date(),
        endsAt: f.properties.ends ? new Date(f.properties.ends) : f.properties.expires ? new Date(f.properties.expires) : null,
        url: f.id,
        scenario: "",
      });
    }
    const itemsNew = await upsertOfficialEvents(rows);
    return { requests: 1, itemsFetched: rows.length, itemsNew };
  });
}

// ---------- FIRMS ----------
/** NASA FIRMS thermal anomalies around featured places (needs FIRMS_MAP_KEY). */
export async function ingestFirms(): Promise<void> {
  if (!config.firmsMapKey) {
    await setSourceState("firms", "not_configured", "Add FIRMS_MAP_KEY (free from NASA) to count active-fire detections around featured places.", false);
    return;
  }
  await runSource("firms", async () => {
    const featured = await _db.select().from(placesTable).where(eq(placesTable.featured, true));
    let requests = 0;
    const rows: InsertOfficialEvent[] = [];
    for (const place of featured) {
      const bbox = [place.lon - 1, place.lat - 1, place.lon + 1, place.lat + 1].map((n) => n.toFixed(2)).join(",");
      requests += 1;
      const csv = await fetchText(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${config.firmsMapKey}/VIIRS_SNPP_NRT/${bbox}/1`, { timeoutMs: 30_000 });
      const lines = csv.trim().split("\n");
      if (lines.length < 2) continue;
      const header = lines[0]!.split(",");
      const iConf = header.indexOf("confidence");
      const iDate = header.indexOf("acq_date");
      const iLat = header.indexOf("latitude");
      const iLon = header.indexOf("longitude");
      const strong = lines.slice(1).map((l) => l.split(",")).filter((c) => c[iConf] === "h" || c[iConf] === "n" || c[iConf] === "high" || c[iConf] === "nominal");
      if (strong.length < 20) continue;
      const lat = strong.reduce((s, c) => s + Number(c[iLat]), 0) / strong.length;
      const lon = strong.reduce((s, c) => s + Number(c[iLon]), 0) / strong.length;
      const day = strong[0]![iDate] ?? new Date().toISOString().slice(0, 10);
      rows.push({
        feed: "firms",
        externalId: `${place.key}:${day}`,
        hazard: "wildfire",
        title: `${strong.length} VIIRS fire detections within about 100 km of ${place.name}`,
        severity: strong.length >= 100 ? "high" : "moderate",
        lat,
        lon,
        country: place.country,
        startsAt: new Date(`${day}T00:00:00Z`),
        endsAt: null,
        url: "https://firms.modaps.eosdis.nasa.gov/map/",
        scenario: "",
      });
    }
    const itemsNew = await upsertOfficialEvents(rows);
    return { requests, itemsFetched: rows.length, itemsNew };
  });
}

export async function ingestOfficialFeeds(): Promise<void> {
  await Promise.all([ingestGdacs(), ingestUsgs(), ingestNws(), ingestFirms()]);
}
