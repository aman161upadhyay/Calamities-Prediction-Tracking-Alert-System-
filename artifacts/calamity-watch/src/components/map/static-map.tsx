import { useMemo } from "react";
import type { OfficialEvent, PlaceSignal } from "@workspace/api-client-react";
import type { MapSelection } from "./hazard-map";

/**
 * Fallback for browsers without WebGL: the same points on a plain equirectangular grid.
 * No tiles, no labels beyond the points themselves; the readout beside the map carries the names.
 */
export function StaticMap({
  places,
  events,
  colors,
  onSelect,
}: {
  places: PlaceSignal[];
  events: OfficialEvent[];
  colors: Record<string, string>;
  onSelect: (s: MapSelection | null) => void;
}) {
  const W = 1000;
  const H = 560;
  const view = useMemo(() => {
    const pts: [number, number][] = [
      ...places.map((p) => [p.lon, p.lat] as [number, number]),
      ...events.filter((e) => e.lat != null && e.lon != null).map((e) => [e.lon as number, e.lat as number] as [number, number]),
    ];
    if (pts.length === 0) return { lon0: -180, lon1: 180, lat0: -60, lat1: 80 };
    let lon0 = Math.min(...pts.map((p) => p[0]));
    let lon1 = Math.max(...pts.map((p) => p[0]));
    let lat0 = Math.min(...pts.map((p) => p[1]));
    let lat1 = Math.max(...pts.map((p) => p[1]));
    const padLon = Math.max(8, (lon1 - lon0) * 0.25);
    const padLat = Math.max(5, (lat1 - lat0) * 0.25);
    lon0 -= padLon;
    lon1 += padLon;
    lat0 -= padLat;
    lat1 += padLat;
    // keep the frame's aspect ratio so degrees are not stretched more than needed
    const want = (W / H) * ((lat1 - lat0) / (lon1 - lon0));
    if (want > 1) {
      const c = (lon0 + lon1) / 2;
      const half = ((lon1 - lon0) * want) / 2;
      lon0 = c - half;
      lon1 = c + half;
    } else {
      const c = (lat0 + lat1) / 2;
      const half = (lat1 - lat0) / want / 2;
      lat0 = c - half;
      lat1 = c + half;
    }
    return { lon0: Math.max(-180, lon0), lon1: Math.min(180, lon1), lat0: Math.max(-85, lat0), lat1: Math.min(85, lat1) };
  }, [places, events]);

  const x = (lon: number) => ((lon - view.lon0) / (view.lon1 - view.lon0)) * W;
  const y = (lat: number) => ((view.lat1 - lat) / (view.lat1 - view.lat0)) * H;
  const step = view.lon1 - view.lon0 > 90 ? 30 : view.lon1 - view.lon0 > 30 ? 10 : 5;
  const lons: number[] = [];
  for (let l = Math.ceil(view.lon0 / step) * step; l <= view.lon1; l += step) lons.push(l);
  const lats: number[] = [];
  for (let l = Math.ceil(view.lat0 / step) * step; l <= view.lat1; l += step) lats.push(l);

  return (
    <div className="absolute inset-0 bg-[#0C1424]" data-testid="map-static">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Static map of place signals and official events">
        {lons.map((l) => (
          <g key={`lon${l}`}>
            <line x1={x(l)} x2={x(l)} y1={0} y2={H} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />
            <text x={x(l) + 4} y={H - 6} fontSize={11} fill="rgba(148,163,184,0.5)" fontFamily="ui-monospace, monospace">
              {l}°
            </text>
          </g>
        ))}
        {lats.map((l) => (
          <g key={`lat${l}`}>
            <line x1={0} x2={W} y1={y(l)} y2={y(l)} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />
            <text x={6} y={y(l) - 4} fontSize={11} fill="rgba(148,163,184,0.5)" fontFamily="ui-monospace, monospace">
              {l}°
            </text>
          </g>
        ))}
        {events
          .filter((e) => e.lat != null && e.lon != null)
          .map((e) => (
            <circle
              key={`e${e.id}`}
              cx={x(e.lon as number)}
              cy={y(e.lat as number)}
              r={5}
              fill="none"
              stroke="#5EEAD4"
              strokeWidth={1.6}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect({ kind: "official", event: e })}
            >
              <title>{e.title}</title>
            </circle>
          ))}
        {places.map((p, i) => {
          const r = Math.max(5, Math.min(26, 4 + Math.sqrt(p.relevantPostsLastHour) * 3.2));
          const labelled = places.findIndex((q) => q.placeId === p.placeId) === i;
          return (
            <g key={`p${p.placeId}:${p.hazard}`} style={{ cursor: "pointer" }} onClick={() => onSelect({ kind: "place", signal: p })}>
              <circle cx={x(p.lon)} cy={y(p.lat)} r={r + 6} fill="none" stroke="#FF5C7A" strokeWidth={2} strokeOpacity={Math.max(0.08, Math.min(1, p.zScore / 6))} />
              <circle cx={x(p.lon)} cy={y(p.lat)} r={r} fill={colors[p.hazard] ?? "#94A3B8"} fillOpacity={0.85} stroke="#0C1424" strokeWidth={1} />
              {labelled && (
                <text x={x(p.lon) + r + 6} y={y(p.lat) + 4} fontSize={12} fill="#E2E8F0" fontFamily="ui-sans-serif, system-ui">
                  {p.name}
                </text>
              )}
              <title>{`${p.name}: ${p.relevantPostsLastHour} relevant posts in the last hour`}</title>
            </g>
          );
        })}
      </svg>
      <div className="absolute left-3 bottom-3 text-[11px] text-muted-foreground font-mono">static view: no WebGL in this browser, so no basemap</div>
    </div>
  );
}
