import { useState } from "react";
import { useClassifyText, useListModelExamples, type Classification } from "@workspace/api-client-react";
import { errorMessage, HAZARD_LABEL, isHazard, placeLabel, prob } from "@/lib/format";
import { HazardDot, btnPrimary } from "@/components/kit";
import { Textarea } from "@/components/ui/textarea";
import { Dial } from "@/components/instruments/dial";

export function ClassifierDemo() {
  const [text, setText] = useState("");
  const examples = useListModelExamples();
  const classify = useClassifyText();
  const [result, setResult] = useState<Classification | null>(null);
  const valid = text.trim().length >= 3 && text.length <= 1000;

  const run = () => {
    if (!valid) return;
    classify.mutate({ data: { text: text.trim() } }, { onSuccess: setResult });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <label htmlFor="classify-text" className="block text-[14px] font-semibold">Text to classify</label>
        <p className="text-[12px] leading-4 text-muted-foreground">3 to 1000 characters. Nothing you type is stored.</p>
        <Textarea
          id="classify-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={5}
          className="mt-2 bg-sheet border-rule-strong rounded-[3px] text-[16px]"
          data-testid="input-classify-text"
        />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" className={btnPrimary} onClick={run} disabled={!valid || classify.isPending} data-testid="button-classify">
            {classify.isPending ? "Classifying" : "Classify this text"}
          </button>
          <span className="num text-[12px] text-muted-foreground">{text.length}/1000</span>
        </div>
        {examples.data && examples.data.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] leading-4 text-muted-foreground">Or try an example</p>
            <ul className="mt-1 space-y-1">
              {examples.data.map((ex, i) => (
                <li key={i}>
                  <button type="button" onClick={() => setText(ex.text)} data-testid={`button-example-${i}`} className="text-left text-[13px] leading-5 hover:text-foreground text-muted-foreground">
                    <span className="text-foreground">"{ex.text}"</span> <span className="text-[12px]">({ex.note})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {examples.isError && <p className="mt-3 text-[12px] text-muted-foreground">Examples could not load.</p>}
      </div>
      <div aria-live="polite" data-testid="panel-classify-result">
        <div className="flex flex-wrap gap-6 mb-5 bg-sheet border border-rule-strong p-4" data-testid="panel-dials">
          <Dial label="Relevance" value={result?.pRelevant ?? null} testId="dial-relevance" />
          <Dial label="Fear" value={result?.pFear ?? null} pen testId="dial-fear" />
        </div>
        {classify.isError && (
          <p role="alert" className="text-[14px] text-ink">
            <span className="font-semibold">Error: couldn't classify:</span> {errorMessage(classify.error)}. If the model is still loading, try again in a minute.
          </p>
        )}
        {!result && !classify.isError && <p className="text-[14px] text-muted-foreground">The result shows relevance, hazard type, emotions, sentiment and any place found, with the model version and latency.</p>}
        {result && <ClassificationTable r={result} />}
      </div>
    </div>
  );
}

function Bar({ v, color }: { v: number; color: string }) {
  return (
    <span className="inline-block w-24 h-1.5 bg-surface-2 align-middle" aria-hidden>
      <span className="block h-full origin-left" style={{ width: `${Math.round(v * 100)}%`, background: color }} />
    </span>
  );
}

function ClassificationTable({ r }: { r: Classification }) {
  const hazards = Object.entries(r.hazardProbs).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const emotions = Object.entries(r.emotions ?? { fear: r.pFear, anger: r.pAnger, sadness: r.pSadness }).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="text-[14px] leading-5">
      <p className="max-w-[60ch]" data-testid="text-classify-explanation">{r.explanation}</p>
      <table className="mt-3 w-full">
        <tbody>
          <tr className="border-t border-line"><th scope="row" className="text-left font-normal text-muted-foreground py-1.5">Hazard-relevant</th><td className="text-right num" data-testid="text-p-relevant">{prob(r.pRelevant)}</td><td className="pl-3 w-28"><Bar v={r.pRelevant} color="#15140F" /></td></tr>
          {hazards.map(([k, v]) => (
            <tr key={k} className="border-t border-line">
              <th scope="row" className="text-left font-normal py-1.5"><span className="inline-flex items-center gap-1.5">{isHazard(k) && <HazardDot hazard={k} />}{isHazard(k) ? HAZARD_LABEL[k] : k}</span></th>
              <td className="text-right num">{prob(v)}</td><td className="pl-3"><Bar v={v} color="#5B5A54" /></td>
            </tr>
          ))}
          {emotions.map(([k, v]) => (
            <tr key={k} className="border-t border-line">
              <th scope="row" className="text-left font-normal py-1.5 capitalize">{k}</th>
              <td className="text-right num">{prob(v)}</td><td className="pl-3"><Bar v={v} color={k === "fear" ? "#C8102E" : "#5B5A54"} /></td>
            </tr>
          ))}
          <tr className="border-t border-line"><th scope="row" className="text-left font-normal text-muted-foreground py-1.5">Sentiment</th><td className="text-right num" colSpan={2}>{r.sentiment} ({r.sentimentScore.toFixed(2)})</td></tr>
          <tr className="border-t border-line"><th scope="row" className="text-left font-normal text-muted-foreground py-1.5">Places found</th><td className="text-right" colSpan={2}>{r.places.length ? r.places.map((p) => `${placeLabel(p.name, p.country)} (${prob(p.confidence)})`).join("; ") : "none"}</td></tr>
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-muted-foreground">model <span className="num">{r.modelVersion}</span>, <span className="num">{Math.round(r.latencyMs)} ms</span></p>
    </div>
  );
}
