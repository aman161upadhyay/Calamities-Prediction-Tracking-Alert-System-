import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { OfficialEvent, PlaceSignal } from "@workspace/api-client-react";
import { HAZARD_LABEL, LEVEL_LABEL, num } from "@/lib/format";
import { StationGlyph, hasNearbyOfficial } from "@/components/instruments/station-marker";
import type { MapSelection } from "./hazard-map";
import { ringsToPath } from "./geo-path";

const W = 1000;

/**
 * The plotting sheet for browsers without WebGL: the same station glyphs on an equirectangular graticule.
 * It is the instrument, drawn by hand rather than on tiles.
 */
export function StaticMap({ places, events, onSelect, selected }: { places: PlaceSignal[]; events: OfficialEvent[]; colors?: Record<string, string>; onSelect: (s: MapSelection | null) => void; selected?: string | null }) {
  const [land, setLand] = useState<number[][] | null>(null);
  // The viewBox takes the container's real aspect, so nothing is cropped and labels can flip at the true edge.
  const box = useRef<HTMLDivElement>(null);
  const [H, setH] = useState(560);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const set = (w: number, h: number) => w > 0 && h > 0 && setH(Math.round((W * h) / w));
    set(el.clientWidth, el.clientHeight);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => set(e.contentRect.width, e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    import("./land-110m").then((m) => live && setLand(m.LAND_RINGS)).catch(() => undefined);
    return () => { live = false; };
  }, []);
  const view = useMemo(() => {
    const pts: [number, number][] = [...places.map((p) => [p.lon, p.lat] as [number, number]), ...events.filter((e) => e.lat != null && e.lon != null).map((e) => [e.lon as number, e.lat as number] as [number, number])];
    if (pts.length === 0) return { lon0: -180, lon1: 180, lat0: -60, lat1: 80 };
    let lon0 = Math.min(...pts.map((p) => p[0]));
    let lon1 = Math.max(...pts.map((p) => p[0]));
    let lat0 = Math.min(...pts.map((p) => p[1]));
    let lat1 = Math.max(...pts.map((p) => p[1]));
    const padLon = Math.max(8, (lon1 - lon0) * 0.08);
    const padLat = Math.max(6, (lat1 - lat0) * 0.12);
    lon0 -= padLon; lon1 += padLon; lat0 -= padLat; lat1 += padLat;
    const want = (W / H) * ((lat1 - lat0) / (lon1 - lon0));
    if (want > 1) { const c = (lon0 + lon1) / 2; const h = ((lon1 - lon0) * want) / 2; lon0 = c - h; lon1 = c + h; }
    else { const c = (lat0 + lat1) / 2; const h = (lat1 - lat0) / want / 2; lat0 = c - h; lat1 = c + h; }
    return { lon0: Math.max(-180, lon0), lon1: Math.min(180, lon1), lat0: Math.max(-85, lat0), lat1: Math.min(85, lat1) };
  }, [places, events, H]);

  const x = (lon: number) => ((lon - view.lon0) / (view.lon1 - view.lon0)) * W;
  const y = (lat: number) => ((view.lat1 - lat) / (view.lat1 - view.lat0)) * H;
  const span = view.lon1 - view.lon0;
  const step = span > 90 ? 30 : span > 30 ? 10 : 5;
  const lons: number[] = [];
  for (let l = Math.ceil(view.lon0 / step) * step; l <= view.lon1; l += step) lons.push(l);
  const lats: number[] = [];
  for (let l = Math.ceil(view.lat0 / step) * step; l <= view.lat1; l += step) lats.push(l);
  const deg = (v: number, pos: string, neg: string) => (v === 0 ? "0°" : `${Math.abs(v)}°${v > 0 ? pos : neg}`);

  // Label the strongest places (10, plus the selected one), flipping left at the frame and skipping collisions
  // with other labels and with markers; text width estimated at 7 px per character at 12 px.
  const labelled = useMemo(() => {
    const out = new Map<string, "r" | "l">();
    const boxes: [number, number, number, number][] = [];
    const markerBoxes = places.map((p) => { const r = 6 + Math.sqrt(p.relevantPostsLastHour) * 2.6; const px = x(p.lon), py = y(p.lat); return [px - r, py - r, px + r, py + r] as [number, number, number, number]; });
    const hit = (b: [number, number, number, number], own: number) =>
      boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) ||
      markerBoxes.some((o, i) => i !== own && b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const seen = new Set<number>();
    const order = [...places.keys()].sort((i, j) => {
      const a = places[i], b = places[j];
      const sa = `${a.placeId}:${a.hazard}` === selected ? 1 : 0, sb = `${b.placeId}:${b.hazard}` === selected ? 1 : 0;
      return sb - sa || b.zScore - a.zScore || b.relevantPostsLast24h - a.relevantPostsLast24h;
    });
    let count = 0;
    for (const i of order) {
      const p = places[i];
      const key = `${p.placeId}:${p.hazard}`;
      const isSel = key === selected;
      if (!isSel && (count >= 10 || seen.has(p.placeId))) continue;
      const px = x(p.lon), py = y(p.lat);
      if (px < 0 || px > W || py < 0 || py > H) continue;
      const tw = p.name.length * 7;
      const off = 8 + Math.sqrt(p.relevantPostsLastHour) * 2.6;
      const right: [number, number, number, number] = [px + off, py - 9, px + off + tw, py + 6];
      const left: [number, number, number, number] = [px - off - tw, py - 9, px - off, py + 6];
      const fitsR = right[2] <= W - 4, fitsL = left[0] >= 4;
      let side: "r" | "l" | null = null;
      if (fitsR && (isSel || !hit(right, i))) side = "r";
      else if (fitsL && (isSel || !hit(left, i))) side = "l";
      if (!side) continue;
      boxes.push(side === "r" ? right : left);
      out.set(key, side);
      seen.add(p.placeId);
      if (!isSel) count++;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, view, selected, H]);

  const landPath = useMemo(() => {
    if (!land) return "";
    return ringsToPath(land, x, y, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [land, view]);

  const ordered = [...places].sort((a, b) => a.zScore - b.zScore);

  // One tab stop for the whole sheet: the strongest station takes it, arrow keys walk the markers (strongest first,
  // then the official records), Enter reads one. Without this every marker was a stop and the board took hundreds of Tabs.
  const visibleEvents = events.filter((e) => e.lat != null && e.lon != null);
  const rovingKeys = useMemo(
    () => [...[...places].sort((a, b) => b.zScore - a.zScore).map((p) => `${p.placeId}:${p.hazard}`), ...visibleEvents.map((e) => `e${e.id}`)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [places, events],
  );
  const [stop, setStop] = useState<string | null>(null);
  const activeKey = stop && rovingKeys.includes(stop) ? stop : rovingKeys[0] ?? null;
  const nodes = useRef(new Map<string, SVGGElement>());
  const onSheetKey = (ev: KeyboardEvent<SVGSVGElement>) => {
    const current = (ev.target as Element).closest<SVGGElement>("[data-marker-key]")?.dataset.markerKey;
    if (!current) return;
    const i = rovingKeys.indexOf(current);
    let next: string | undefined;
    if (ev.key === "ArrowRight" || ev.key === "ArrowDown") next = rovingKeys[(i + 1) % rovingKeys.length];
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") next = rovingKeys[(i - 1 + rovingKeys.length) % rovingKeys.length];
    else if (ev.key === "Home") next = rovingKeys[0];
    else if (ev.key === "End") next = rovingKeys[rovingKeys.length - 1];
    if (!next) return;
    ev.preventDefault();
    setStop(next);
    nodes.current.get(next)?.focus();
  };
  const roving = (key: string) => ({
    tabIndex: key === activeKey ? 0 : -1,
    "data-marker-key": key,
    ref: (el: SVGGElement | null) => { if (el) nodes.current.set(key, el); else nodes.current.delete(key); },
    onFocus: () => setStop(key),
  });

  return (
    <div ref={box} className="absolute inset-0 bg-sheet" data-testid="map-static">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full" role="group" aria-label="Plotting sheet of place signals and official events. One tab stop: arrow keys move between markers, strongest station first, Enter reads one." onKeyDown={onSheetKey}>
        <defs><clipPath id="sheet-clip"><rect x={0} y={0} width={W} height={H} /></clipPath></defs>
        {landPath && <path d={landPath} clipPath="url(#sheet-clip)" fill="var(--cr-land)" stroke="var(--cr-border)" strokeWidth={0.8} strokeLinejoin="round" data-testid="map-static-land" />}
        {lons.map((l) => (
          <g key={`lon${l}`}>
            <line x1={x(l)} x2={x(l)} y1={0} y2={H} stroke={l === 0 ? "var(--cr-rule-strong)" : "var(--cr-graticule)"} strokeWidth={1} />
            <text x={x(l) + 4} y={H - 8} fontSize={10} fill="var(--cr-ink-muted)" fontFamily="var(--app-font-mono)">{deg(l, "E", "W")}</text>
          </g>
        ))}
        {lats.map((l) => (
          <g key={`lat${l}`}>
            <line x1={0} x2={W} y1={y(l)} y2={y(l)} stroke={l === 0 ? "var(--cr-rule-strong)" : "var(--cr-graticule)"} strokeWidth={1} />
            <text x={W - 6} y={y(l) - 4} textAnchor="end" fontSize={10} fill="var(--cr-ink-muted)" fontFamily="var(--app-font-mono)">{deg(l, "N", "S")}</text>
          </g>
        ))}
        {visibleEvents.map((e) => (
          <g key={`e${e.id}`} {...roving(`e${e.id}`)} transform={`translate(${x(e.lon as number)} ${y(e.lat as number)})`} style={{ cursor: "pointer" }} className="static-marker" role="button" aria-label={`Official record, ${e.feedLabel}: ${e.title}`} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect({ kind: "official", event: e }); } }} onClick={() => onSelect({ kind: "official", event: e })} data-testid={`marker-official-${e.id}`}>
            <rect x={-4} y={-4} width={8} height={8} fill="var(--cr-sheet)" stroke="var(--cr-stamp)" strokeWidth={1.5} />
            <title>{`${e.feedLabel}: ${e.title} (${e.severity})`}</title>
          </g>
        ))}
        {ordered.map((p) => {
          const key = `${p.placeId}:${p.hazard}`;
          const px = x(p.lon), py = y(p.lat);
          return (
            <g key={key} {...roving(key)} transform={`translate(${px} ${py})`} style={{ cursor: "pointer" }} className="static-marker" role="button" aria-label={`${p.name}, ${HAZARD_LABEL[p.hazard]}, ${LEVEL_LABEL[p.level]}, z ${num(p.zScore, 1)}`} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect({ kind: "place", signal: p }); } }} onClick={() => onSelect({ kind: "place", signal: p })} data-testid={`marker-place-${p.placeId}-${p.hazard}`}>
              <StationGlyph p={p} stamp={hasNearbyOfficial(p, events)} />
              {labelled.has(key) && (
                <text x={labelled.get(key) === "l" ? -(8 + Math.sqrt(p.relevantPostsLastHour) * 2.6) : 8 + Math.sqrt(p.relevantPostsLastHour) * 2.6} y={4} textAnchor={labelled.get(key) === "l" ? "end" : "start"} fontSize={12} fontWeight={600} fill="var(--cr-ink)" fontFamily="var(--app-font-sans)" paintOrder="stroke" stroke="var(--cr-sheet)" strokeWidth={3.5}>
                  {p.name}
                </text>
              )}
              <title>{`${p.name}, ${HAZARD_LABEL[p.hazard]}: ${LEVEL_LABEL[p.level]}, z ${num(p.zScore, 1)}, ${p.relevantPostsLastHour} relevant posts in the last hour`}</title>
            </g>
          );
        })}
      </svg>
      <p className="absolute right-3 bottom-2 max-w-[55%] text-right leading-tight mono text-[10px] text-ink-muted bg-sheet/90 px-1.5">Plotting sheet: Natural Earth 110m land outlines (public domain), equirectangular; interactive tiles are unavailable in this browser</p>
    </div>
  );
}
