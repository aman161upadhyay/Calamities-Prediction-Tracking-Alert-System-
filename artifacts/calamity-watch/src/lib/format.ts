import type { Hazard, RiskLevel, Trend, SourceState } from "@workspace/api-client-react";

export const HAZARDS: Hazard[] = ["flood", "storm", "cyclone", "wildfire", "earthquake", "landslide", "heat", "tsunami"];

export const HAZARD_LABEL: Record<Hazard, string> = {
  flood: "Flood",
  storm: "Storm",
  cyclone: "Cyclone",
  wildfire: "Wildfire",
  earthquake: "Earthquake",
  landslide: "Landslide",
  heat: "Heat",
  tsunami: "Tsunami",
};

/** Fallback hues from the design brief, used only when the API has not supplied a hazard colour. */
export const HAZARD_FALLBACK_COLOR: Record<Hazard, string> = {
  flood: "#3D9BFF",
  tsunami: "#3D9BFF",
  storm: "#A78BFA",
  cyclone: "#A78BFA",
  wildfire: "#FF8A3D",
  earthquake: "#D4A24C",
  landslide: "#D4A24C",
  heat: "#F5C542",
};

export function isHazard(v: string | undefined | null): v is Hazard {
  return !!v && (HAZARDS as string[]).includes(v);
}

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  insufficient: "Not enough posts",
  low: "Low",
  elevated: "Elevated",
  high: "High",
  severe: "Severe",
};

export const LEVEL_COLOR: Record<RiskLevel, string> = {
  insufficient: "#6B778A",
  low: "#8A97AB",
  elevated: "#E8B04B",
  high: "#FF6B3D",
  severe: "#FF2E55",
};

export const LEVEL_RANK: Record<RiskLevel, number> = { insufficient: 0, low: 1, elevated: 2, high: 3, severe: 4 };
export const LEVELS: RiskLevel[] = ["insufficient", "low", "elevated", "high", "severe"];

export const TREND_LABEL: Record<Trend, string> = { rising: "Rising", falling: "Falling", flat: "Flat" };

export const SOURCE_LABEL: Record<string, string> = { x: "X", bluesky: "Bluesky", replay: "Replay" };

export const SOURCE_STATE_LABEL: Record<SourceState, string> = {
  ok: "ok",
  offline: "offline",
  not_configured: "not configured",
  budget_reached: "budget reached",
  error: "error",
  idle: "idle",
};

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** 12:40 UTC */
export function utcTime(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "unknown";
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** 14 Aug 12:40 UTC */
export function utcDateTime(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "unknown";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function utcDate(iso: string | null | undefined): string {
  const d = toDate(iso);
  if (!d) return "unknown";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function shortHour(iso: string): string {
  const d = toDate(iso);
  if (!d) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}h`;
}

export function ago(iso: string | null | undefined, now: Date = new Date()): string {
  const d = toDate(iso);
  if (!d) return "never";
  const m = Math.round((now.getTime() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || isNaN(v)) return "n/a";
  // Thousands are separated with a no-break space: in the monospaced numeral font a comma takes a whole cell and reads as "9 , 112".
  return v.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/,/g, "\u00A0");
}

/** Rough preparation time for a replay scenario: the model service scores about 25 posts a second on CPU. */
export function prepEstimate(postCount: number): string {
  const minutes = Math.max(1, Math.round(postCount / 25 / 60));
  return minutes === 1 ? "about a minute" : `about ${minutes} minutes`;
}

export function prob(v: number | null | undefined): string {
  if (v === null || v === undefined) return "n/a";
  return v.toFixed(2).replace(/^0/, "");
}

export function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "n/a";
  return `${(v * 100).toFixed(digits)}%`;
}

export function signed(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return "n/a";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s;
}

/**
 * Lead or lag between the alert and the official record, in words that match how precisely the source dates it.
 * Minute-level records read in minutes and hours, hour-level ones in whole hours, day-level ones by date only.
 */
export function leadText(
  c: { leadMinutes?: number | null; officialAt?: string | null; officialTimePrecision?: string | null; feed?: string | null },
  openedAt: string,
): string {
  const what = c.feed === "Historical record" ? "the recorded event" : c.feed ?? "the official record";
  if (c.officialTimePrecision === "day") {
    if (!c.officialAt) return "no lead time recorded";
    const days = Math.round((Date.UTC(...dateParts(c.officialAt)) - Date.UTC(...dateParts(openedAt))) / 86_400_000);
    const dated = `${what} is dated to the day only`;
    if (days === 0) return `opened on the same day as ${what} (dated to the day only)`;
    return days > 0 ? `opened ${days} day${days === 1 ? "" : "s"} before ${what}; ${dated}` : `opened ${-days} day${days === -1 ? "" : "s"} after ${what}; ${dated}`;
  }
  const min = c.leadMinutes;
  if (min === null || min === undefined) return "no lead time recorded";
  const a = Math.abs(min);
  const hourly = c.officialTimePrecision === "hour";
  const t = hourly ? `about ${Math.round(a / 60)} h` : a >= 120 ? `${(a / 60).toFixed(1)} h` : `${Math.round(a)} min`;
  return min >= 0 ? `${t} before ${what}` : `${t} after ${what}`;
}

function dateParts(iso: string): [number, number, number] {
  const d = new Date(iso);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/** "Kerala, India" but never "Mexico, Mexico". */
export function placeLabel(name: string, country?: string | null): string {
  return country && country !== name ? `${name}, ${country}` : name;
}

/** Replay posts carry a fixed notice instead of text (HumAID terms). */
export function isWithheldText(text: string): boolean {
  return text.startsWith("Text withheld under the HumAID data terms");
}

export function errorMessage(e: unknown): string {
  if (!e) return "Unknown error";
  const anyE = e as { data?: { error?: string }; message?: string; status?: number };
  return anyE.data?.error ?? anyE.message ?? "Request failed";
}

export function isNotFound(e: unknown): boolean {
  return (e as { status?: number })?.status === 404;
}
