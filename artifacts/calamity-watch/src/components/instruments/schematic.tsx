import type { PipelineStage } from "@workspace/api-client-react";
import { num } from "@/lib/format";

/**
 * The pipeline stages as a ruled table: one row per stage, in order, with its count for the last 24 hours. The order
 * is the data flow, so the rows need no numbers, arrows or rails. Counts never animate.
 */
export function PipelineSchematic({ stages, asOf }: { stages: PipelineStage[]; asOf?: string }) {
  if (!stages.length) return <p className="text-ink-muted text-[14px]">The pipeline has not reported any stages yet.</p>;
  return (
    <div>
      <table className="w-full text-[14px] leading-5 border-t border-rule-strong" data-testid="list-pipeline">
        <thead className="sr-only">
          <tr>
            <th scope="col">Stage</th>
            <th scope="col">What it does</th>
            <th scope="col">Last 24 hours</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.key} className="border-b border-rule align-baseline">
              <th scope="row" className="text-left font-semibold py-3 pr-4 w-[1%] whitespace-nowrap">{s.label}</th>
              <td className="py-3 pr-6 text-ink-muted">{s.description}</td>
              <td className="py-3 text-right whitespace-nowrap" data-testid={`text-pipeline-${s.key}`}>
                <span className="mono text-[16px] text-ink">{num(s.countLast24h)}</span>
                <span className="ml-2 text-[12px] text-ink-muted hidden sm:inline">{s.unit}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {asOf && <p className="mt-3 text-[12px] text-ink-muted">Counts from the live pipeline as of <span className="mono">{asOf}</span>, not estimates; the column is the last 24 hours.</p>}
    </div>
  );
}
