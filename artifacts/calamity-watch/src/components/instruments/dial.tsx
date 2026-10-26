import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { prob } from "@/lib/format";

const CX = 110;
const CY = 104;
const R = 86;

function pt(v: number, r: number) {
  const a = Math.PI * (1 - v);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
}

/** A 180-degree needle gauge with a printed 0 to 1 scale. The value is always printed beside it. */
export function Dial({ label, value, pen = false, testId }: { label: string; value: number | null; pen?: boolean; testId?: string }) {
  const reduce = useReducedMotion() || (typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce");
  const spring = useSpring(0, { stiffness: 170, damping: 18 });
  const rotate = useTransform(spring, (v) => v * 180 - 90);
  useEffect(() => {
    const v = Math.max(0, Math.min(1, value ?? 0));
    if (reduce) spring.jump(v);
    else spring.set(v);
  }, [value, reduce, spring]);

  const ticks = Array.from({ length: 21 }, (_, i) => i / 20);
  const [ax, ay] = pt(0, R);
  const [bx, by] = pt(1, R);
  const [hx, hy] = pt(0.5, R);
  const [ex, ey] = pt(1, R);
  const needle = pen ? "#C8102E" : "#15140F";
  return (
    <figure className="relative w-[220px]" data-testid={testId}>
      <div className="relative w-[220px] h-[120px]">
        <svg width="220" height="120" viewBox="0 0 220 120" aria-hidden className="absolute inset-0">
          <path d={`M${ax} ${ay} A${R} ${R} 0 0 1 ${bx} ${by}`} fill="none" stroke="#15140F" strokeWidth={1.25} />
          {pen && <path d={`M${hx} ${hy} A${R} ${R} 0 0 1 ${ex} ${ey}`} fill="none" stroke="#C8102E" strokeWidth={3} />}
          {ticks.map((t) => {
            const major = Math.round(t * 20) % 5 === 0;
            const [x1, y1] = pt(t, R);
            const [x2, y2] = pt(t, R - (major ? 10 : 5));
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#15140F" strokeWidth={major ? 1.25 : 0.75} />;
          })}
          {[0, 0.5, 1].map((t) => {
            const [x, y] = pt(t, R - 22);
            return (
              <text key={t} x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#5B5A54" fontFamily="Martian Mono, monospace">
                {t === 0 ? "0" : t === 1 ? "1" : ".5"}
              </text>
            );
          })}
          <line x1={10} x2={210} y1={CY + 0.5} y2={CY + 0.5} stroke="#DAD7CE" />
        </svg>
        <motion.div
          aria-hidden
          className="absolute w-[2px] origin-bottom"
          style={{ left: CX - 1, top: CY - (R - 6), height: R - 6, background: value == null ? "#B9B5A9" : needle, rotate }}
        />
        <span aria-hidden className="absolute size-3 rounded-full bg-ink" style={{ left: CX - 6, top: CY - 6 }} />
      </div>
      <figcaption className="mt-1 flex items-baseline justify-between px-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <span className={`mono text-[22px] leading-7 ${pen ? "text-pen" : "text-ink"}`} data-testid={testId ? `${testId}-value` : undefined}>
          {value == null ? "—" : prob(value)}
        </span>
      </figcaption>
    </figure>
  );
}
