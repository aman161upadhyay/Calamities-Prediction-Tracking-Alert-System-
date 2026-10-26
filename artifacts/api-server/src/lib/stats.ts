import { DETECTOR } from "./config";
import type { RiskLevel } from "./hazards";

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function mad(values: number[], med = median(values)): number {
  return median(values.map((v) => Math.abs(v - med)));
}

/** Robust z-score: 0.6745 * (x - median) / MAD, with the MAD floored so quiet series cannot explode. */
export function robustZ(x: number, med: number, madValue: number): number {
  return (0.6745 * (x - med)) / Math.max(madValue, DETECTOR.madFloor);
}

export function levelFor(z: number | null, nRelevant: number): RiskLevel {
  if (nRelevant < DETECTOR.minRelevantPerHour) return "insufficient";
  if (z === null) return "low";
  if (z >= DETECTOR.thresholds.severe) return "severe";
  if (z >= DETECTOR.thresholds.high) return "high";
  if (z >= DETECTOR.thresholds.elevated) return "elevated";
  return "low";
}

export function trendOf(recent: number, previous: number): "rising" | "falling" | "flat" {
  if (recent > previous * 1.25 + 0.5) return "rising";
  if (recent < previous * 0.8 - 0.5) return "falling";
  return "flat";
}

/** Baseline over a zero-filled trailing window. */
export function baselineOf(window: number[]): { median: number; mad: number } {
  const med = median(window);
  return { median: med, mad: mad(window, med) };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function round(n: number, digits = 3): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}
