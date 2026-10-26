/**
 * The landing-page scene is a scripted illustration of how a signal grows: three regions light up at different
 * moments, each slowly at first and then faster, while a readout types what the system would print. None of it is
 * read from the API, every load draws the same picture (seeded), and the page says so.
 */
import type { Hazard } from "@workspace/api-client-react";

export interface Region {
  id: string;
  hazard: Hazard;
  /** Printed in the readout. */
  place: string;
  lat: number;
  lon: number;
  /** Ellipse the dots fall in: semi-axes in degrees of longitude and latitude, turned by `tilt` degrees. */
  a: number;
  b: number;
  tilt: number;
  /** Seconds into the scene when the first dot appears. */
  start: number;
  /** How many dots the region reaches. */
  n: number;
  keywords: string;
  /** Mean fear of the first post and of a saturated cloud. */
  fear0: number;
  fear1: number;
  /** Share of posts with negative sentiment, first and saturated. */
  neg0: number;
  neg1: number;
  seed: number;
}

export const REGIONS: Region[] = [
  { id: "flood", hazard: "flood", place: "Nepal–Bihar border", lat: 27.0, lon: 85.3, a: 4.6, b: 1.9, tilt: 12, start: 1.5, n: 26, keywords: "rainfall, flooding", fear0: 0.42, fear1: 0.68, neg0: 0.55, neg1: 0.81, seed: 11 },
  { id: "cyclone", hazard: "cyclone", place: "Florida", lat: 27.6, lon: -81.6, a: 3.0, b: 3.8, tilt: 0, start: 10, n: 18, keywords: "hurricane, landfall", fear0: 0.39, fear1: 0.63, neg0: 0.5, neg1: 0.76, seed: 23 },
  { id: "wildfire", hazard: "wildfire", place: "central California", lat: 36.4, lon: -119.8, a: 2.6, b: 4.4, tilt: -32, start: 19, n: 14, keywords: "wildfire, smoke", fear0: 0.44, fear1: 0.66, neg0: 0.52, neg1: 0.78, seed: 37 },
];

/** Scene timing in seconds: the dots are all placed by RUN_END, the picture holds until LOOP, then it starts again. */
export const RUN_END = 48;
export const LOOP = 60;
/** Typing cadence of the readout, seconds per character. */
export const CHAR_S = 0.028;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Dot {
  lat: number;
  lon: number;
  /** Seconds into the scene when it appears. */
  at: number;
}

/** The gap before each dot shrinks from 2.6 s to 0.55 s over the region's run: a slow start that visibly quickens. */
export function spawnTimes(r: Region): number[] {
  const out = [r.start];
  for (let k = 1; k < r.n; k++) {
    const u = (k - 1) / Math.max(1, r.n - 2);
    const gap = 2.6 + (0.55 - 2.6) * Math.pow(u, 0.9);
    out.push(out[k - 1] + gap);
  }
  return out;
}

export function dotsFor(r: Region): Dot[] {
  const rnd = mulberry32(r.seed);
  const times = spawnTimes(r);
  const th = (r.tilt * Math.PI) / 180;
  return times.map((at) => {
    // Uniform in the unit disk, then stretched to the ellipse and turned; the first dots stay nearer the centre so the
    // cloud grows outward rather than appearing at its full extent at once.
    const spread = 0.55 + 0.45 * Math.min(1, (at - r.start) / 20);
    const rad = Math.sqrt(rnd()) * spread;
    const ang = rnd() * Math.PI * 2;
    const ex = rad * Math.cos(ang) * r.a;
    const ey = rad * Math.sin(ang) * r.b;
    const lon = r.lon + ex * Math.cos(th) - ey * Math.sin(th);
    const lat = r.lat + ex * Math.sin(th) + ey * Math.cos(th);
    return { lat, lon, at };
  });
}

export const SCENE = REGIONS.map((r) => ({ region: r, dots: dotsFor(r) }));

export function countAt(dots: Dot[], t: number): number {
  let n = 0;
  for (const d of dots) if (d.at <= t) n++;
  return n;
}

/** Mean fear and negative share for a region with n posts: rises quickly at first, then saturates. */
export function readings(r: Region, n: number): { fear: number; neg: number } {
  const k = 1 - Math.exp(-Math.max(0, n - 1) / 8);
  return { fear: r.fear0 + (r.fear1 - r.fear0) * k, neg: r.neg0 + (r.neg1 - r.neg0) * k };
}

const deg = (v: number, pos: string, negS: string) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? pos : negS}`;

export function headerLine(r: Region): string {
  return `${r.id} · ${r.place} · ${deg(r.lat, "N", "S")} ${deg(r.lon, "E", "W")} · ${r.keywords}`;
}

export function figureLine(r: Region, n: number): string {
  const { fear, neg } = readings(r, n);
  return `posts ${n}   fear ${fear.toFixed(2)}   negative ${neg.toFixed(2)}`;
}

export interface TypedBlock {
  id: string;
  hazard: Hazard;
  started: boolean;
  header: string;
  figure: string;
  /** Which line the cursor sits on, if this block is the one being typed. */
  cursor: "header" | "figure" | null;
}

/**
 * What the readout shows at second `t`: each region's header types from its start; its figure line follows, and the
 * part after "posts " is retyped whenever the count changes. The cursor sits at the end of the most recent typing.
 */
export function typedAt(t: number): TypedBlock[] {
  let cursorId: string | null = null;
  let cursorAt = -Infinity;
  const blocks = SCENE.map(({ region: r, dots }) => {
    if (t < r.start) return { id: r.id, hazard: r.hazard, started: false, header: "", figure: "", cursor: null as TypedBlock["cursor"] };
    const header = headerLine(r);
    const hChars = Math.min(header.length, Math.floor((t - r.start) / CHAR_S));
    const hDone = r.start + header.length * CHAR_S;
    const n = countAt(dots, t);
    const full = figureLine(r, n);
    const lastChange = n > 0 ? Math.max(hDone, dots[n - 1].at) : hDone;
    let figure = "";
    if (t >= hDone) {
      const keep = "posts ".length;
      const typed = Math.min(full.length - keep, Math.floor((t - lastChange) / CHAR_S));
      // The first typing of the figure starts from its beginning; a retype keeps the word "posts" on the line.
      const firstPass = n <= 1;
      figure = firstPass ? full.slice(0, Math.min(full.length, Math.floor((t - hDone) / CHAR_S))) : full.slice(0, keep + Math.max(0, typed));
    }
    const activity = t >= hDone ? lastChange : r.start;
    if (activity >= cursorAt) {
      cursorAt = activity;
      cursorId = r.id;
    }
    return { id: r.id, hazard: r.hazard, started: true, header: header.slice(0, hChars), figure, cursor: null as TypedBlock["cursor"] };
  });
  for (const b of blocks) if (b.id === cursorId && b.started) b.cursor = b.figure.length > 0 || b.header.length === headerLine(REGIONS.find((r) => r.id === b.id)!).length ? "figure" : "header";
  return blocks;
}
