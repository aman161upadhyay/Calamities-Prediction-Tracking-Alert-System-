import { useGetModelInfo, useGetSystemStatus } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { ErrorState, LoadingRows, PageTitle, Panel } from "@/components/kit";
import { PipelineList } from "@/components/sections/model-blocks";
import { ClassifierDemo } from "@/components/sections/classifier";
import { num, pct, utcDate, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";

const th = "text-left font-medium text-[12px] text-muted-foreground py-1";

export default function ModelPage() {
  useTitle("Model");
  const q = useGetModelInfo();
  const status = useGetSystemStatus();
  const m = q.data;
  return (
    <Page>
      <PageTitle sub="What scores each post, what it was trained on, how well it does on data it has not seen, and where it fails.">Model</PageTitle>
      {q.isLoading && <LoadingRows rows={8} />}
      {q.isError && <ErrorState what="model information" onRetry={() => q.refetch()} />}
      {m && (
        <div className="grid gap-8">
          {!m.modelReady && <p style={{ color: "#E8B04B" }}>The model service is still loading. Metrics below are from the last training run.</p>}
          <section>
            <h2 className="text-[20px] leading-7 mb-3">Pipeline</h2>
            {status.data ? <PipelineList stages={status.data.pipeline} asOf={utcDateTime(status.data.now)} /> : status.isError ? <ErrorState what="pipeline counts" onRetry={() => status.refetch()} /> : <LoadingRows rows={2} />}
          </section>

          <section>
            <h2 className="text-[20px] leading-7">Hazard classifier</h2>
            <p className="text-muted-foreground mt-1">{m.stageOne.algorithm.replace(/\.?\s*$/, ".")} Trained {utcDate(m.stageOne.trainedAt)}, version <span className="num">{m.version}</span>.</p>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
              <div><dt className="text-[12px] text-muted-foreground">Hazard-type accuracy</dt><dd className="num text-[20px]">{pct(m.stageOne.accuracy)}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Macro F1</dt><dd className="num text-[20px]">{num(m.stageOne.macroF1, 3)}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Relevance accuracy</dt><dd className="num text-[20px]">{pct(m.stageOne.relevanceAccuracy)}</dd></div>
              <div><dt className="text-[12px] text-muted-foreground">Relevance F1</dt><dd className="num text-[20px]">{num(m.stageOne.relevanceF1, 3)}</dd></div>
            </dl>
            <p className="text-[12px] text-muted-foreground mt-1">All on the held-out test split of the 14 training events (a random fifth of their posts). Hazard-type figures are computed on the relevant posts of that split, relevance figures on all of it.</p>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-[16px] mb-2">Per-class metrics</h3>
              <table className="w-full text-[14px]" data-testid="table-per-class">
                <thead><tr><th className={th}>Class</th><th className={`${th} text-right`}>Precision</th><th className={`${th} text-right`}>Recall</th><th className={`${th} text-right`}>F1</th><th className={`${th} text-right`}>Support</th></tr></thead>
                <tbody className="num">
                  {m.stageOne.perClass.map((c) => (
                    <tr key={c.label} className="border-t border-line"><td className="py-1.5 font-sans">{c.label}</td><td className="text-right">{num(c.precision, 3)}</td><td className="text-right">{num(c.recall, 3)}</td><td className="text-right">{num(c.f1, 3)}</td><td className="text-right">{num(c.support)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-[16px] mb-2">Confusion matrix</h3>
              <p className="text-[12px] text-muted-foreground mb-2">Rows are true labels, columns are predictions. Shade follows the row share.</p>
              <div className="overflow-x-auto">
                <table className="text-[12px] num" data-testid="table-confusion">
                  <thead><tr><th className="p-1" /><>{m.stageOne.confusion.labels.map((l) => <th key={l} scope="col" className="p-1 font-sans font-medium text-muted-foreground">{l}</th>)}</></tr></thead>
                  <tbody>
                    {m.stageOne.confusion.matrix.map((row, i) => {
                      const total = row.reduce((a, b) => a + b, 0) || 1;
                      return (
                        <tr key={i}>
                          <th scope="row" className="p-1 text-left font-sans font-medium text-muted-foreground">{m.stageOne.confusion.labels[i]}</th>
                          {row.map((v, j) => (
                            <td key={j} className="p-1 text-right min-w-10 border border-line" style={{ background: `rgba(61,155,255,${(v / total) * 0.6})` }}>{v}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-[16px] mb-2">Cross-dataset results</h3>
              <p className="text-[12px] text-muted-foreground mb-2">Measured on data the model was not trained on. The five held-out HumAID events also chose which candidate shipped, so they are a selection set rather than a final blind test; the Kaggle set played no part in training or selection. Expect these to be lower than the test split.</p>
              <table className="w-full text-[14px]">
                <thead><tr><th className={th}>Dataset</th><th className={`${th} text-right`}>Rows scored</th><th className={`${th} text-right`}>Accuracy</th><th className={`${th} text-right`}>F1</th></tr></thead>
                <tbody className="num">{m.stageOne.crossDataset.map((c) => <tr key={c.dataset} className="border-t border-line"><td className="py-1.5 pr-3 font-sans">{c.dataset}</td><td className="text-right pl-3 whitespace-nowrap">{num(c.rows)}</td><td className="text-right pl-3 whitespace-nowrap">{pct(c.accuracy)}</td><td className="text-right pl-3 whitespace-nowrap">{num(c.f1, 3)}</td></tr>)}</tbody>
              </table>
            </div>
            {m.stageOne.candidates && m.stageOne.candidates.length > 0 && (
              <div>
                <h3 className="text-[16px] mb-2">Candidates compared</h3>
                <table className="w-full text-[14px]">
                  <thead><tr><th className={th}>Model</th><th className={`${th} text-right`}>Accuracy</th><th className={`${th} text-right`}>Macro F1</th><th className={th + " pl-3"}>Shipped</th></tr></thead>
                  <tbody>{m.stageOne.candidates.map((c) => <tr key={c.name} className="border-t border-line"><td className="py-1.5 pr-3">{c.name}{c.note && <span className="block text-[12px] text-muted-foreground">{c.note}</span>}</td><td className="text-right num pl-3 whitespace-nowrap">{pct(c.accuracy)}</td><td className="text-right num pl-3 whitespace-nowrap">{num(c.macroF1, 3)}</td><td className="pl-3">{c.shipped ? "Yes" : "No"}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[16px] mb-2">Datasets and licences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]" data-testid="table-datasets">
                <thead><tr><th className={th}>Dataset</th><th className={th}>Role</th><th className={th}>Licence</th><th className={`${th} text-right`}>Rows</th></tr></thead>
                <tbody>{m.stageOne.datasets.map((d) => <tr key={d.name} className="border-t border-line"><td className="py-1.5"><a href={d.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{d.name}</a></td><td>{d.role}</td><td>{d.license}</td><td className="text-right num">{num(d.rows)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {[m.emotionModel, m.sentimentModel].map((p) => (
              <div key={p.name}>
                <h3 className="text-[16px]">{p.task}</h3>
                <p className="mt-1 text-[14px]"><a href={p.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{p.name}</a></p>
                <p className="text-[14px] text-muted-foreground">{p.reportedMetric}</p>
                <p className="text-[12px] text-muted-foreground mt-1">Labels: {p.labels.join(", ")}</p>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-[16px] mb-2">Detector settings</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[14px] max-w-[640px]">
              <dt className="text-muted-foreground">Baseline window</dt><dd className="num">{m.detector.baselineDays} days</dd>
              <dt className="text-muted-foreground">Minimum relevant posts</dt><dd className="num">{m.detector.minRelevantPerHour} per hour</dd>
              <dt className="text-muted-foreground">Level thresholds (robust z)</dt><dd className="num">elevated {m.detector.thresholds.elevated}, high {m.detector.thresholds.high}, severe {m.detector.thresholds.severe}</dd>
              <dt className="text-muted-foreground">Open after</dt><dd className="num">{m.detector.openAfterHours} h above threshold</dd>
              <dt className="text-muted-foreground">Close after</dt><dd className="num">{m.detector.closeAfterHours} h below threshold</dd>
              <dt className="text-muted-foreground">Corroboration</dt><dd><span className="num">{m.detector.corroborationRadiusKm} km</span>; official event active from <span className="num">{m.detector.corroborationLookbackHours} h</span> before to <span className="num">{m.detector.corroborationWindowHours} h</span> after the alert opens (<span className="num">{m.detector.corroborationActiveHours} h</span> when the feed records no end)</dd>
              <dt className="text-muted-foreground">Place resolution</dt><dd>{m.geoparser.method}, {m.geoparser.gazetteer}, <span className="num">{num(m.geoparser.placesInGazetteer)}</span> places</dd>
            </dl>
          </section>

          <section>
            <h3 className="text-[16px] mb-2">Limitations</h3>
            <ul className="list-disc pl-5 space-y-1 max-w-[72ch]">{m.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </section>

          <Panel title="Try the classifier" className="p-0">
            <div className="px-4 pb-4"><ClassifierDemo /></div>
          </Panel>
        </div>
      )}
    </Page>
  );
}
