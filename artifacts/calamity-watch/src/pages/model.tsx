import { useRef, useState } from "react";
import { useGetModelInfo, useListModelExamples, getGetModelInfoQueryKey, type ClassMetric, type ConfusionMatrix } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { ErrorState, LoadingRows, btn } from "@/components/kit";
import { Plate } from "@/components/instruments/plate";
import { Part } from "@/components/evidence/parts";
import { ClassifierDemo } from "@/components/sections/classifier";
import { num, pct, utcDate } from "@/lib/format";
import { useTitle } from "./home";

type TrainingSummary = { train_rows?: number; train_relevant?: number; train_events?: string[]; test_split_rows?: number; unseen_event_rows?: number; unseen_events?: string[]; negatives_train?: number; negatives_test?: number; kaggle_rows?: number };
type UnseenDetail = { perClass?: ClassMetric[]; confusion?: ConfusionMatrix };

const th = "text-left font-normal text-[12px] text-ink-muted py-2 px-3";
const eventName = (e: string) => e.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase());

export default function ModelPage() {
  useTitle("Model");
  const q = useGetModelInfo({ query: { queryKey: getGetModelInfoQueryKey() } });
  const examples = useListModelExamples();
  const [seed, setSeed] = useState<{ text: string; n: number } | null>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const m = q.data;
  const extra = m?.stageOne as unknown as { trainingSummary?: TrainingSummary; unseenEventsDetail?: UnseenDetail } | undefined;
  const ts = extra?.trainingSummary;
  const unseen = extra?.unseenEventsDetail;
  const hazardRows = m ? m.stageOne.perClass.reduce((a, c) => a + c.support, 0) : 0;
  const testSet = m?.stageOne.datasets.find((d) => d.role === "test");

  const load = (text: string) => {
    setSeed((s) => ({ text, n: (s?.n ?? 0) + 1 }));
    benchRef.current?.scrollIntoView({ block: "start", behavior: document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <Page wide>
      <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end mb-10">
        <h1 className="display h1-station">Calibration certificate</h1>
        <p className="text-ink-muted max-w-[56ch]">What scores each post, what it learned from, how it does on data it never trained on, and where it fails. Every figure below is read from the API as the running service reports it.</p>
      </header>

      {q.isLoading && <div className="bg-sheet border border-rule-strong"><LoadingRows rows={8} label="Reading the certificate" /></div>}
      {q.isError && <div className="bg-sheet border border-rule-strong"><ErrorState what="model information" onRetry={() => q.refetch()} /></div>}

      {m && (
        <>
          <section className="relative bg-sheet border-2 border-ink" aria-labelledby="cert-h" data-testid="plate-version">
            <div className="flex items-center justify-between px-4 h-9 border-b border-ink">
              <p id="cert-h" className="plate-label">Certificate / hazard classifier / {m.stageOne.name}</p>
              <p className="plate-label text-ink-muted hidden sm:block">Issued {utcDate(m.stageOne.trainedAt)}</p>
            </div>
            <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-rule-strong">
                <p className="text-[12px] text-ink-muted">Version</p>
                <p className="mono text-[22px] md:text-[28px] leading-tight break-all" data-testid="text-model-version">{m.version}</p>
                <p className="mt-3 text-[14px] leading-5">{m.stageOne.algorithm.replace(/\.?\s*$/, ".")}</p>
                <p className="mt-3 text-[13px]" data-testid="status-model-ready">{m.modelReady ? <>Service <span className="font-semibold">loaded</span> and scoring.</> : <span className="font-semibold">The model service is still loading; figures are from the last training run.</span>}</p>
              </div>
              <dl className="grid grid-cols-2 gap-px bg-rule">
                <Fig label="Hazard type, accuracy" v={pct(m.stageOne.accuracy)} testId="text-accuracy" />
                <Fig label="Hazard type, macro F1" v={num(m.stageOne.macroF1, 3)} testId="text-macro-f1" />
                <Fig label="Relevance, accuracy" v={pct(m.stageOne.relevanceAccuracy)} testId="text-relevance-accuracy" />
                <Fig label="Relevance, F1" v={num(m.stageOne.relevanceF1, 3)} testId="text-relevance-f1" />
              </dl>
            </div>
            <p className="px-4 md:px-6 py-3 border-t border-rule-strong text-[12px] leading-5 text-ink-muted max-w-[110ch]" data-testid="text-metrics-population">
              Held-out test split of the training events. Hazard-type figures are scored on the <span className="mono text-ink">{num(hazardRows)}</span> rows in the per-class table below (relevant posts plus generic tweets labelled none); relevance figures are scored on all rows{testSet ? <> of the split, <span className="mono text-ink">{num(testSet.rows)}</span></> : null}.
            </p>
          </section>

          <Part id="datasets" title="What it learned from" note="Datasets, their role and their licence. Rows as each dataset was loaded.">
            <div className="bg-sheet border border-rule-strong overflow-x-auto">
              <table className="w-full text-[14px] leading-5" data-testid="table-datasets">
                <thead className="border-b border-rule-strong"><tr><th className={th}>Dataset</th><th className={`${th} hidden md:table-cell`}>Role</th><th className={`${th} hidden md:table-cell`}>Licence</th><th className={`${th} text-right hidden md:table-cell`}>Rows</th></tr></thead>
                <tbody className="divide-y divide-rule">{m.stageOne.datasets.map((d) => (
                  <tr key={d.name} className="align-top"><td className="py-2.5 px-3"><a href={d.url} target="_blank" rel="noreferrer" className="ink-link">{d.name}</a><span className="md:hidden block text-[12px] text-ink-muted">{d.license}</span><span className="md:hidden block mono text-[12px] text-ink tabular-nums">{d.role} · {num(d.rows)} rows</span></td><td className="px-3 py-2.5 mono text-[12px] hidden md:table-cell">{d.role}</td><td className="px-3 py-2.5 text-[13px] text-ink-muted hidden md:table-cell">{d.license}</td><td className="px-3 py-2.5 text-right mono text-[13px] hidden md:table-cell">{num(d.rows)}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {ts?.train_events && (
              <p className="mt-3 text-[13px] leading-5 text-ink-muted max-w-[110ch]">
                Trained on <span className="mono text-ink">{ts.train_events.length}</span> events: {ts.train_events.map(eventName).join(", ")}.
                {ts.unseen_events && <> Held out of training: {ts.unseen_events.map(eventName).join(", ")}.</>}
              </p>
            )}
          </Part>

          <Part id="perclass" title="Per class and confusion" note="Held-out test split. Rows of the grid are true labels, columns predictions; shade is the row share, the diagonal is boxed.">
            <div className="grid gap-8 xl:grid-cols-2 items-start">
              <PerClass rows={m.stageOne.perClass} testId="table-per-class" />
              <Confusion c={m.stageOne.confusion} testId="table-confusion" label={["Confusion", "test split", "counts"]} />
            </div>
          </Part>

          <Part id="cross" title="On data it did not train on" note="Expect lower figures than the test split.">
            <div className="border-l-2 border-ink pl-4 mb-6 max-w-[80ch] text-[15px] leading-6" data-testid="text-selection-set">
              <p>The shipped candidate was chosen by macro F1 on the five held-out replay events, so those events are a <span className="font-semibold">selection set, not a blind test</span>. The Kaggle set played no part in training or selection.</p>
              <p className="mt-2 text-[13px] text-ink-muted">Hazard-type metrics are computed on relevant posts only and relevance metrics on all rows, so each line reports the rows actually scored.</p>
            </div>
            <div className="bg-sheet border border-rule-strong">
              <Plate label={["Cross-dataset", "rows scored"]} className="border-0">
                <ul className="divide-y divide-rule" data-testid="table-cross-dataset">
                  {m.stageOne.crossDataset.map((c, i) => (
                    <li key={c.dataset} className="grid gap-x-6 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,1fr)_110px_90px_80px] items-baseline" data-testid={`row-cross-${i}`}>
                      <span className="text-[14px] leading-5">{c.dataset}</span>
                      <span className="mono text-[13px]"><span className="text-ink-muted md:hidden">rows </span>{num(c.rows)}<span className="text-ink-muted hidden md:inline"> rows</span></span>
                      <span className="mono text-[13px]"><span className="text-ink-muted">acc </span>{pct(c.accuracy)}</span>
                      <span className="mono text-[13px]"><span className="text-ink-muted">F1 </span>{num(c.f1, 3)}</span>
                    </li>
                  ))}
                </ul>
              </Plate>
            </div>
            {unseen?.perClass && unseen.confusion && (
              <div className="mt-8 grid gap-8 xl:grid-cols-2 items-start">
                <div>
                  <PerClass rows={unseen.perClass} testId="table-unseen-per-class" label={["Per class", "held-out events"]} />
                  {(() => {
                    const c = unseen.confusion!;
                    const ni = c.labels.indexOf("none");
                    if (ni < 0) return null;
                    const predictedNone = c.matrix.reduce((a, row) => a + (row[ni] ?? 0), 0);
                    return <p className="mt-2 text-[12px] leading-5 text-ink-muted" data-testid="text-unseen-none">none has no true rows in the held-out events; the <span className="mono text-ink">{num(predictedNone)}</span> posts predicted none there are misses.</p>;
                  })()}
                </div>
                <Confusion c={unseen.confusion} testId="table-unseen-confusion" label={["Confusion", "held-out events", "counts"]} />
              </div>
            )}
            {m.stageOne.candidates && m.stageOne.candidates.length > 0 && (
              <div className="mt-8 bg-sheet border border-rule-strong overflow-x-auto">
                <Plate label={["Candidates compared"]} className="border-0">
                  <table className="w-full text-[14px] min-w-[520px]" data-testid="table-candidates">
                    <thead className="border-b border-rule-strong"><tr><th className={th}>Model</th><th className={`${th} text-right`}>Accuracy</th><th className={`${th} text-right`}>Macro F1</th><th className={th}>Shipped</th></tr></thead>
                    <tbody className="divide-y divide-rule">{m.stageOne.candidates.map((c) => (
                      <tr key={c.name} className="align-top"><td className="py-2.5 px-3">{c.name}{c.note && <span className="block text-[12px] text-ink-muted">{c.note}</span>}</td><td className="px-3 py-2.5 text-right mono text-[13px]">{pct(c.accuracy)}</td><td className="px-3 py-2.5 text-right mono text-[13px]">{num(c.macroF1, 3)}</td><td className="px-3 py-2.5">{c.shipped ? <span className="font-semibold">Shipped</span> : <span className="text-ink-muted">No</span>}</td></tr>
                    ))}</tbody>
                  </table>
                </Plate>
              </div>
            )}
          </Part>

          <Part id="parts" title="The other parts" note="Pretrained models are used as published; their figures are the model cards' own.">
            <div className="grid gap-6 lg:grid-cols-2">
              {[m.emotionModel, m.sentimentModel].map((p, i) => (
                <Plate key={p.name} label={[i === 0 ? "Emotion" : "Sentiment", "pretrained"]} testId={`plate-${i === 0 ? "emotion" : "sentiment"}`}>
                  <div className="p-4 text-[14px] leading-5">
                    <p className="font-semibold"><a href={p.url} target="_blank" rel="noreferrer" className="ink-link break-all">{p.name}</a></p>
                    <p className="mt-1 text-ink-muted">{p.task}</p>
                    <p className="mt-2">{p.reportedMetric}</p>
                    <p className="mt-2 mono text-[12px] text-ink-muted break-words">{p.labels.join(" · ")}</p>
                  </div>
                </Plate>
              ))}
              <Plate label={["Geoparser"]} testId="plate-geoparser">
                <dl className="p-4 grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[14px] leading-5">
                  <dt className="text-ink-muted">Method</dt><dd>{m.geoparser.method}</dd>
                  <dt className="text-ink-muted">Gazetteer</dt><dd>{m.geoparser.gazetteer}</dd>
                  <dt className="text-ink-muted">Places</dt><dd className="mono">{num(m.geoparser.placesInGazetteer)}</dd>
                </dl>
              </Plate>
              <Plate label={["Detector", "settings"]} testId="plate-detector">
                <dl className="p-4 grid grid-cols-[150px_minmax(0,1fr)] gap-y-2 text-[14px] leading-5">
                  <dt className="text-ink-muted">Baseline</dt><dd><span className="mono">{m.detector.baselineDays}</span> days, per place</dd>
                  <dt className="text-ink-muted">Minimum posts</dt><dd><span className="mono">{m.detector.minRelevantPerHour}</span> relevant per hour</dd>
                  <dt className="text-ink-muted">Robust z</dt><dd className="mono text-[13px]">elevated {m.detector.thresholds.elevated} · high {m.detector.thresholds.high} · severe {m.detector.thresholds.severe}</dd>
                  <dt className="text-ink-muted">Open, close</dt><dd>after <span className="mono">{m.detector.openAfterHours} h</span> above, <span className="mono">{m.detector.closeAfterHours} h</span> below</dd>
                  <dt className="text-ink-muted">Corroboration</dt><dd>within <span className="mono">{m.detector.corroborationRadiusKm} km</span>, from <span className="mono">{m.detector.corroborationLookbackHours} h</span> before opening to <span className="mono">{m.detector.corroborationWindowHours} h</span> after; a record with no end counts as active for <span className="mono">{m.detector.corroborationActiveHours} h</span></dd>
                </dl>
              </Plate>
            </div>
          </Part>

          <Part id="limits" title="Where it fails" note="Written plainly, as the service states them.">
            <ol className="grid gap-x-10 md:grid-cols-2 border-t border-rule-strong" data-testid="list-limitations">
              {m.limitations.map((l, i) => (
                <li key={i} className="grid grid-cols-[36px_minmax(0,1fr)] py-3 border-b border-rule text-[15px] leading-6">
                  <span className="mono text-[12px] text-ink-muted pt-1">{String(i + 1).padStart(2, "0")}</span>
                  <span>{l}</span>
                </li>
              ))}
            </ol>
          </Part>
        </>
      )}

      <Part id="examples" title="Examples" note="Each has a note on what it tests. Load one into the bench below.">
        {examples.isLoading && <div className="bg-sheet border border-rule-strong"><LoadingRows rows={4} label="Reading examples" /></div>}
        {examples.isError && <div className="bg-sheet border border-rule-strong"><ErrorState what="the examples" onRetry={() => examples.refetch()} /></div>}
        {examples.data && (
          <ol className="bg-sheet border border-rule-strong divide-y divide-rule" data-testid="list-examples">
            {examples.data.map((ex, i) => (
              <li key={i} className="grid gap-3 px-4 py-3 md:grid-cols-[36px_minmax(0,1fr)_auto] items-start">
                <span className="mono text-[12px] text-ink-muted pt-0.5 hidden md:block">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-[15px] leading-6 break-words">"{ex.text}"</p>
                  <p className="text-[12px] text-ink-muted mt-0.5">{ex.note}</p>
                </div>
                <button type="button" className={btn} onClick={() => load(ex.text)} data-testid={`button-load-example-${i}`}>Load into the bench</button>
              </li>
            ))}
          </ol>
        )}
      </Part>

      <div ref={benchRef} className="scroll-mt-24">
        <Part id="bench" title="The bench" note="The same models that score the live feed. Nothing you type is stored.">
          <Plate label={["Test bench", "relevance", "fear"]} testId="plate-bench">
            <div className="p-4 md:p-6"><ClassifierDemo seed={seed} showExamples={false} /></div>
          </Plate>
        </Part>
      </div>
    </Page>
  );
}

function Fig({ label, v, testId }: { label: string; v: string; testId: string }) {
  return (
    <div className="bg-sheet px-5 py-4">
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mono text-[26px] md:text-[32px] leading-tight mt-1" data-testid={testId}>{v}</dd>
    </div>
  );
}

function PerClass({ rows, testId, label = ["Per class", "test split"] }: { rows: ClassMetric[]; testId: string; label?: string[] }) {
  return (
    <Plate label={label}>
      <table className="w-full text-[14px] tabular-nums" data-testid={testId}>
        <thead className="border-b border-rule-strong"><tr><th className={`${th} !px-2 md:!px-3`}>Class</th><th className={`${th} text-right !px-1.5 md:!px-3`}><span className="md:hidden">P</span><span className="hidden md:inline">Precision</span></th><th className={`${th} text-right !px-1.5 md:!px-3`}><span className="md:hidden">R</span><span className="hidden md:inline">Recall</span></th><th className={`${th} text-right !px-1.5 md:!px-3`}>F1</th><th className={`${th} text-right !px-2 md:!px-3`}><span className="md:hidden mono text-[11px]">n</span><span className="hidden md:inline">Support</span></th></tr></thead>
        <tbody className="divide-y divide-rule mono text-[11px] md:text-[13px]">
          {rows.map((c) => (
            <tr key={c.label}><td className="py-2 px-2 md:px-3 font-sans text-[13px] md:text-[14px]">{c.label}</td><td className="text-right px-1.5 md:px-3">{num(c.precision, 3)}</td><td className="text-right px-1.5 md:px-3">{num(c.recall, 3)}</td><td className="text-right px-1.5 md:px-3">{num(c.f1, 3)}</td><td className="text-right px-2 md:px-3">{num(c.support)}</td></tr>
          ))}
        </tbody>
      </table>
    </Plate>
  );
}

function Confusion({ c, testId, label }: { c: ConfusionMatrix; testId: string; label: string[] }) {
  return (
    <Plate label={label}>
      <div className="p-4 overflow-x-auto">
        <table className="mono text-[12px] border-collapse" data-testid={testId}>
          <thead>
            <tr><th className="p-1.5 text-left font-normal text-[10px] text-ink-muted">true ↓ pred →</th>{c.labels.map((l) => <th key={l} scope="col" className="p-1.5 font-normal text-ink-muted text-right">{l}</th>)}</tr>
          </thead>
          <tbody>
            {c.matrix.map((row, i) => {
              const total = row.reduce((a, b) => a + b, 0);
              return (
                <tr key={i}>
                  <th scope="row" className="p-1.5 pr-3 text-left font-normal text-ink-muted">{c.labels[i]}</th>
                  {row.map((v, j) => {
                    const share = total > 0 ? v / total : 0;
                    return (
                      <td key={j} className="p-0 border border-rule">
                        <span className={`block min-w-[64px] px-2 py-2 text-right ${i === j ? "outline outline-[1.5px] -outline-offset-[3px] outline-ink" : ""}`} style={{ background: `rgba(21,20,15,${(share * 0.55).toFixed(3)})`, color: share > 0.45 ? "#F3F2EE" : "#15140F" }}>
                          {num(v)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Plate>
  );
}
