import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Hazard, OfficialMarker, Timeline, TimelinePoint } from "@workspace/api-client-react";
import { HAZARD_FALLBACK_COLOR, LEVEL_COLOR, LEVEL_LABEL, LEVEL_RANK, num, utcDateTime } from "@/lib/format";
import { LevelGlyph } from "@/components/kit";
import { FrameMarks } from "./frame-marks";
import { PlateLabel } from "./plate";

export type RecorderLane = { hazard: Hazard; label: string; timeline?: Timeline; failed?: boolean };

const HOUR = 3_600_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const M = { l: 12, r: 56, t: 10, b: 40 };
const STRIP = 24; // each lane's own official-record margin
const GAP = 12;

/* ---------- official stamp wording ---------- */
const GDACS_RANK: Record<string, number> = { red: 3, orange: 2, green: 1 };
const NWS_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1 };

function usgsMag(m: OfficialMarker): number | null {
  const r = /M\s?(\d+(?:\.\d+)?)/.exec(m.title);
  return r ? Number(r[1]) : null;
}
export function markerRank(m: OfficialMarker): number {
  const f = m.feed.toLowerCase();
  if (f === "usgs") return usgsMag(m) ?? 0;
  if (f === "gdacs") return GDACS_RANK[m.severity.toLowerCase()] ?? 0;
  if (f === "nws") return NWS_RANK[m.severity.toLowerCase()] ?? 0;
  return 0;
}
/** Feed plus magnitude or severity, as printed on a stamp. Never without the feed name. */
export function markerText(m: OfficialMarker, compact = false): string {
  const feed = (m.feed || m.feedLabel || "Official").toUpperCase();
  const f = m.feed.toLowerCase();
  // Replay scenarios carry curated records (feed "scenario", severity such as "national"); the stamp names them as records, not as a feed called SCENARIO.
  if (f === "scenario") return compact || !m.severity ? "RECORD" : `RECORD ${m.severity}`;
  if (f === "usgs") {
    const mag = usgsMag(m);
    return mag != null ? `${feed} M${mag.toFixed(1)}` : feed;
  }
  if (f === "nws") {
    if (compact) return feed;
    // Event type only, without the location: "Flood Warning: Alamosa" -> "Flood Warning".
    const t = (m.title || "").split(/:| issued| until| for | by |,/i)[0].trim();
    return t ? `${feed} ${t}` : m.severity ? `${feed} ${m.severity}` : feed;
  }
  return m.severity ? `${feed} ${m.severity}` : feed;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(1200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || 1200);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

function axisLabel(t: number) {
  const d = new Date(t);
  const h = d.getUTCHours();
  return h === 0 ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : `${String(h).padStart(2, "0")}h`;
}

type Run = { start: number; end: number; level: TimelinePoint["level"] };
function alertRuns(points: TimelinePoint[]): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  points.forEach((p, i) => {
    if (LEVEL_RANK[p.level] >= 2) {
      if (!cur) cur = { start: i, end: i, level: p.level };
      else {
        cur.end = i;
        if (LEVEL_RANK[p.level] > LEVEL_RANK[cur.level]) cur.level = p.level;
      }
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  });
  if (cur) runs.push(cur);
  return runs;
}

/**
 * The strip-chart recorder: a pen trace of fear mass per hour on chart paper, one lane per hazard, with the 7-day
 * baseline as a band, alert ticks where the level reached elevated or above, and each lane's official records
 * stamped in that lane's own margin strip.
 */
export function Recorder({
  lanes,
  live = false,
  label,
  laneHeight = 104,
  empty,
  testId = "recorder",
  loading = false,
  controls,
  shade,
  mark,
}: {
  lanes: RecorderLane[];
  live?: boolean;
  label: string[];
  laneHeight?: number;
  empty?: ReactNode;
  testId?: string;
  loading?: boolean;
  controls?: ReactNode;
  /** Optional shaded span (an alert window), drawn in ink hatching across every lane. */
  shade?: { from: string; to: string; label?: string };
  /** Optional marked moment (an alert opening), drawn as a pen tick with a label. */
  mark?: { at: string; label: string };
}) {
  const { ref, w: ow } = useWidth<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const ref0 = useMemo(() => lanes.reduce<Timeline | undefined>((a, l) => (l.timeline && (!a || l.timeline.points.length > a.points.length) ? l.timeline : a), undefined), [lanes]);
  const hours = useMemo(() => (ref0?.points ?? []).map((p) => +new Date(p.hour)), [ref0]);
  const span = Math.max(24, hours.length);
  // Below 640 px, 24 points fit; longer windows scroll, with lane labels kept outside the scroll.
  const narrow = ow < 640 && span > 36;
  const W = narrow ? ow * 3 : ow;
  const n = Math.max(1, lanes.length);
  const lh = ow < 640 ? Math.min(laneHeight, 88) : laneHeight;
  const block = STRIP + lh;
  const H = M.t + n * block + (n - 1) * GAP + M.b;
  const plotW = W - M.l - M.r;
  const clipId = `pen-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const binH = span > 36 ? 3 : 1;
  const compact = ow < 640;

  const [t0, t1] = useMemo(() => {
    if (hours.length > 1) return [hours[0], hours[hours.length - 1]];
    const end = Math.floor(Date.now() / HOUR) * HOUR;
    return [end - 23 * HOUR, end];
  }, [hours]);
  const x = (t: number) => M.l + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
  const laneTop = (i: number) => M.t + i * (block + GAP);

  const anyData = lanes.some((l) => l.timeline?.points.some((p) => p.nRelevant > 0));
  const drawKey = lanes.map((l) => `${l.hazard}:${l.timeline?.points[0]?.hour ?? ""}:${l.timeline?.points.length ?? 0}`).join("|");

  const [cursor, setCursor] = useState<number | null>(null);
  const idx = cursor ?? Math.max(0, hours.length - 1);

  useEffect(() => {
    if (!narrow || !scrollRef.current) return;
    // With a shaded window, start with the window about 24 px inside the visible area; otherwise at the latest hour.
    scrollRef.current.scrollLeft = shade ? Math.max(0, x(+new Date(shade.from)) - 24) : scrollRef.current.scrollWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, drawKey, shade?.from]);

  const sixes: number[] = [];
  // Tick spacing is the finest of 3, 6, 12 or 24 h that leaves at least 56 px between labels, so an 88 h dossier at 1024 wide still reads in 6 h steps while a 168 h week falls back to days.
  const step = ([3, 6, 12, 24] as const).find((h) => (plotW / span) * h >= 56 && !(compact && h < 6)) ?? 24;
  for (let t = Math.ceil(t0 / (step * HOUR)) * step * HOUR; t <= t1; t += step * HOUR) sixes.push(t);

  // Per-lane official records: every record is a tick; the strongest per bin gets the stamp label.
  const laneStamps = useMemo(
    () =>
      lanes.map((l) => {
        const ms = (l.timeline?.officialMarkers ?? []).filter((m) => +new Date(m.at) >= t0 - HOUR && +new Date(m.at) <= t1 + HOUR);
        const bins = new Map<number, OfficialMarker[]>();
        for (const m of ms) {
          const b = Math.floor(+new Date(m.at) / (binH * HOUR));
          bins.set(b, [...(bins.get(b) ?? []), m]);
        }
        const labels = [...bins.values()]
          .map((g) => {
            const top = [...g].sort((a, b) => markerRank(b) - markerRank(a))[0];
            return { top, all: g, text: `${markerText(top, compact)}${g.length > 1 ? ` +${g.length - 1}` : ""}` };
          })
          .sort((a, b) => +new Date(a.top.at) - +new Date(b.top.at));
        return { ticks: ms, labels };
      }),
    [lanes, t0, t1, binH, compact],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!hours.length) return;
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = Math.max(0, idx - (e.shiftKey ? 6 : 1));
    else if (e.key === "ArrowRight") next = Math.min(hours.length - 1, idx + (e.shiftKey ? 6 : 1));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = hours.length - 1;
    else if (e.key === "Escape") return setCursor(null);
    if (next === null) return;
    e.preventDefault();
    setCursor(next);
  };
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hours.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = t0 + ((px - M.l) / plotW) * (t1 - t0);
    setCursor(Math.max(0, Math.min(hours.length - 1, Math.round((t - t0) / HOUR))));
  };

  const cursorT = hours[idx];
  const livePen = live && cursor === null;

  return (
    <div className="relative" data-testid={testId}>
      <FrameMarks />
      <div className="bg-sheet border border-rule-strong">
        <PlateLabel
          parts={label}
          right={
            <span className="inline-flex items-center gap-4">
              <span className="hidden lg:inline-flex items-center gap-4">
                <Key kind="trace">fear mass</Key>
                <Key kind="base">7-day baseline</Key>
                <Key kind="tick">level mark</Key>
                <Key kind="stamp">{lanes.every((l) => l.timeline && l.timeline.placeId == null) ? "official record (context)" : "official record"}</Key>
              </span>
              {controls}
            </span>
          }
        />
        <div ref={ref} className="relative">
          <div ref={scrollRef} className={narrow ? "overflow-x-auto" : ""}>
            <div className="relative chart-paper" style={{ width: W, height: H }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block" onMouseMove={onMove} onMouseLeave={() => setCursor(null)} aria-hidden>
                <defs>
                  <clipPath id={clipId}>
                    <rect key={drawKey} className={anyData ? "pen-reveal" : ""} x={0} y={0} width={W} height={H} />
                  </clipPath>
                </defs>
                <rect x={W - M.r} y={0} width={M.r} height={H} fill="#FCFBF8" fillOpacity={0.85} />
                <line x1={W - M.r} x2={W - M.r} y1={0} y2={H} stroke="#DAD7CE" />
                {lanes.map((l, i) => (
                  <g key={`strip-${l.hazard}`}>
                    <rect x={0} y={laneTop(i)} width={W - M.r} height={STRIP - 2} fill="#F3F2EE" />
                    <line x1={0} x2={W - M.r} y1={laneTop(i) + STRIP - 2} y2={laneTop(i) + STRIP - 2} stroke="#DAD7CE" />
                  </g>
                ))}
                {sixes.map((t) => (
                  <g key={t}>
                    <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b + 4} stroke="rgba(31,77,184,0.26)" strokeWidth={new Date(t).getUTCHours() === 0 ? 1.25 : 0.75} />
                    <text x={x(t) + 3} y={H - 22} fontSize={10.5} fill="#5B5A54" fontFamily="Martian Mono, monospace">{`${String(new Date(t).getUTCHours()).padStart(2, "0")}h`}</text>
                    {new Date(t).getUTCHours() < step && <text x={x(t) + 3} y={H - 8} fontSize={10.5} fill="#15140F" fontFamily="Martian Mono, monospace">{axisLabel(Math.floor(t / (24 * HOUR)) * 24 * HOUR)}</text>}
                  </g>
                ))}
                {lanes.map((l, i) => {
                  const y0 = laneTop(i) + STRIP;
                  const pts = l.timeline?.points ?? [];
                  const max = Math.max(0.5, ...pts.map((p) => Math.max(p.fearMass, p.baselineMedian ?? 0))) * 1.12;
                  return (
                    <g key={l.hazard}>
                      <line x1={M.l} x2={W - M.r} y1={y0 + lh - 4} y2={y0 + lh - 4} stroke="#B9B5A9" />
                      <text x={W - M.r + 6} y={y0 + 12} fontSize={10} fill="#5B5A54" fontFamily="Martian Mono, monospace">{num(max, max < 10 ? 1 : 0)}</text>
                      <text x={W - M.r + 6} y={y0 + lh - 6} fontSize={10} fill="#5B5A54" fontFamily="Martian Mono, monospace">0</text>
                      {i < lanes.length - 1 && <line x1={0} x2={W} y1={y0 + lh + GAP / 2} y2={y0 + lh + GAP / 2} stroke="#DAD7CE" strokeDasharray="2 3" />}
                    </g>
                  );
                })}
                {shade && (() => {
                  const a = Math.max(M.l, x(+new Date(shade.from)));
                  const b = Math.min(W - M.r, x(+new Date(shade.to)));
                  if (!(b > a)) return null;
                  return (
                    <g data-testid="recorder-shade">
                      <rect x={a} y={M.t} width={b - a} height={H - M.t - M.b + 4} fill="rgba(21,20,15,0.07)" />
                      <line x1={a} x2={a} y1={M.t} y2={H - M.b + 4} stroke="#15140F" strokeWidth={0.75} strokeDasharray="2 2" />
                      <line x1={b} x2={b} y1={M.t} y2={H - M.b + 4} stroke="#15140F" strokeWidth={0.75} strokeDasharray="2 2" />
                      {shade.label && <text x={Math.min(b - 4, W - M.r - 4)} y={H - M.b - 4} textAnchor="end" fontSize={10} fill="#15140F" fontFamily="Martian Mono, monospace">{shade.label}</text>}
                    </g>
                  );
                })()}
                {mark && (() => {
                  const mx = x(+new Date(mark.at));
                  if (mx < M.l || mx > W - M.r) return null;
                  return (
                    <g data-testid="recorder-mark">
                      <line x1={mx} x2={mx} y1={M.t} y2={H - M.b + 4} stroke="#C8102E" strokeWidth={1.5} />
                      <text x={mx + 4} y={H - M.b - 4} fontSize={10} fill="#C8102E" fontWeight={600} fontFamily="Martian Mono, monospace">{mark.label}</text>
                    </g>
                  );
                })()}
                <g clipPath={`url(#${clipId})`}>
                  {lanes.map((l, i) => {
                    const ys = laneTop(i);
                    const { ticks, labels } = laneStamps[i];
                    let lastEnd = -Infinity;
                    return (
                      <g key={`st-${l.hazard}`}>
                        {ticks.map((m) => (
                          <line key={m.eventId} x1={x(+new Date(m.at))} x2={x(+new Date(m.at))} y1={ys + STRIP - 8} y2={ys + STRIP + lh - 4} stroke="#1E7A4A" strokeWidth={1} opacity={0.55} />
                        ))}
                        {labels.map((g) => {
                          // Martian Mono at 11 px with wdth 90 advances about 7.4 px per character; measured on screen, not from the font metrics.
                          const w = Math.ceil(g.text.length * 7.4 + 12);
                          let gx = x(+new Date(g.top.at)) + 3;
                          gx = Math.min(W - M.r - w - 4, gx); // never cross the lane's right edge
                          if (gx < M.l + 2 || gx < lastEnd + 4) return null; // the tick stays; its record is in the title and readout
                          lastEnd = gx + w;
                          return (
                            <g key={g.top.eventId} transform={`translate(${gx} ${ys + 3}) rotate(-1.5)`}>
                              <rect x={0} y={0} width={w} height={17} fill="#FCFBF8" stroke="#1E7A4A" strokeWidth={1.5} />
                              <text x={6} y={12.5} fontSize={11} style={{ fontStretch: "90%" }} fill="#1E7A4A" fontWeight={600} fontFamily="Martian Mono, monospace">{g.text}</text>
                              <title>{g.all.map((m) => `${m.feedLabel}: ${m.title} (${m.severity}), ${utcDateTime(m.at)}`).join("\n")}</title>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                  {lanes.map((l, i) => {
                    const y0 = laneTop(i) + STRIP;
                    const pts = l.timeline?.points ?? [];
                    if (!pts.length) return null;
                    const max = Math.max(0.5, ...pts.map((p) => Math.max(p.fearMass, p.baselineMedian ?? 0))) * 1.12;
                    const yv = (v: number) => y0 + lh - 4 - (v / max) * (lh - 22);
                    const px = (p: TimelinePoint) => x(+new Date(p.hour));
                    const trace = pts.map((p, j) => `${j ? "L" : "M"}${px(p).toFixed(1)},${yv(p.fearMass).toFixed(1)}`).join("");
                    const withBase = pts.filter((p) => p.baselineMedian != null);
                    const band = withBase.length > 1 ? `M${px(withBase[0]).toFixed(1)},${yv(0)}` + withBase.map((p) => `L${px(p).toFixed(1)},${yv(p.baselineMedian as number).toFixed(1)}`).join("") + `L${px(withBase[withBase.length - 1]).toFixed(1)},${yv(0)}Z` : "";
                    const baseLine = withBase.length > 1 ? withBase.map((p, j) => `${j ? "L" : "M"}${px(p).toFixed(1)},${yv(p.baselineMedian as number).toFixed(1)}`).join("") : "";
                    const last = pts[pts.length - 1];
                    return (
                      <g key={l.hazard}>
                        {band && <path d={band} fill="rgba(21,20,15,0.06)" />}
                        {baseLine && <path d={baseLine} fill="none" stroke="#5B5A54" strokeWidth={1} strokeDasharray="4 3" />}
                        {alertRuns(pts).map((r) => {
                          const xa = px(pts[r.start]);
                          const xb = px(pts[r.end]);
                          const c = LEVEL_COLOR[r.level];
                          return (
                            <g key={r.start}>
                              <line x1={xa} x2={xb} y1={y0 + 4} y2={y0 + 4} stroke={c} strokeWidth={2} />
                              <line x1={xa} x2={xa} y1={y0} y2={y0 + 14} stroke={c} strokeWidth={1.5} />
                              <g transform={`translate(${Math.min(xa - 5, W - M.r - 14)} ${y0 + 15})`}>
                                {r.level === "elevated" && <path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" fill={c} />}
                                {r.level === "high" && <circle cx={5} cy={5} r={4.2} fill={c} />}
                                {r.level === "severe" && <path d="M5 0.5 9.6 9.3H0.4Z" fill={c} />}
                              </g>
                            </g>
                          );
                        })}
                        <path d={trace} fill="none" stroke="#C8102E" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
                        <circle cx={px(last)} cy={yv(last.fearMass)} r={3.5} fill="#C8102E" className={livePen ? "pen-head" : ""} />
                      </g>
                    );
                  })}
                </g>
                {cursor !== null && cursorT !== undefined && <line x1={x(cursorT)} x2={x(cursorT)} y1={M.t} y2={H - M.b + 4} stroke="#15140F" strokeWidth={1} />}
              </svg>
              {!anyData && !loading && (
                <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: M.t + STRIP + 16 }}>
                  <div className="bg-sheet border border-rule-strong px-4 py-3 max-w-[52ch] text-center text-[14px] leading-5" data-testid="status-recorder-empty">
                    {empty ?? "No relevant posts in this window, so the pen rests at zero."}
                  </div>
                </div>
              )}
              {loading && (
                <p role="status" className="absolute left-4 mono text-[11px] text-ink-muted" style={{ top: M.t + STRIP + 24 }}>
                  Feeding chart paper: reading the hourly trace
                </p>
              )}
            </div>
          </div>
          {/* lane labels sit outside the scrolling sheet so they never scroll away */}
          {lanes.map((l, i) => (
            <span key={`lbl-${l.hazard}`} className="pointer-events-none absolute left-3 inline-flex items-center gap-1.5 bg-sheet/90 px-1 text-[12px] leading-4 font-bold" style={{ top: laneTop(i) + STRIP + 18 }}>
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: HAZARD_FALLBACK_COLOR[l.hazard] }} />
              {l.label}
            </span>
          ))}
        </div>
        <Readout lanes={lanes} idx={idx} pinned={cursor !== null} onKey={onKey} t={cursorT} />
      </div>
    </div>
  );
}

function Readout({ lanes, idx, pinned, onKey, t }: { lanes: RecorderLane[]; idx: number; pinned: boolean; onKey: (e: KeyboardEvent<HTMLDivElement>) => void; t?: number }) {
  const official = t === undefined ? [] : lanes.flatMap((l) => (l.timeline?.officialMarkers ?? []).filter((m) => { const a = +new Date(m.at); return a >= t && a < t + HOUR; }));
  const uniq = [...new Map(official.map((m) => [m.eventId, m])).values()];
  const aggregate = lanes.length > 0 && lanes.every((l) => l.timeline && l.timeline.placeId == null);
  return (
    <div
      tabIndex={0}
      role="group"
      aria-roledescription="chart readout"
      aria-label="Recorder readout. Use the left and right arrow keys to move hour by hour, shift for six hours, Home and End for the ends, Escape for the latest hour."
      onKeyDown={onKey}
      className="border-t border-rule-strong px-3 py-2 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr] items-start text-[12px] leading-5 outline-offset-[-2px]"
      data-testid="readout-recorder"
    >
      <p className="mono text-ink whitespace-nowrap" aria-live="polite">
        {aggregate && <span className="text-ink-muted">All places, </span>}
        <span className="text-ink-muted">{pinned ? "cursor" : "latest"}</span> {t !== undefined ? utcDateTime(new Date(t).toISOString()) : "no hours yet"}
      </p>
      <div>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {lanes.map((l) => {
            const p = l.timeline?.points[idx];
            return (
              <li key={l.hazard} className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5" data-testid={`readout-lane-${l.hazard}`}>
                <span className="font-semibold">{l.label}</span>
                {l.failed ? (
                  <span className="text-ink font-semibold whitespace-nowrap">Error: trace unavailable</span>
                ) : p ? (
                  <>
                    <span className="mono whitespace-nowrap"><span className="text-ink-muted">fear mass</span> {num(p.fearMass, 2)}</span>
                    <span className="mono whitespace-nowrap"><span className="text-ink-muted">baseline</span> {p.baselineMedian == null ? "n/a" : num(p.baselineMedian, 2)}</span>
                    <span className="mono whitespace-nowrap"><span className="text-ink-muted">z</span> {p.zScore == null ? "n/a" : num(p.zScore, 1)}</span>
                    <span className="mono whitespace-nowrap"><span className="text-ink-muted">posts</span> {p.nRelevant}</span>
                    {/* On an all-places lane the level is the aggregate crossing its thresholds, which never opens an alert; a place lane's level is the detector's own. */}
                    <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: LEVEL_COLOR[p.level] }}><LevelGlyph level={p.level} size={9} />{LEVEL_LABEL[p.level]}{aggregate && <span className="text-ink-muted font-normal"> (lane, not an alert)</span>}</span>
                  </>
                ) : (
                  <span className="text-ink-muted">reading</span>
                )}
              </li>
            );
          })}
        </ul>
        {uniq.length > 0 && (
          <ul className="mt-1 text-ink" data-testid="readout-official">
            {uniq.map((m) => (
              <li key={m.eventId} className="flex items-center gap-1.5 flex-wrap"><span aria-hidden className="inline-block size-2.5 border-[1.5px] border-stamp rotate-[-6deg]" /><span className="mono font-semibold">{markerText(m)}</span> <span className="text-ink-muted">{m.title}, {utcDateTime(m.at)}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Mono segmented switch for the recorder window; a radiogroup operable with arrow keys. */
export function WindowSwitch<T extends number>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.indexOf(value);
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + options.length) % options.length;
    if (n < 0) return;
    e.preventDefault();
    onChange(options[n]);
    (e.currentTarget.querySelectorAll("button")[n] as HTMLButtonElement | undefined)?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Recorder window" onKeyDown={onKey} className="inline-flex border border-rule-strong rounded-[3px] overflow-hidden" data-testid="switch-recorder-window">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          tabIndex={o === value ? 0 : -1}
          onClick={() => onChange(o)}
          data-testid={`button-window-${o}`}
          className={`mono text-[11px] leading-none h-6 px-2 ${o === value ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"}`}
        >
          {o} h
        </button>
      ))}
    </div>
  );
}

function Key({ kind, children }: { kind: "trace" | "base" | "tick" | "stamp"; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 normal-case">
      <svg width="18" height="10" aria-hidden>
        {kind === "trace" && <path d="M0 8 L5 6 L9 7 L13 2 L18 4" fill="none" stroke="#C8102E" strokeWidth="1.5" />}
        {kind === "base" && <line x1="0" x2="18" y1="5" y2="5" stroke="#5B5A54" strokeDasharray="4 3" />}
        {kind === "tick" && <><line x1="4" x2="4" y1="0" y2="10" stroke="#C8102E" strokeWidth="1.5" /><line x1="4" x2="16" y1="1" y2="1" stroke="#C8102E" strokeWidth="2" /></>}
        {kind === "stamp" && <rect x="3" y="1" width="12" height="8" fill="none" stroke="#1E7A4A" strokeWidth="1.5" transform="rotate(-4 9 5)" />}
      </svg>
      {children}
    </span>
  );
}
