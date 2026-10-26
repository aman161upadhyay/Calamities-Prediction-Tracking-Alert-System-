import fs from "node:fs";
import path from "node:path";
import { db, placesTable, type Place } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { ML_DATA_DIR } from "../lib/config";
import { logger } from "../lib/logger";
import type { MlPlace } from "../ml/client";

export interface PlaceSeed {
  key: string;
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  population: number | null;
  kind: string;
  featured?: boolean;
}

const idCache = new Map<string, number>();

export async function upsertPlaces(seeds: PlaceSeed[] | MlPlace[]): Promise<Map<string, number>> {
  const byKey = new Map<string, PlaceSeed>();
  for (const s of seeds as PlaceSeed[]) if (!idCache.has(s.key) && !byKey.has(s.key)) byKey.set(s.key, s);
  if (byKey.size > 0) {
    const values = [...byKey.values()].map((p) => ({
      key: p.key,
      name: p.name,
      admin1: p.admin1 ?? null,
      country: p.country,
      countryCode: p.countryCode,
      lat: p.lat,
      lon: p.lon,
      population: p.population ?? null,
      kind: p.kind,
      featured: p.featured ?? false,
    }));
    await db.insert(placesTable).values(values).onConflictDoNothing({ target: placesTable.key });
    const rows = await db.select({ id: placesTable.id, key: placesTable.key }).from(placesTable).where(inArray(placesTable.key, [...byKey.keys()]));
    for (const r of rows) idCache.set(r.key, r.id);
  }
  return idCache;
}

export async function placeById(id: number): Promise<Place | null> {
  const rows = await db.select().from(placesTable).where(eq(placesTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function placesByIds(ids: number[]): Promise<Map<number, Place>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select().from(placesTable).where(inArray(placesTable.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r]));
}

function readCountryNames(): Map<string, string> {
  const out = new Map<string, string>();
  const text = fs.readFileSync(path.join(ML_DATA_DIR, "raw", "countryInfo.txt"), "utf8");
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const cols = line.split("\t");
    if (cols.length > 4 && cols[0] && cols[4]) out.set(cols[0], cols[4]);
  }
  return out;
}

/** Insert the featured places (services/ml/data/featured_places.csv) from GeoNames cities15000 and mark them featured. */
export async function seedFeaturedPlaces(): Promise<void> {
  const csvPath = path.join(ML_DATA_DIR, "featured_places.csv");
  const citiesPath = path.join(ML_DATA_DIR, "raw", "cities15000.txt");
  if (!fs.existsSync(csvPath) || !fs.existsSync(citiesPath)) {
    logger.warn({ csvPath, citiesPath }, "featured place files missing; skipping featured seed");
    return;
  }
  const wanted = new Map<string, string>();
  for (const line of fs.readFileSync(csvPath, "utf8").split("\n").slice(1)) {
    const [id, name] = line.split(",");
    if (id && name) wanted.set(id.trim(), name.trim());
  }
  const countries = readCountryNames();
  const seeds: PlaceSeed[] = [];
  const text = fs.readFileSync(citiesPath, "utf8");
  for (const line of text.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab < 0) continue;
    const id = line.slice(0, tab);
    if (!wanted.has(id)) continue;
    const cols = line.split("\t");
    seeds.push({
      key: `geonames:${id}`,
      name: cols[1]!,
      admin1: cols[10] || null,
      country: countries.get(cols[8]!) ?? cols[8]!,
      countryCode: cols[8]!,
      lat: Number(cols[4]),
      lon: Number(cols[5]),
      population: Number(cols[14]) || null,
      kind: "city",
      featured: true,
    });
  }
  const missing = [...wanted.keys()].filter((id) => !seeds.some((s) => s.key === `geonames:${id}`));
  if (missing.length) logger.error({ missing }, "featured GeoNames ids not found in cities15000");
  await upsertPlaces(seeds);
  await db.update(placesTable).set({ featured: true }).where(inArray(placesTable.key, seeds.map((s) => s.key)));
  logger.info({ count: seeds.length }, "featured places ready");
}
