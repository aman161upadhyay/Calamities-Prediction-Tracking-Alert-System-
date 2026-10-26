import { useGetModelInfo, useGetSystemStatus } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { TextLink } from "@/components/kit";
import { Part } from "@/components/evidence/parts";
import { Plate } from "@/components/instruments/plate";
import { SOURCE_STATE_LABEL, ago, num } from "@/lib/format";
import { useTitle } from "./home";

const ROWS: [string, string, string][] = [
  ["Posts", "Twitter streaming API, four Indian cities", "X recent search on a daily budget, plus Bluesky public search, any place"],
  ["Understanding", "Azure key phrases and generic sentiment", "Trained hazard classifier plus a multilabel emotion model for fear"],
  ["Place", "The city a stream was filtered on", "Named-entity recognition against a gazetteer; the text has to name the place"],
  ["Alert rule", "Fixed threshold on negative tweets", "Robust z-score against each place's own 7-day baseline"],
  ["Checking", "None", "Every alert matched against GDACS, USGS, NWS and NASA FIRMS, timing against the record kept"],
  ["Storage and UI", "CSV and a Flask page", "Postgres, a typed API and this board, with replay of past events"],
];

export default function AboutPage() {
  useTitle("About");
  const status = useGetSystemStatus();
  const model = useGetModelInfo();
  const m = model.data;
  return (
    <Page wide>
      <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end">
        <h1 className="display h1-station">A new instrument in an old room</h1>
        <p className="text-ink-muted max-w-[56ch]">Calamity Watch Post reads public posts and records a fear signal per place and hazard, next to the official record, so you can judge for yourself whether the signal moved first. Built by Aman Upadhyay.</p>
      </header>

      <Part id="is" title="What it is, and what it is not">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="text-[16px] leading-7 max-w-[64ch] space-y-4">
            <p>A research instrument. Posts about floods, fires, storms and quakes are scored for relevance and fear, summed per place and hour, and compared with each place's own 7-day baseline. When a place stays above it, an alert opens, and the official feeds are searched for a record that matches it in place and time.</p>
            <p>The lead or lag against that record is measured and printed either way. In the five replays the first alert opens hours to days after the earliest official record, because each collection itself begins after that record; the replay page prints the gap for each event.</p>
          </div>
          <div className="border-2 border-ink bg-sheet p-5 md:p-6" data-testid="panel-not">
            <p className="plate-label mb-3">Not an official warning source</p>
            <ul className="space-y-3 text-[15px] leading-6">
              <li><span className="font-semibold">Never decide an evacuation from it.</span> It has no link to any emergency agency. Follow your national meteorological service and local authorities.</li>
              <li>It cannot see places where people are not posting, or posting in languages the models were not trained on.</li>
              <li>A quiet board does not mean a place is safe; it means the posts it can read did not stay above their baseline.</li>
              <li>Lead times are measured against the feeds it checks, not against every warning that was issued.</li>
            </ul>
          </div>
        </div>
      </Part>

      <Part id="lineage" title="2018 to 2026" note="First written in 2018 for Microsoft's CodeFunDo++ hackathon; rebuilt in 2026 with every part measured instead of assumed.">
        {/* Below sm the three columns stack per part; a 560 px table only clipped on a phone. */}
        <div className="sm:hidden plate divide-y divide-rule" data-testid="list-lineage">
          {ROWS.map(([a, b, c]) => (
            <div key={a} className="px-4 py-3 text-[14px] leading-5">
              <p className="font-semibold">{a}</p>
              <p className="mt-1 grid grid-cols-[40px_minmax(0,1fr)] gap-x-3"><span className="mono text-[12px] text-ink-muted pt-0.5">2018</span><span className="text-ink-muted">{b}</span></p>
              <p className="mt-1 grid grid-cols-[40px_minmax(0,1fr)] gap-x-3"><span className="mono text-[12px] pt-0.5">2026</span><span>{c}</span></p>
            </div>
          ))}
        </div>
        <div className="hidden sm:block plate overflow-x-auto">
          <table className="w-full text-[14px] leading-5 min-w-[560px]" data-testid="table-lineage">
            <thead className="border-b border-rule-strong"><tr><th className="text-left font-normal text-[12px] text-ink-muted py-2 px-4 w-[140px]">Part</th><th className="text-left font-normal mono text-[12px] text-ink-muted px-4">2018</th><th className="text-left font-normal mono text-[12px] text-ink px-4">2026</th></tr></thead>
            <tbody className="divide-y divide-rule">{ROWS.map(([a, b, c]) => <tr key={a} className="align-top"><th scope="row" className="text-left font-semibold py-3 px-4">{a}</th><td className="px-4 py-3 text-ink-muted">{b}</td><td className="px-4 py-3">{c}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-[14px]"><TextLink href="/model" testId="link-about-model">Read the calibration certificate</TextLink></p>
      </Part>

      <Part id="sources" title="Sources and licences">
        <div className="grid gap-6 lg:grid-cols-2">
          <Plate label={["Sources", "inputs"]} testId="plate-sources">
            <dl className="p-4 grid grid-cols-[130px_minmax(0,1fr)] gap-y-3 text-[14px] leading-5">
              <dt className="text-ink-muted">Live posts</dt><dd>X recent search API on a daily budget; Bluesky public search</dd>
              <dt className="text-ink-muted">Replay posts</dt><dd>HumAID (Alam et al. 2021), CrisisNLP terms: research use, tweet text kept confidential, so replays show ids and scores, not text</dd>
              <dt className="text-ink-muted">Emotion</dt><dd>{m ? <a href={m.emotionModel.url} target="_blank" rel="noreferrer" className="ink-link break-all">{m.emotionModel.name}</a> : model.isError ? "unavailable" : "reading"}</dd>
              <dt className="text-ink-muted">Sentiment</dt><dd>{m ? <a href={m.sentimentModel.url} target="_blank" rel="noreferrer" className="ink-link break-all">{m.sentimentModel.name}</a> : model.isError ? "unavailable" : "reading"}</dd>
              <dt className="text-ink-muted">Gazetteer</dt><dd>{m ? <>{m.geoparser.gazetteer}, <span className="mono">{num(m.geoparser.placesInGazetteer)}</span> places</> : "reading"}</dd>
              <dt className="text-ink-muted">Official</dt><dd>GDACS, USGS, US National Weather Service, NASA FIRMS</dd>
              <dt className="text-ink-muted">Weather</dt><dd>Open-Meteo</dd>
              <dt className="text-ink-muted">Map</dt><dd>OpenFreeMap positron tiles from OpenMapTiles, data from OpenStreetMap contributors (ODbL)</dd>
              <dt className="text-ink-muted">Type</dt><dd>Archivo and Martian Mono, served from this site under the SIL Open Font License</dd>
            </dl>
          </Plate>
          <Plate label={["Sources", "state now", "UTC"]} testId="plate-source-state">
            {status.isLoading && <p className="p-4 text-[13px] text-ink-muted">Reading the station status</p>}
            {status.isError && <p className="p-4 text-[14px] font-semibold">Error: the status endpoint did not answer.</p>}
            {status.data && (
              <ul className="divide-y divide-rule">
                {[...status.data.sources, ...status.data.officialFeeds].map((s) => (
                  <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-2.5 text-[13px] leading-5" data-testid={`row-source-${s.name}`}>
                    <span><span className="font-semibold">{s.label}</span> {SOURCE_STATE_LABEL[s.state]}<span className="block text-[12px] text-ink-muted">{s.detail}</span></span>
                    <span className="mono text-[11px] text-ink-muted">{ago(s.lastSuccessAt, new Date(status.data!.now))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Plate>
        </div>
      </Part>
    </Page>
  );
}
