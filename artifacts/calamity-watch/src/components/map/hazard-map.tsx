import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { OfficialEvent, PlaceSignal } from "@workspace/api-client-react";
import { HAZARD_LABEL, LEVEL_LABEL, num } from "@/lib/format";
import { hasNearbyOfficial, officialSvg, stationSvg } from "@/components/instruments/station-marker";
import { StaticMap } from "./static-map";

export type MapSelection = { kind: "place"; signal: PlaceSignal } | { kind: "official"; event: OfficialEvent };

const STYLE = "https://tiles.openfreemap.org/styles/positron";

export function HazardMap({
  places,
  events,
  onSelect,
  fitKey,
  className,
  selected,
}: {
  selected?: string | null;
  places: PlaceSignal[];
  events: OfficialEvent[];
  colors?: Record<string, string>;
  onSelect: (s: MapSelection | null) => void;
  /** When this string changes the map refits its view to the data. */
  fitKey: string;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const dataRef = useRef({ places, events });
  dataRef.current = { places, events };
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({ container: el.current, style: STYLE, center: [40, 18], zoom: 1.2, attributionControl: { compact: false }, dragRotate: false });
    } catch (err) {
      console.warn("hazard map: MapLibre could not start", err);
      setFailed(true);
      return;
    }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("error", (e) => {
      if (!m.loaded() && String(e.error?.message ?? "").toLowerCase().includes("style")) setFailed(true);
    });
    m.on("load", () => setLoaded(true));
    return () => {
      markers.current.forEach((k) => k.remove());
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    markers.current.forEach((k) => k.remove());
    markers.current = [];
    for (const e of events) {
      if (e.lat == null || e.lon == null) continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "station-btn";
      b.innerHTML = officialSvg();
      b.setAttribute("aria-label", `Official record, ${e.feedLabel}: ${e.title}`);
      b.onclick = (ev) => { ev.stopPropagation(); selectRef.current({ kind: "official", event: e }); };
      markers.current.push(new maplibregl.Marker({ element: b }).setLngLat([e.lon, e.lat]).addTo(m));
    }
    const sorted = [...places].sort((a, b) => a.zScore - b.zScore);
    for (const p of sorted) {
      const { svg } = stationSvg(p, hasNearbyOfficial(p, events));
      const b = document.createElement("button");
      b.type = "button";
      b.className = "station-btn";
      b.innerHTML = svg;
      b.setAttribute("aria-label", `${p.name}, ${HAZARD_LABEL[p.hazard]}, ${LEVEL_LABEL[p.level]}, z ${num(p.zScore, 1)}, ${p.relevantPostsLastHour} relevant posts in the last hour`);
      b.onclick = (ev) => { ev.stopPropagation(); selectRef.current({ kind: "place", signal: p }); };
      markers.current.push(new maplibregl.Marker({ element: b }).setLngLat([p.lon, p.lat]).addTo(m));
    }
  }, [places, events, loaded]);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const { places: ps, events: es } = dataRef.current;
    const pts: [number, number][] = [...ps.map((p) => [p.lon, p.lat] as [number, number]), ...es.filter((e) => e.lat != null && e.lon != null).map((e) => [e.lon as number, e.lat as number] as [number, number])];
    if (pts.length === 0) return void m.jumpTo({ center: [40, 18], zoom: 1.2 });
    const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
    pts.forEach((p) => b.extend(p));
    m.fitBounds(b, { padding: 60, maxZoom: 6, duration: 0 });
  }, [fitKey, loaded]);

  return (
    <div className={className}>
      <div ref={el} className="absolute inset-0" data-testid="map-board" role="region" aria-label="Map of place signals and official events. The same data is listed beside the map." />
      {failed && <StaticMap places={places} events={events} onSelect={onSelect} selected={selected} />}
    </div>
  );
}
