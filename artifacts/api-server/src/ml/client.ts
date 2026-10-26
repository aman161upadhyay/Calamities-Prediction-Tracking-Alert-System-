import { fetchJson } from "../lib/http";
import { mlBaseUrl } from "./process";

export interface MlHealth {
  ready: boolean;
  error: string | null;
  modelVersion: string;
  stageOneLoaded: boolean;
  stageTwoLoaded: boolean;
  geoparserLoaded: boolean;
  gazetteerPlaces: number;
  uptimeSeconds: number;
}

export interface MlPlace {
  key: string;
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  population: number | null;
  kind: string;
  /** Rough extent for regions and countries; null for cities. */
  radiusKm: number | null;
  confidence: number;
  method: string;
  mention: string;
}

export interface MlGeoparseResponse {
  latencyMs: number;
  results: { id: string; places: MlPlace[] }[];
}

export interface MlResult {
  id: string;
  pRelevant: number;
  hazard: string;
  hazardMethod: string;
  hazardProbs: Record<string, number>;
  keywordHits: Record<string, number>;
  emotions: Record<string, number>;
  pFear: number;
  pAnger: number;
  pSadness: number;
  sentiment: "negative" | "neutral" | "positive";
  sentimentScore: number;
  places: MlPlace[];
}

export interface MlScoreResponse {
  modelVersion: string;
  latencyMs: number;
  results: MlResult[];
}

let lastHealth: { at: number; value: MlHealth | null } = { at: 0, value: null };

export async function mlHealth(maxAgeMs = 5_000): Promise<MlHealth | null> {
  if (Date.now() - lastHealth.at < maxAgeMs) return lastHealth.value;
  try {
    const value = await fetchJson<MlHealth>(`${mlBaseUrl()}/health`, { timeoutMs: 4_000 });
    lastHealth = { at: Date.now(), value };
    return value;
  } catch {
    lastHealth = { at: Date.now(), value: null };
    return null;
  }
}

/** Wait until the model service reports ready, polling every few seconds. Resolves false on timeout. */
export async function waitForModelService(maxMs = 10 * 60_000, everyMs = 5_000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  for (;;) {
    const h = await mlHealth(0);
    if (h?.ready) return true;
    if (h?.error) return false;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

/** Score a batch. `contextPlaceKey` names a place the stream is known to be about; it only breaks homonym ties. */
export async function mlScore(items: { id: string; text: string }[], geoparse = true, contextPlaceKey: string | null = null): Promise<MlScoreResponse> {
  return fetchJson<MlScoreResponse>(`${mlBaseUrl()}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items, geoparse, contextPlaceKey }),
    timeoutMs: 180_000,
  });
}

/** Place resolution only, for re-resolving stored posts after a gazetteer or geoparser change. */
export async function mlGeoparse(items: { id: string; text: string }[], contextPlaceKey: string | null = null): Promise<MlGeoparseResponse> {
  return fetchJson<MlGeoparseResponse>(`${mlBaseUrl()}/geoparse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items, contextPlaceKey }),
    timeoutMs: 180_000,
  });
}

export async function mlModelCard(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`${mlBaseUrl()}/model-card`, { timeoutMs: 8_000 });
}
