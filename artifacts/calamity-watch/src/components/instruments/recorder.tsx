import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Hazard, OfficialMarker, Timeline, TimelinePoint } from "@workspace/api-client-react";
import { HAZARD_FALLBACK_COLOR, LEVEL_COLOR, LEVEL_LABEL, LEVEL_RANK, num, utcDateTime } from "@/lib/format";
import { LevelGlyph } from "@/components/kit";
import { cn } from "@/lib/utils";

export type RecorderLane = { hazard: Hazard; label: string; timeline?: Timeline; failed?: boolean };

const HOUR = 3_600_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STRIP = 24; // each lane's top margin, where official-record chips sit
const GAP = 14;
const HALO_ALPHA: Record<TimelinePoint["level"], number> = { insufficient: 0.1, low: 0.1, elevated: 0.18, high: 0.26, severe: 0.34 };

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
 * The recorder: fear mass per hour as glowing dots, one lane per hazard. Each hour is a core dot in the hazard's hue
 * with a halo whose radius grows with the square root of fear mass and whose alpha steps with the level; a hairline
 * joins the cores so the shape reads at a glance. The 7-day baseline stays a dashed hairline, level runs are ink marks
 * in the lane's top margin, and official records are ink-ruled chips there too. No grid, no frame: the tape sits on
 * the page with the axis beneath it.
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
  cursor: playhead,
}: {
  lanes: RecorderLane[];
  live?: boolean;
  label: string[];
  laneHeight?: number;
  empty?: ReactNode;
  testId?: string;
  loading?: boolean;
  controls?: ReactNode;
  /** Optional shaded span (an alert window), drawn as a faint ink wash across every lane. */
  shade?: { from: string; to: string; label?: string };
  /** Optional marked moment (an alert opening), drawn as a pen rule with a label. */
  mark?: { at: string; label: string };
  /** Optional playhead (a replay clock), drawn as an ink rule with a mono label. */
  cursor?: { at: string; label?: string };
}) {
  const { ref, w: ow } = useWidth<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Lane labels live in a left margin from 640 px up; below that the margin goes and the label sits in the lane's strip.
  const M = { l: ow < 640 ? 12 : 108, r: 56, t: 8, b: 36 };

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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `tape-${uid}`;
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
  // Under a replay the readout rests on the last hour complete at the playhead (the hour the board reads), not on the end of the tape.
  const playheadIdx = useMemo(() => {
    if (!playhead) return null;
    const t = +new Date(playhead.at);
    let i = -1;
    for (let k = 0; k < hours.length; k++) if (hours[k] + 3_600_000 <= t) i = k;
    return i >= 0 ? i : null;
  }, [playhead, hours]);
  // On a live tape the last bucket is the hour still being written: it is drawn hollow, kept out of the trace, and the
  // readout rests on the last complete hour. Otherwise the trace fell to zero at the top of every hour.
  const inProgress = live && hours.length > 1 && hours[hours.length - 1] + HOUR > Date.now();
  const lastDone = Math.max(0, hours.length - (inProgress ? 2 : 1));
  const idx = cursor ?? playheadIdx ?? lastDone;

  useEffect(() => {
    if (!narrow || !scrollRef.current) return;
    // With a shaded window, start with the window about 24 px inside the visible area; with a playhead, keep it a third of the way in; otherwise at the latest hour.
    const el = scrollRef.current;
    el.scrollLeft = shade ? Math.max(0, x(+new Date(shade.from)) - 24) : playhead ? Math.max(0, x(+new Date(playhead.at)) - el.clientWidth / 3) : el.scrollWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, drawKey, shade?.from, playhead?.at]);

  const ticks: number[] = [];
  // Tick spacing is the finest of 3 h to 7 days that leaves at least 56 px between labels, so an 88 h dossier at 1024 wide still reads in 6 h steps, a 168 h week falls back to days, and a whole replay tape on a phone to weeks.
  const step = ([3, 6, 12, 24, 48, 72, 168] as const).find((h) => (plotW / span) * h >= 56 && !(compact && h < 6)) ?? 168;
  for (let t = Math.ceil(t0 / (step * HOUR)) * step * HOUR; t <= t1; t += step * HOUR) ticks.push(t);

  // Per-lane official records: every record is a tick; the strongest per bin gets the chip.
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
    else if (e.key === "ArrowRight") next = Math.min(lastDone, idx + (e.shiftKey ? 6 : 1));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = lastDone;
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
  const hazardsDrawn = [...new Set(lanes.map((l) => l.hazard))];
  // The tape reveals left to right at one speed: 1.8 s for a 72 h window, 1.1 s for 24 h.
  const revealMs = Math.round(1100 + Math.min(1, Math.max(0, (span - 24) / 48)) * 700);

  return (
    <div className="tape relative" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 min-h-8 px-3 py-1.5 border-b border-rule">
        <p className="plate-label text-ink truncate max-w-full" data-testid={`${testId}-label`}>
          {(compact && label.length > 3 ? label.slice(0, 3) : label).join(" · ")}
        </p>
        <div className="shrink-0 ml-auto inline-flex items-center gap-4 text-[11px] text-ink-muted">
          <span className="hidden xl:inline-flex items-center gap-4">
            <Key kind="trace" hazard={hazardsDrawn[0] ?? "flood"}>fear mass per hour</Key>
            <Key kind="base">7-day baseline</Key>
            <Key kind="tick">level mark</Key>
            <Key kind="stamp">{lanes.every((l) => l.timeline && l.timeline.placeId == null) ? "official record (context)" : "official record"}</Key>
          </span>
          {controls}
        </div>
      </div>
      <div ref={ref} className="relative">
        <div ref={scrollRef} className={narrow ? "overflow-x-auto" : ""}>
          <div className="relative" style={{ width: W, height: H }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block" onMouseMove={onMove} onMouseLeave={() => setCursor(null)} aria-hidden>
              <defs>
                <clipPath id={clipId}>
                  <rect key={drawKey} className={anyData ? "pen-reveal" : ""} style={anyData ? { animationDuration: `${revealMs}ms` } : undefined} x={0} y={0} width={W} height={H} />
                </clipPath>
                {hazardsDrawn.map((h) => (
                  <radialGradient key={h} id={`halo-${uid}-${h}`}>
                    <stop offset="0%" stopColor={HAZARD_FALLBACK_COLOR[h]} stopOpacity={1} />
                    <stop offset="45%" stopColor={HAZARD_FALLBACK_COLOR[h]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={HAZARD_FALLBACK_COLOR[h]} stopOpacity={0} />
                  </radialGradient>
                ))}
              </defs>
              {/* axis: short ticks and labels beneath the lanes, no lines through them */}
              <line x1={M.l} x2={W - M.r} y1={H - M.b + 6} y2={H - M.b + 6} stroke="var(--cr-rule-strong)" />
              {ticks.map((t) => {
                const midnight = new Date(t).getUTCHours() === 0;
                return (
                  <g key={t}>
                    <line x1={x(t)} x2={x(t)} y1={H - M.b + 6} y2={H - M.b + (midnight ? 13 : 10)} stroke="var(--cr-rule-strong)" />
                    {step < 24 && !midnight && <text x={x(t) + 3} y={H - 14} fontSize={10.5} fill="var(--cr-ink-muted)" fontFamily="var(--app-font-mono)">{`${String(new Date(t).getUTCHours()).padStart(2, "0")}h`}</text>}
                    {new Date(t).getUTCHours() < step && <text x={x(t) + 3} y={H - 14} fontSize={10.5} fill="var(--cr-ink)" fontFamily="var(--app-font-mono)">{axisLabel(Math.floor(t / (24 * HOUR)) * 24 * HOUR)}</text>}
                  </g>
                );
              })}
              {lanes.map((l, i) => {
                const y0 = laneTop(i) + STRIP;
                const pts = l.timeline?.points ?? [];
                const max = Math.max(0.5, ...pts.map((p) => Math.max(p.fearMass, p.baselineMedian ?? 0))) * 1.12;
                return (
                  <g key={l.hazard}>
                    {/* the lane's zero line and its scale, in the right margin */}
                    <line x1={M.l} x2={W - M.r} y1={y0 + lh - 4} y2={y0 + lh - 4} stroke="var(--cr-rule)" />
                    <text x={W - M.r + 8} y={y0 + 12} fontSize={10} fill="var(--cr-ink-muted)" fontFamily="var(--app-font-mono)">{num(max, max < 10 ? 1 : 0)}</text>
                    <text x={W - M.r + 8} y={y0 + lh - 6} fontSize={10} fill="var(--cr-ink-muted)" fontFamily="var(--app-font-mono)">0</text>
                    {/* separators between lanes stop 12 px short of each edge */}
                    {i < lanes.length - 1 && <line x1={12} x2={W - 12} y1={y0 + lh + GAP / 2} y2={y0 + lh + GAP / 2} stroke="var(--cr-rule)" />}
                  </g>
                );
              })}
              {shade && (() => {
                const a = Math.max(M.l, x(+new Date(shade.from)));
                const b = Math.min(W - M.r, x(+new Date(shade.to)));
                if (!(b > a)) return null;
                return (
                  <g data-testid="recorder-shade">
                    <rect x={a} y={M.t} width={b - a} height={H - M.t - M.b + 4} fill="color-mix(in srgb, var(--cr-ink) 6%, transparent)" />
                    <line x1={a} x2={a} y1={M.t} y2={H - M.b + 4} stroke="var(--cr-ink)" strokeWidth={0.75} strokeDasharray="2 2" />
                    <line x1={b} x2={b} y1={M.t} y2={H - M.b + 4} stroke="var(--cr-ink)" strokeWidth={0.75} strokeDasharray="2 2" />
                    {shade.label && <text x={Math.min(b - 4, W - M.r - 4)} y={H - M.b - 2} textAnchor="end" fontSize={10} fill="var(--cr-ink)" fontFamily="var(--app-font-mono)">{shade.label}</text>}
                  </g>
                );
              })()}
              {mark && (() => {
                const mx = x(+new Date(mark.at));
                if (mx < M.l || mx > W - M.r) return null;
                return (
                  <g data-testid="recorder-mark">
                    <line x1={mx} x2={mx} y1={M.t} y2={H - M.b + 4} stroke="var(--cr-pen)" strokeWidth={1.5} />
                    <text x={mx + 4} y={H - M.b - 2} fontSize={10} fill="var(--cr-pen)" fontWeight={600} fontFamily="var(--app-font-mono)">{mark.label}</text>
                  </g>
                );
              })()}
              {playhead && (() => {
                const cx = x(+new Date(playhead.at));
                if (cx < M.l || cx > W - M.r) return null;
                return (
                  // The playhead glides between hours instead of jumping, like a transport needle; reduced motion drops the glide.
                  <g data-testid="recorder-cursor" className="cursor-glide" style={{ transform: `translate(${cx}px, 0)` }}>
                    <line x1={0} x2={0} y1={M.t} y2={H - M.b + 4} stroke="var(--cr-ink)" strokeWidth={1.5} />
                    <path d={`M-5 ${M.t} L5 ${M.t} L0 ${M.t + 7}Z`} fill="var(--cr-ink)" />
                    <text x={cx > W - M.r - 90 ? -4 : 4} textAnchor={cx > W - M.r - 90 ? "end" : "start"} y={H - M.b - 2} fontSize={10} fill="var(--cr-ink)" fontWeight={600} fontFamily="var(--app-font-mono)">{playhead.label ?? "playhead"}</text>
                  </g>
                );
              })()}
              <g clipPath={`url(#${clipId})`}>
                {lanes.map((l, i) => {
                  const ys = laneTop(i);
                  const { ticks: recs, labels } = laneStamps[i];
                  let lastEnd = -Infinity;
                  return (
                    <g key={`st-${l.hazard}`}>
                      {recs.map((m) => (
                        <line key={m.eventId} x1={x(+new Date(m.at))} x2={x(+new Date(m.at))} y1={ys + STRIP - 6} y2={ys + STRIP + lh - 4} stroke="var(--cr-ink)" strokeWidth={1} opacity={0.3} />
                      ))}
                      {labels.map((g) => {
                        // Both monos advance 0.6 em per character: 6.6 px at 11 px, plus the chip's padding.
                        const w = Math.ceil(g.text.length * 6.6 + 12);
                        let gx = x(+new Date(g.top.at)) + 3;
                        gx = Math.min(W - M.r - w - 4, gx); // never cross the lane's right edge
                        if (gx < M.l + 2 || gx < lastEnd + 4) return null; // the tick stays; its record is in the title and readout
                        lastEnd = gx + w;
                        return (
                          <g key={g.top.eventId} transform={`translate(${gx} ${ys + 2})`}>
                            <rect x={0.5} y={0.5} width={w - 1} height={16} fill="var(--cr-sheet)" stroke="var(--cr-ink)" strokeWidth={1} />
                            <text x={6} y={12.5} fontSize={11} fill="var(--cr-ink)" fontWeight={500} fontFamily="var(--app-font-mono)">{g.text}</text>
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
                  const drawn = inProgress ? pts.slice(0, -1) : pts;
                  const partial = inProgress ? pts[pts.length - 1] : undefined;
                  const trace = drawn.map((p, j) => `${j ? "L" : "M"}${px(p).toFixed(1)},${yv(p.fearMass).toFixed(1)}`).join("");
                  const withBase = pts.filter((p) => p.baselineMedian != null);
                  const baseLine = withBase.length > 1 ? withBase.map((p, j) => `${j ? "L" : "M"}${px(p).toFixed(1)},${yv(p.baselineMedian as number).toFixed(1)}`).join("") : "";
                  // Halo radius grows with the square root of fear mass: the lane's largest hour reaches 15 px.
                  const haloK = 15 / Math.sqrt(Math.max(0.5, ...drawn.map((p) => p.fearMass)));
                  const hue = HAZARD_FALLBACK_COLOR[l.hazard];
                  const fill = `url(#halo-${uid}-${l.hazard})`;
                  const dense = plotW / Math.max(1, drawn.length) < 6;
                  return (
                    <g key={l.hazard}>
                      {baseLine && <path d={baseLine} fill="none" stroke="var(--cr-ink-muted)" strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />}
                      {alertRuns(drawn).map((r) => {
                        const xa = px(drawn[r.start]);
                        const xb = px(drawn[r.end]);
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
                      <path d={trace} fill="none" stroke="var(--cr-ink)" strokeOpacity={0.18} strokeWidth={1} strokeLinejoin="round" />
                      {drawn.map((p) =>
                        p.fearMass > 0 ? (
                          <circle key={`h${p.hour}`} cx={px(p)} cy={yv(p.fearMass)} r={Math.max(4, Math.sqrt(p.fearMass) * haloK)} fill={fill} opacity={HALO_ALPHA[p.level]} />
                        ) : null,
                      )}
                      {drawn.map((p) =>
                        p.fearMass > 0 ? (
                          <circle key={`c${p.hour}`} cx={px(p)} cy={yv(p.fearMass)} r={dense ? 2.2 : 3} fill={hue} />
                        ) : (
                          <circle key={`c${p.hour}`} cx={px(p)} cy={yv(0)} r={dense ? 1 : 1.4} fill="var(--cr-ink)" opacity={0.28} />
                        ),
                      )}
                      {partial && (
                        <circle cx={px(partial)} cy={yv(partial.fearMass)} r={3.5} fill="var(--cr-sheet)" stroke={hue} strokeWidth={1.6} className={livePen ? "pen-head" : ""}>
                          <title>{`${utcDateTime(partial.hour)} so far: ${partial.nRelevant} relevant posts, fear mass ${num(partial.fearMass, 2)}; the hour is still being written`}</title>
                        </circle>
                      )}
                    </g>
                  );
                })}
              </g>
              {cursor !== null && cursorT !== undefined && <line x1={x(cursorT)} x2={x(cursorT)} y1={M.t} y2={H - M.b + 6} stroke="var(--cr-ink)" strokeWidth={1} />}
            </svg>
            {!anyData && !loading && (
              <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: M.t + STRIP + 16 }}>
                <div className="plate px-4 py-3 max-w-[52ch] text-center text-[14px] leading-5" data-testid="status-recorder-empty">
                  {empty ?? "No relevant posts in this window, so every hour sits at zero."}
                </div>
              </div>
            )}
            {loading && (
              <p role="status" className="absolute left-4 mono text-[11px] text-ink-muted" style={{ top: M.t + STRIP + 24 }}>
                Reading the hourly trace
              </p>
            )}
          </div>
        </div>
        {/* lane labels sit outside the scrolling tape so they never scroll away */}
        {lanes.map((l, i) => (
          <span key={`lbl-${l.hazard}`} className="pointer-events-none absolute left-0 inline-flex items-center gap-1.5 pl-1 pr-1.5 text-[12px] leading-4 font-semibold" style={{ top: compact ? laneTop(i) + 4 : laneTop(i) + STRIP + Math.round(lh / 2) - 8 }}>
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: HAZARD_FALLBACK_COLOR[l.hazard], boxShadow: `0 0 0 3px color-mix(in srgb, ${HAZARD_FALLBACK_COLOR[l.hazard]} 22%, transparent)` }} />
            {l.label}
          </span>
        ))}
      </div>
      <Readout lanes={lanes} idx={idx} word={cursor !== null ? "cursor" : playheadIdx !== null ? "playhead" : "latest"} onKey={onKey} t={cursorT} soFar={inProgress && cursor === null ? hours.length - 1 : undefined} />
    </div>
  );
}

function Readout({ lanes, idx, word, onKey, t, soFar }: { lanes: RecorderLane[]; idx: number; onKey: (e: KeyboardEvent<HTMLDivElement>) => void; t?: number; word: "cursor" | "playhead" | "latest"; soFar?: number }) {
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
      className="border-t border-rule px-3 py-2 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr] items-start text-[12px] leading-5 outline-offset-[-2px]"
      data-testid="readout-recorder"
    >
      <p className="mono text-ink whitespace-nowrap" aria-live="polite">
        {aggregate && <span className="text-ink-muted">All places, </span>}
        <span className="text-ink-muted">{word}</span> {t !== undefined ? utcDateTime(new Date(t).toISOString()) : "no hours yet"}
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
                    {soFar !== undefined && l.timeline?.points[soFar] && (
                      <span className="mono whitespace-nowrap text-ink-muted" data-testid={`readout-sofar-${l.hazard}`}>this hour so far {l.timeline.points[soFar].nRelevant} posts</span>
                    )}
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
              <li key={m.eventId} className="flex items-center gap-1.5 flex-wrap"><span aria-hidden className="inline-block size-2.5 border border-ink" /><span className="mono font-semibold">{markerText(m)}</span> <span className="text-ink-muted">{m.title}, {utcDateTime(m.at)}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Text switch for the recorder window: the chosen span is underlined in ink; a radiogroup operable with arrow keys. */
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
    <div role="radiogroup" aria-label="Recorder window" onKeyDown={onKey} className="inline-flex items-center gap-3 mono text-[12px] leading-none" data-testid="switch-recorder-window">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          tabIndex={o === value ? 0 : -1}
          onClick={() => onChange(o)}
          data-testid={`button-window-${o}`}
          className={cn("h-6 px-0.5 border-b", o === value ? "text-ink border-ink" : "text-ink-muted border-transparent hover:text-ink")}
        >
          {o} h
        </button>
      ))}
    </div>
  );
}

function Key({ kind, hazard = "flood", children }: { kind: "trace" | "base" | "tick" | "stamp"; hazard?: Hazard; children: ReactNode }) {
  const hue = HAZARD_FALLBACK_COLOR[hazard];
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="12" aria-hidden>
        {kind === "trace" && (
          <>
            <circle cx="9" cy="6" r="6" fill={hue} opacity={0.22} />
            <circle cx="9" cy="6" r="2.4" fill={hue} />
          </>
        )}
        {kind === "base" && <line x1="0" x2="18" y1="6" y2="6" stroke="var(--cr-ink-muted)" strokeDasharray="4 3" />}
        {kind === "tick" && <><line x1="4" x2="4" y1="1" y2="11" stroke="var(--cr-ink)" strokeWidth="1.5" /><line x1="4" x2="16" y1="2" y2="2" stroke="var(--cr-ink)" strokeWidth="2" /></>}
        {kind === "stamp" && <rect x="2.5" y="2.5" width="13" height="8" fill="none" stroke="var(--cr-ink)" strokeWidth="1" />}
      </svg>
      {children}
    </span>
  );
}
