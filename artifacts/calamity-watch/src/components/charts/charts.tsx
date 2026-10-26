import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EmotionPoint, Timeline } from "@workspace/api-client-react";
import { LEVEL_LABEL, num, shortHour, utcDateTime } from "@/lib/format";

export function Sparkline({ values, color, label, width = 96, height = 24 }: { values: number[]; color: string; label: string; width?: number; height?: number }) {
  if (!values.length) return <span className="text-[12px] text-muted-foreground">no data</span>;
  const max = Math.max(...values, 0.0001);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label={`${label}: hourly fear mass over the last ${values.length} hours, peak ${num(max, 2)}, latest ${num(values[values.length - 1], 2)}`}>
      <line x1="0" x2={width} y1={height - 1} y2={height - 1} stroke="#263247" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

const axis = { fill: "#9DA9BC", fontSize: 11, fontFamily: "Atkinson Hyperlegible Mono, monospace" };

function TipBox({ active, payload, label, rows }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; label?: string; rows: (p: Record<string, unknown>) => [string, string][] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-[4px] border border-line bg-surface-2 px-3 py-2 text-[12px] leading-4">
      <p className="num text-muted-foreground mb-1">{utcDateTime(String(label))}</p>
      {rows(p).map(([k, v]) => (
        <p key={k}>
          {k} <span className="num">{v}</span>
        </p>
      ))}
    </div>
  );
}

/** Fear-mass timeline with official-event ticks and a table alternative. */
export function FearTimeline({ timeline, color, height = 180, compact }: { timeline: Timeline; color: string; height?: number; compact?: boolean }) {
  const [showTable, setShowTable] = useState(false);
  const [allMarkers, setAllMarkers] = useState(false);
  const id = useId();
  const data = timeline.points;
  const hasData = data.some((p) => p.nRelevant > 0);
  // One tick per hour that has an official event, so a busy feed (USGS lists every M4.5+) does not fill the chart.
  const markerHours = useMemo(() => {
    const hours = new Set<string>();
    for (const m of timeline.officialMarkers) {
      const t = +new Date(m.at);
      const nearest = data.reduce((a, p) => (Math.abs(+new Date(p.hour) - t) < Math.abs(+new Date(a) - t) ? p.hour : a), data[0]?.hour ?? "");
      if (nearest) hours.add(nearest);
    }
    return [...hours];
  }, [timeline.officialMarkers, data]);
  const MARKER_LIST = 6;
  const listed = allMarkers ? timeline.officialMarkers : timeline.officialMarkers.slice(-MARKER_LIST);
  const peak = useMemo(() => data.reduce((a, p) => (p.fearMass > a.fearMass ? p : a), data[0] ?? { fearMass: 0, hour: "" }), [data]);
  if (!data.length) return <p className="text-[14px] text-muted-foreground p-4">No hourly data in this window.</p>;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 text-[12px] leading-4 text-muted-foreground">
        <span>
          {timeline.unit}, last {timeline.hours} h, UTC
          {hasData && peak && <> · peak <span className="num text-foreground">{num(peak.fearMass, 2)}</span> at <span className="num">{shortHour(peak.hour)}</span></>}
        </span>
        <span className="inline-flex items-center gap-3">
          {timeline.officialMarkers.length > 0 && (
            <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block w-px h-3 bg-official" /> official event ({timeline.officialMarkers.length})</span>
          )}
          <button type="button" className="underline underline-offset-2 hover:text-foreground" aria-expanded={showTable} aria-controls={id} onClick={() => setShowTable((s) => !s)} data-testid="button-toggle-timeline-table">
            {showTable ? "Show chart" : "Show as table"}
          </button>
        </span>
      </div>
      {!hasData && <p className="px-1 pt-1 text-[12px] text-muted-foreground">No relevant posts in this window, so the line sits at zero.</p>}
      {showTable ? (
        <div id={id} className="max-h-[260px] overflow-auto mt-2 border-t border-line">
          <table className="w-full text-[12px] leading-4">
            <thead className="text-muted-foreground sticky top-0 bg-surface">
              <tr>
                <th className="text-left font-medium py-1 pr-2">Hour (UTC)</th>
                <th className="text-right font-medium py-1 px-2">Fear mass</th>
                <th className="text-right font-medium py-1 px-2">Baseline</th>
                <th className="text-right font-medium py-1 px-2">Relevant</th>
                <th className="text-right font-medium py-1 px-2">z</th>
                <th className="text-left font-medium py-1 pl-2">Level</th>
              </tr>
            </thead>
            <tbody className="num">
              {[...data].reverse().map((p) => (
                <tr key={p.hour} className="border-t border-line/60">
                  <td className="py-1 pr-2">{shortHour(p.hour)}</td>
                  <td className="text-right px-2">{num(p.fearMass, 2)}</td>
                  <td className="text-right px-2">{p.baselineMedian == null ? "n/a" : num(p.baselineMedian, 2)}</td>
                  <td className="text-right px-2">{p.nRelevant}</td>
                  <td className="text-right px-2">{p.zScore == null ? "n/a" : num(p.zScore, 1)}</td>
                  <td className="pl-2 font-sans">{LEVEL_LABEL[p.level]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div id={id} style={{ height }} className="mt-1" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: compact ? -24 : -8, bottom: 0 }}>
              <CartesianGrid stroke="#263247" vertical={false} />
              <XAxis dataKey="hour" tick={axis} tickFormatter={shortHour} minTickGap={48} stroke="#263247" />
              <YAxis tick={axis} stroke="#263247" width={44} allowDecimals />
              <Tooltip
                cursor={{ stroke: "#9DA9BC", strokeDasharray: "2 2" }}
                content={<TipBox rows={(p) => [["fear mass", num(p.fearMass as number, 2)], ["relevant posts", String(p.nRelevant)], ["baseline", p.baselineMedian == null ? "n/a" : num(p.baselineMedian as number, 2)], ["z", p.zScore == null ? "n/a" : num(p.zScore as number, 1)]]} />}
              />
              {markerHours.map((h) => (
                <ReferenceLine key={h} x={h} stroke="#5EEAD4" strokeDasharray="3 3" strokeOpacity={0.7} />
              ))}
              <Area type="monotone" dataKey="fearMass" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.6} isAnimationActive={false} />
              <Area type="monotone" dataKey="baselineMedian" stroke="#9DA9BC" strokeDasharray="4 3" fill="none" strokeWidth={1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {timeline.officialMarkers.length > 0 && !compact && (
        <div className="mt-2 px-1 text-[12px] leading-4 text-muted-foreground">
          <ul className="space-y-0.5">
            {listed.map((m) => (
              <li key={`${m.eventId}-${m.at}`}>
                <span className="num">{utcDateTime(m.at)}</span> <span className="text-official">{m.feedLabel}</span> {m.title} ({m.severity})
              </li>
            ))}
          </ul>
          {timeline.officialMarkers.length > MARKER_LIST && (
            <button type="button" className="mt-1 underline underline-offset-2 hover:text-foreground" onClick={() => setAllMarkers((v) => !v)} data-testid="button-toggle-markers">
              {allMarkers ? `Show the latest ${MARKER_LIST} only` : `Show all ${timeline.officialMarkers.length} official events in this window`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const EMO: { key: keyof EmotionPoint; label: string; color: string }[] = [
  { key: "fear", label: "Fear", color: "#FF5C7A" },
  { key: "anger", label: "Anger", color: "#FF8A3D" },
  { key: "sadness", label: "Sadness", color: "#7FB8FF" },
  { key: "optimism", label: "Optimism", color: "#5EEAD4" },
  { key: "other", label: "Other", color: "#8A97AB" },
];

export function EmotionMix({ points }: { points: EmotionPoint[] }) {
  const [table, setTable] = useState(false);
  const withData = points.filter((p) => p.nRelevant > 0);
  if (!withData.length) return <p className="p-4 text-[14px] text-muted-foreground">No relevant posts in the last 72 hours, so there is no emotion mix to show.</p>;
  return (
    <div className="px-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] leading-4 text-muted-foreground">
        <span className="flex flex-wrap gap-3">
          {EMO.map((e) => (
            <span key={e.key} className="inline-flex items-center gap-1"><span aria-hidden className="inline-block w-3 h-0.5" style={{ background: e.color }} />{e.label}</span>
          ))}
        </span>
        <button type="button" className="underline underline-offset-2" onClick={() => setTable((t) => !t)} data-testid="button-toggle-emotion-table">{table ? "Show chart" : "Show as table"}</button>
      </div>
      <p className="text-[12px] leading-4 text-muted-foreground mt-1">Mean probability per hour over relevant posts (0 to 1), UTC. Hours with no relevant posts are omitted.</p>
      {table ? (
        <div className="max-h-[240px] overflow-auto mt-2">
          <table className="w-full text-[12px] leading-4 num">
            <thead className="text-muted-foreground font-sans"><tr><th className="text-left font-medium py-1">Hour</th>{EMO.map((e) => <th key={e.key} className="text-right font-medium">{e.label}</th>)}<th className="text-right font-medium">n</th></tr></thead>
            <tbody>
              {[...withData].reverse().map((p) => (
                <tr key={p.hour} className="border-t border-line/60"><td className="py-1">{shortHour(p.hour)}</td>{EMO.map((e) => <td key={e.key} className="text-right">{(p[e.key] as number).toFixed(2)}</td>)}<td className="text-right">{p.nRelevant}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[180px] mt-2" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={withData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#263247" vertical={false} />
              <XAxis dataKey="hour" tick={axis} tickFormatter={shortHour} minTickGap={48} stroke="#263247" />
              <YAxis tick={axis} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => v.toFixed(2)} stroke="#263247" width={44} />
              <Tooltip content={<TipBox rows={(p) => EMO.map((e) => [e.label, (p[e.key] as number).toFixed(2)] as [string, string])} />} />
              {EMO.map((e) => <Line key={e.key} dataKey={e.key} stroke={e.color} dot={false} strokeWidth={1.4} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
