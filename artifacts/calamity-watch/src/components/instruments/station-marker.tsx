import type { OfficialEvent, PlaceSignal } from "@workspace/api-client-react";
import { HAZARD_FALLBACK_COLOR } from "@/lib/format";

export const STAMP_RADIUS_KM = 300;
const PEN = "var(--cr-pen)";
const STAMP = "var(--cr-stamp)";
const PAPER = "var(--cr-sheet)";
const RULE = "var(--cr-rule-strong)";

/** Station-plot geometry: core radius from relevant posts per hour (square root), ring arc from fear z (0 to 3 sigma = full circle). */
export function markerGeom(p: Pick<PlaceSignal, "relevantPostsLastHour" | "zScore">) {
  const r = Math.max(4, Math.min(20, 3.5 + Math.sqrt(Math.max(0, p.relevantPostsLastHour)) * 2.6));
  const R = r + 4;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, p.zScore / 3));
  return { r, R, C, arc: frac * C, frac };
}

function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const t = Math.PI / 180;
  const dLat = (bLat - aLat) * t;
  const dLon = (bLon - aLon) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * t) * Math.cos(bLat * t) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function hasNearbyOfficial(p: PlaceSignal, events: OfficialEvent[]): boolean {
  return events.some((e) => e.lat != null && e.lon != null && km(p.lat, p.lon, e.lat, e.lon) <= STAMP_RADIUS_KM);
}

/** SVG group drawn at (0,0); used by the static map and the legend. */
export function StationGlyph({ p, stamp }: { p: PlaceSignal; stamp: boolean }) {
  const g = markerGeom(p);
  return (
    <g>
      <circle r={g.R + 1} fill="none" stroke={PAPER} strokeWidth={1} />
      <circle r={g.R} fill="none" stroke={RULE} strokeWidth={0.75} />
      {g.arc > 0 && <circle r={g.R} fill="none" stroke={PEN} strokeWidth={2.25} strokeDasharray={`${g.arc} ${g.C}`} transform="rotate(-90)" strokeLinecap="butt" />}
      <circle r={g.r + 1} fill={PAPER} />
      <circle r={g.r} fill={HAZARD_FALLBACK_COLOR[p.hazard]} fillOpacity={0.88} stroke="var(--cr-sheet)" strokeWidth={1} />
      {stamp && <rect x={g.R + 2} y={-g.R - 2} width={7} height={7} fill={PAPER} stroke={STAMP} strokeWidth={1.5} />}
    </g>
  );
}

/** Same glyph as a standalone SVG string, for MapLibre HTML markers. */
export function stationSvg(p: PlaceSignal, stamp: boolean): { svg: string; size: number } {
  const g = markerGeom(p);
  const size = Math.ceil((g.R + 12) * 2);
  const c = size / 2;
  const arc = g.arc > 0 ? `<circle cx="${c}" cy="${c}" r="${g.R}" fill="none" stroke="${PEN}" stroke-width="2.25" stroke-dasharray="${g.arc} ${g.C}" transform="rotate(-90 ${c} ${c})"/>` : "";
  const st = stamp ? `<rect x="${c + g.R + 2}" y="${c - g.R - 2}" width="7" height="7" fill="${PAPER}" stroke="${STAMP}" stroke-width="1.5"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${g.R}" fill="none" stroke="${RULE}" stroke-width="0.75"/>${arc}<circle cx="${c}" cy="${c}" r="${g.r + 1}" fill="${PAPER}"/><circle cx="${c}" cy="${c}" r="${g.r}" fill="${HAZARD_FALLBACK_COLOR[p.hazard]}" fill-opacity="0.88" stroke="${PAPER}" stroke-width="1"/>${st}</svg>`;
  return { svg, size };
}

export function officialSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="3" width="8" height="8" fill="${PAPER}" stroke="${STAMP}" stroke-width="1.5"/></svg>`;
}
