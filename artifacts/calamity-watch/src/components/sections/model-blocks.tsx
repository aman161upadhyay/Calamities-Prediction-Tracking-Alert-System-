import type { ModelInfo, PipelineStage } from "@workspace/api-client-react";
import { num, pct, utcDate } from "@/lib/format";

export function PipelineList({ stages, asOf }: { stages: PipelineStage[]; asOf?: string }) {
  if (!stages.length) return <p className="text-muted-foreground text-[14px]">The pipeline has not reported any stages yet.</p>;
  return (
    <div>
      <ol className="grid gap-px bg-line border border-line md:grid-cols-2 xl:grid-cols-3" data-testid="list-pipeline">
        {stages.map((s, i) => (
          <li key={s.key} className="bg-surface p-4">
            <p className="text-[12px] leading-4 text-muted-foreground">Stage {i + 1}</p>
            <p className="font-bold">{s.label}</p>
            <p className="mt-1 text-[14px] leading-5 text-muted-foreground max-w-[48ch]">{s.description}</p>
            <p className="mt-2 text-[14px]" data-testid={`text-pipeline-${s.key}`}>
              <span className="num text-[20px] leading-7">{num(s.countLast24h)}</span> <span className="text-muted-foreground">{s.unit} in the last 24 h</span>
            </p>
          </li>
        ))}
      </ol>
      {asOf && <p className="mt-2 text-[12px] text-muted-foreground">Counts as of <span className="num">{asOf}</span>.</p>}
    </div>
  );
}

export function ModelSummary({ m }: { m: ModelInfo }) {
  const s = m.stageOne;
  const rows: [string, string, string][] = [
    ["Hazard type, held-out test", `accuracy ${pct(s.accuracy)}`, `macro F1 ${num(s.macroF1, 3)}`],
    ["Relevance, held-out test", `accuracy ${pct(s.relevanceAccuracy)}`, `F1 ${num(s.relevanceF1, 3)}`],
    ...s.crossDataset.map((c) => [`Cross-dataset: ${c.dataset} (${num(c.rows)} rows)`, `accuracy ${pct(c.accuracy)}`, `F1 ${num(c.f1, 3)}`] as [string, string, string]),
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <table className="w-full text-[14px] leading-5" data-testid="table-model-summary">
        <caption className="text-left text-[12px] text-muted-foreground pb-2">
          {s.name}: {s.algorithm.replace(/\.?\s*$/, ".")} Trained {utcDate(s.trainedAt)}, version <span className="num">{m.version}</span>
        </caption>
        <tbody>
          {rows.map(([a, b, c]) => (
            <tr key={a} className="border-t border-line">
              <th scope="row" className="text-left font-normal py-2 pr-3">{a}</th>
              <td className="num text-right py-2 px-2 whitespace-nowrap">{b}</td>
              <td className="num text-right py-2 pl-2 whitespace-nowrap">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="text-[14px] leading-5 space-y-3">
        <div><dt className="text-muted-foreground">Emotion model</dt><dd><a className="underline underline-offset-2" href={m.emotionModel.url} target="_blank" rel="noreferrer" data-testid="link-emotion-model">{m.emotionModel.name}</a>, {m.emotionModel.reportedMetric}</dd></div>
        <div><dt className="text-muted-foreground">Sentiment model</dt><dd><a className="underline underline-offset-2" href={m.sentimentModel.url} target="_blank" rel="noreferrer" data-testid="link-sentiment-model">{m.sentimentModel.name}</a>, {m.sentimentModel.reportedMetric}</dd></div>
        <div><dt className="text-muted-foreground">Places</dt><dd>{m.geoparser.method}, {m.geoparser.gazetteer} (<span className="num">{num(m.geoparser.placesInGazetteer)}</span> places)</dd></div>
        <div><dt className="text-muted-foreground">Alert rule</dt><dd>robust z against a <span className="num">{m.detector.baselineDays}</span>-day baseline; elevated at z <span className="num">{m.detector.thresholds.elevated}</span>, high <span className="num">{m.detector.thresholds.high}</span>, severe <span className="num">{m.detector.thresholds.severe}</span>; at least <span className="num">{m.detector.minRelevantPerHour}</span> relevant posts an hour</dd></div>
      </dl>
    </div>
  );
}
