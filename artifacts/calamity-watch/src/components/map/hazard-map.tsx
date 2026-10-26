import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { OfficialEvent, PlaceSignal } from "@workspace/api-client-react";
import { StaticMap } from "./static-map";

export type MapSelection = { kind: "place"; signal: PlaceSignal } | { kind: "official"; event: OfficialEvent };

const STYLE = "https://tiles.openfreemap.org/styles/dark";

function placesGeo(places: PlaceSignal[], colors: Record<string, string>) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((p, i) => ({
      type: "Feature" as const,
      id: i,
      geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      properties: {
        idx: i,
        color: colors[p.hazard] ?? "#3D9BFF",
        r: Math.max(5, Math.min(26, 4 + Math.sqrt(p.relevantPostsLastHour) * 3.2)),
        ring: Math.max(0.08, Math.min(1, p.zScore / 6)),
      },
    })),
  };
}

function eventsGeo(events: OfficialEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: events
      .filter((e) => e.lat != null && e.lon != null)
      .map((e) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [e.lon as number, e.lat as number] }, properties: { id: e.id } })),
  };
}

export function HazardMap({
  places,
  events,
  colors,
  onSelect,
  fitKey,
  className,
}: {
  places: PlaceSignal[];
  events: OfficialEvent[];
  colors: Record<string, string>;
  onSelect: (s: MapSelection | null) => void;
  /** When this string changes the map refits its view to the data. */
  fitKey: string;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
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
      m = new maplibregl.Map({
        container: el.current,
        style: STYLE,
        center: [40, 18],
        zoom: 1.2,
        attributionControl: { compact: false },
        dragRotate: false,
      });
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
    m.on("load", () => {
      m.addSource("places", { type: "geojson", data: placesGeo([], {}) });
      m.addSource("events", { type: "geojson", data: eventsGeo([]) });
      m.addLayer({
        id: "places-ring",
        type: "circle",
        source: "places",
        paint: {
          "circle-radius": ["+", ["get", "r"], 6],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#FF5C7A",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": ["get", "ring"],
        },
      });
      m.addLayer({
        id: "places-core",
        type: "circle",
        source: "places",
        paint: { "circle-radius": ["get", "r"], "circle-color": ["get", "color"], "circle-opacity": 0.85, "circle-stroke-color": "#0C1424", "circle-stroke-width": 1 },
      });
      m.addLayer({
        id: "events",
        type: "circle",
        source: "events",
        paint: { "circle-radius": 5, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#5EEAD4", "circle-stroke-width": 1.6 },
      });
      m.on("click", "places-core", (e) => {
        const idx = e.features?.[0]?.properties?.idx as number | undefined;
        const p = idx !== undefined ? dataRef.current.places[idx] : undefined;
        if (p) selectRef.current({ kind: "place", signal: p });
      });
      m.on("click", "events", (e) => {
        const id = e.features?.[0]?.properties?.id as number | undefined;
        const ev = dataRef.current.events.find((x) => x.id === id);
        if (ev) selectRef.current({ kind: "official", event: ev });
      });
      for (const l of ["places-core", "events"]) {
        m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
      }
      setLoaded(true);
    });
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    (m.getSource("places") as maplibregl.GeoJSONSource | undefined)?.setData(placesGeo(places, colors));
    (m.getSource("events") as maplibregl.GeoJSONSource | undefined)?.setData(eventsGeo(events));
  }, [places, events, colors, loaded]);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const { places: ps, events: es } = dataRef.current;
    const pts: [number, number][] = [...ps.map((p) => [p.lon, p.lat] as [number, number]), ...es.filter((e) => e.lat != null && e.lon != null).map((e) => [e.lon as number, e.lat as number] as [number, number])];
    if (pts.length === 0) {
      m.jumpTo({ center: [40, 18], zoom: 1.2 });
      return;
    }
    const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
    pts.forEach((p) => b.extend(p));
    m.fitBounds(b, { padding: 60, maxZoom: 6, duration: 0 });
  }, [fitKey, loaded]);

  return (
    <div className={className}>
      <div ref={el} className="absolute inset-0 fade-in" data-testid="map-board" role="region" aria-label="Map of place signals and official events. The same data is listed in the readout beside the map." />
      {failed && <StaticMap places={places} events={events} colors={colors} onSelect={onSelect} />}
    </div>
  );
}
