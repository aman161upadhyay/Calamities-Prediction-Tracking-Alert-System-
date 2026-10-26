import { useEffect, useRef, useState } from "react";
import type { PipelineStage } from "@workspace/api-client-react";
import { num } from "@/lib/format";

/** The six real pipeline stages joined by a line. One dot travels it once per entry into view; counts never animate. */
export function PipelineSchematic({ stages, asOf }: { stages: PipelineStage[]; asOf?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let inView = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !inView) setRun((r) => r + 1);
      inView = e.isIntersecting;
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!stages.length) return <p className="text-ink-muted text-[14px]">The pipeline has not reported any stages yet.</p>;
  return (
    <div ref={ref}>
      <div className="relative">
        <div aria-hidden className="hidden lg:block absolute left-0 right-0 top-[22px] h-px bg-ink" />
        <div aria-hidden className="hidden lg:block absolute left-0 right-0 top-[18px] h-[9px] overflow-hidden">
          <div key={run} className={run > 0 ? "pipeline-pulse w-full h-full relative" : "w-full h-full relative"}>
            <span className="absolute right-0 top-0 size-[9px] rounded-full bg-pen" />
          </div>
        </div>
        <ol className="relative grid gap-6 lg:gap-4" style={{ gridTemplateColumns: undefined }} data-testid="list-pipeline">
          <style>{`@media (min-width:1024px){[data-testid=list-pipeline]{grid-template-columns:repeat(${stages.length},minmax(0,1fr))}}`}</style>
          {stages.map((s, i) => (
            <li key={s.key} className="relative grid grid-cols-[28px_1fr] lg:grid-cols-1 gap-x-3">
              <span aria-hidden className="relative z-10 mt-[15px] lg:mt-[15px] size-[15px] border-[1.5px] border-ink bg-paper flex items-center justify-center">
                <span className="mono text-[8px] leading-none">{i + 1}</span>
              </span>
              <div className="lg:mt-4 bg-sheet border border-rule-strong p-3 lg:min-h-[208px] flex flex-col">
                <p className="h3-station text-[18px] leading-6">{s.label}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">{s.description}</p>
                <p className="mt-auto pt-3 border-t border-rule" data-testid={`text-pipeline-${s.key}`}>
                  <span className="mono text-[22px] leading-7 block">{num(s.countLast24h)}</span>
                  <span className="text-[12px] text-ink-muted">{s.unit}, last 24 h</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {asOf && <p className="mt-3 text-[12px] text-ink-muted">Counts from the live pipeline as of <span className="mono">{asOf}</span>, not estimates.</p>}
    </div>
  );
}
