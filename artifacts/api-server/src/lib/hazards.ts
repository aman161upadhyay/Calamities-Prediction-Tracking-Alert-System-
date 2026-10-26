import fs from "node:fs";
import path from "node:path";
import { ML_DATA_DIR } from "./config";

export type HazardId = "flood" | "storm" | "cyclone" | "wildfire" | "earthquake" | "landslide" | "heat" | "tsunami";
export type RiskLevel = "insufficient" | "low" | "elevated" | "high" | "severe";

export interface HazardMeta {
  id: HazardId;
  label: string;
  family: string;
  color: string;
  trained: boolean;
  description: string;
  search: string[];
  terms: string[];
}

interface HazardFile {
  hazards: HazardMeta[];
  trainedClasses: string[];
}

const file = JSON.parse(fs.readFileSync(path.join(ML_DATA_DIR, "hazard_keywords.json"), "utf8")) as HazardFile;

export const HAZARDS: HazardMeta[] = file.hazards;
export const HAZARD_IDS: HazardId[] = HAZARDS.map((h) => h.id);
export const TRAINED_CLASSES = file.trainedClasses;
const byId = new Map(HAZARDS.map((h) => [h.id, h] as const));

export function hazardMeta(id: string): HazardMeta {
  const meta = byId.get(id as HazardId);
  if (!meta) throw new Error(`Unknown hazard "${id}"`);
  return meta;
}

export function isHazardId(value: unknown): value is HazardId {
  return typeof value === "string" && byId.has(value as HazardId);
}

export const LEVELS: RiskLevel[] = ["insufficient", "low", "elevated", "high", "severe"];
export function levelRank(level: string): number {
  const i = LEVELS.indexOf(level as RiskLevel);
  return i < 0 ? 0 : i;
}
export function maxLevel(levels: Iterable<string>): RiskLevel {
  let best: RiskLevel = "insufficient";
  for (const l of levels) if (levelRank(l) > levelRank(best)) best = l as RiskLevel;
  return best;
}

/** Official-feed hazards that count as corroboration for a social-signal hazard. */
export const COMPATIBLE: Record<HazardId, HazardId[]> = {
  flood: ["flood", "cyclone", "storm"],
  storm: ["storm", "cyclone", "flood"],
  cyclone: ["cyclone", "storm", "flood"],
  wildfire: ["wildfire"],
  earthquake: ["earthquake", "tsunami"],
  landslide: ["landslide", "flood", "storm", "earthquake"],
  heat: ["heat", "wildfire"],
  tsunami: ["tsunami", "earthquake"],
};
