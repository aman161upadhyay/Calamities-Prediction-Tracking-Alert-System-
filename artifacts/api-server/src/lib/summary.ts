import { hazardMeta } from "./hazards";

/** Day, time and zone of an hour, e.g. "15 Aug 2018 10:00 UTC". */
export function fmtUtcDay(d: Date): string {
  const day = d.getUTCDate();
  const mon = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return `${day} ${mon} ${d.getUTCFullYear()} ${d.toISOString().slice(11, 16)} UTC`;
}

/**
 * One-sentence alert summary. Every number in it comes from the peak hour: the relevant-post count and the z-score
 * are the same hourly row, named by its start time.
 */
export function alertSummary(hazard: string, placeName: string, peakN: number, peakZ: number, peakAt: Date, peakLevel: string): string {
  const label = hazardMeta(hazard).label;
  const verb = peakLevel === "severe" ? "reached" : "rose to";
  const posts = peakN === 1 ? "1 relevant post" : `${peakN} relevant posts`;
  return `${label} posts about ${placeName} ${verb} ${posts} in the hour starting ${fmtUtcDay(peakAt)}, ${peakZ.toFixed(1)} robust standard deviations above the 7-day baseline.`;
}
