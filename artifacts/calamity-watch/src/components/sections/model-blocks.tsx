import type { ModelInfo, PipelineStage } from "@workspace/api-client-react";
import { num, pct, utcDate } from "@/lib/format";
import { PipelineSchematic } from "@/components/instruments/schematic";

export function PipelineList({ stages, asOf }: { stages: PipelineStage[]; asOf?: string }) {
  return <PipelineSchematic stages={stages} asOf={asOf} />;
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
      <div className="min-w-0">
      <table className="hidden sm:table w-full text-[14px] leading-5" data-testid="table-model-summary">
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
      {/* Below 640 px: the label at full width, its named metrics on one mono line underneath. */}
      <div className="sm:hidden text-[14px] leading-5" data-testid="list-model-summary">
        <p className="text-[12px] text-muted-foreground pb-2">
          {s.name}: {s.algorithm.replace(/\.?\s*$/, ".")} Trained {utcDate(s.trainedAt)}, version <span className="num">{m.version}</span>
        </p>
        <ul>
          {rows.map(([a, b, c]) => (
            <li key={a} className="border-t border-line py-2">
              <p>{a}</p>
              <p className="num text-[13px]">{b}, {c}</p>
            </li>
          ))}
        </ul>
      </div>
      </div>
      <dl className="text-[14px] leading-5 space-y-3">
        <div><dt className="text-muted-foreground">Emotion model</dt><dd><a className="underline underline-offset-2" href={m.emotionModel.url} target="_blank" rel="noreferrer" data-testid="link-emotion-model">{m.emotionModel.name}</a>, {m.emotionModel.reportedMetric}</dd></div>
        <div><dt className="text-muted-foreground">Sentiment model</dt><dd><a className="underline underline-offset-2" href={m.sentimentModel.url} target="_blank" rel="noreferrer" data-testid="link-sentiment-model">{m.sentimentModel.name}</a>, {m.sentimentModel.reportedMetric}</dd></div>
        <div><dt className="text-muted-foreground">Places</dt><dd>{m.geoparser.method}, {m.geoparser.gazetteer} (<span className="num">{num(m.geoparser.placesInGazetteer)}</span> places)</dd></div>
        <div><dt className="text-muted-foreground">Alert rule</dt><dd>robust z against a <span className="num">{m.detector.baselineDays}</span>-day baseline; elevated at z <span className="num">{m.detector.thresholds.elevated}</span>, high <span className="num">{m.detector.thresholds.high}</span>, severe <span className="num">{m.detector.thresholds.severe}</span>; at least <span className="num">{m.detector.minRelevantPerHour}</span> relevant posts an hour</dd></div>
      </dl>
    </div>
  );
}
