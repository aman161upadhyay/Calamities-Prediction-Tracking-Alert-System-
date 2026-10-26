import { memo, useEffect, useState } from "react";
import { HAZARD_FALLBACK_COLOR } from "@/lib/format";
import { ringsToPath } from "@/components/map/geo-path";
import { SCENE, type Dot } from "./script";

/** Equirectangular sheet: longitudes −168…168 (the empty Pacific margins trimmed), latitudes −56…78. */
export const LON0 = -168;
export const LON1 = 168;
export const LAT0 = 78;
export const LAT1 = -56;
export const VW = 1000;
export const VH = Math.round((VW * (LAT0 - LAT1)) / (LON1 - LON0)); // 399

export const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * VW;
export const py = (lat: number) => ((LAT0 - lat) / (LAT0 - LAT1)) * VH;

/** Land and borders are loaded after first paint (about 110 kB of coordinates) and cached across mounts. */
let geoCache: { land: string; borders: string } | null = null;
let geoPromise: Promise<{ land: string; borders: string }> | null = null;
function loadGeo() {
  if (geoCache) return Promise.resolve(geoCache);
  if (!geoPromise)
    geoPromise = Promise.all([import("@/components/map/land-110m"), import("@/components/map/borders-110m")]).then(([l, b]) => {
      geoCache = { land: ringsToPath(l.LAND_RINGS, px, py, true), borders: ringsToPath(b.BORDER_LINES, px, py, false) };
      return geoCache;
    });
  return geoPromise;
}

export function useGeo() {
  const [geo, setGeo] = useState(geoCache);
  useEffect(() => {
    let live = true;
    if (!geo) loadGeo().then((g) => live && setGeo(g)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [geo]);
  return geo;
}

const Ground = memo(function Ground({ geo }: { geo: { land: string; borders: string } | null }) {
  return (
    <g>
      {geo && <path d={geo.land} fill="var(--cr-land)" stroke="none" />}
      {geo && <path d={geo.borders} fill="none" stroke="var(--cr-border)" strokeWidth={0.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
    </g>
  );
});

/**
 * The world at night with the three scripted regions. `t` is seconds into the scene; `scale` is viewBox units per CSS
 * pixel so dots keep their size whatever the sheet's width. A dot fades in over 260 ms; its halo opens over 1.2 s, and
 * every halo in a region widens a little with each new neighbour, so the region reads as one brightening cloud.
 */
export function WorldScene({ t, scale, className, label, viewBox, fit = "meet" }: { t: number; scale: number; className?: string; label: string; viewBox?: string; fit?: "meet" | "slice" }) {
  const geo = useGeo();
  return (
    <svg viewBox={viewBox ?? `0 0 ${VW} ${VH}`} preserveAspectRatio={`xMidYMid ${fit}`} className={className} role="img" aria-label={label} data-testid="hero-world">
      <defs>
        {SCENE.map(({ region }) => (
          <radialGradient key={region.id} id={`hero-halo-${region.id}`}>
            <stop offset="0%" stopColor={HAZARD_FALLBACK_COLOR[region.hazard]} stopOpacity={0.26} />
            <stop offset="45%" stopColor={HAZARD_FALLBACK_COLOR[region.hazard]} stopOpacity={0.08} />
            <stop offset="100%" stopColor={HAZARD_FALLBACK_COLOR[region.hazard]} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      <Ground geo={geo} />
      {SCENE.map(({ region, dots }) => {
        const n = dots.filter((d) => d.at <= t).length;
        // Halos widen from 6 px alone to 18 px in a full cloud; on a narrow sheet (more than 1.5 units per px) they
        // are kept smaller so a cloud stays a cloud and not a blot.
        const k = scale > 1.5 ? 0.7 : 1;
        const haloPx = k * Math.min(18, 6 + 2.4 * Math.sqrt(Math.max(0, n - 1)));
        const hue = HAZARD_FALLBACK_COLOR[region.hazard];
        return (
          <g key={region.id} data-testid={`hero-region-${region.id}`} data-count={n}>
            {dots.map((d: Dot, i) => {
              const on = d.at <= t;
              return (
                <g key={i} className={on ? "scene-dot on" : "scene-dot"} transform={`translate(${px(d.lon).toFixed(2)} ${py(d.lat).toFixed(2)})`}>
                  <circle className="scene-halo" r={haloPx * scale} fill={`url(#hero-halo-${region.id})`} />
                  <circle r={2.4 * scale} fill={hue} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
