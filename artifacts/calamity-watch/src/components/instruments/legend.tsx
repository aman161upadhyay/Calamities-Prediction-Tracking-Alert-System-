import type { OfficialEvent, PlaceSignal } from "@workspace/api-client-react";
import { HAZARD_LABEL, num } from "@/lib/format";
import { STAMP_RADIUS_KM, StationGlyph, hasNearbyOfficial, markerGeom } from "./station-marker";

/** Explains the three encodings with the real values of the strongest place on the board. */
export function LegendPlate({ places, events }: { places: PlaceSignal[]; events: OfficialEvent[] }) {
  const top = places.reduce<PlaceSignal | null>((a, p) => (a === null || p.zScore > a.zScore ? p : a), null);
  const stamp = top ? hasNearbyOfficial(top, events) : false;
  const box = top ? Math.ceil(markerGeom(top).R + 12) : 20;
  return (
    <div className="plate text-[12px] leading-4 w-[260px]" data-testid="panel-map-legend">
      <p className="plate-label px-3 h-7 flex items-center border-b border-rule">Key{top ? `, read on ${top.name}` : ""}</p>
      <div className="p-3 flex gap-3">
        {top && (
          <svg width={box * 2} height={box * 2} viewBox={`${-box} ${-box} ${box * 2} ${box * 2}`} aria-hidden className="shrink-0">
            <StationGlyph p={top} stamp={stamp} />
          </svg>
        )}
        <dl className="grid gap-1.5 min-w-0">
          <div><dt className="inline font-semibold">Fill</dt> <dd className="inline text-ink-muted">hazard{top ? `: ${HAZARD_LABEL[top.hazard].toLowerCase()}` : ""}</dd></div>
          <div><dt className="inline font-semibold">Size</dt> <dd className="inline text-ink-muted">relevant posts per hour{top ? <>: <span className="num text-ink">{top.relevantPostsLastHour}</span></> : ""}</dd></div>
          <div><dt className="inline font-semibold text-pen">Ring</dt> <dd className="inline text-ink-muted">fear z, full at 3σ{top ? <>: <span className="num text-ink">{num(top.zScore, 1)}</span></> : ""}</dd></div>
          <div><dt className="inline font-semibold"><span className="inline-block align-middle mr-1"><StampMini /></span>Square</dt> <dd className="inline text-ink-muted">official event within {STAMP_RADIUS_KM} km, 72 h{top ? `: ${stamp ? "yes" : "none"}` : ""}</dd></div>
        </dl>
      </div>
    </div>
  );
}

/** The stamp form in miniature: an ink-ruled square. */
function StampMini() {
  return <span aria-hidden className="inline-block size-2.5 border-[1.5px] border-stamp" />;
}
