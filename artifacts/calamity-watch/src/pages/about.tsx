import { useHealthCheck, useGetSystemStatus } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { PageTitle, TextLink } from "@/components/kit";
import { SOURCE_STATE_LABEL, ago } from "@/lib/format";
import { useTitle } from "./home";

const ROWS: [string, string, string][] = [
  ["Posts", "Twitter streaming API, four Indian cities", "X recent search on a daily budget, plus the Bluesky firehose, any place"],
  ["Understanding", "Azure key phrases and generic sentiment", "Trained hazard classifier plus a multilabel emotion model for fear"],
  ["Place", "The city a stream was filtered on", "Named-entity recognition against a gazetteer, with platform geotags"],
  ["Alert rule", "Fixed threshold on negative tweets", "Robust z-score against each place's own 7-day baseline"],
  ["Checking", "None", "Every alert matched against GDACS, USGS, NWS and NASA FIRMS, lead time recorded"],
  ["Storage and UI", "CSV and a Flask page", "Postgres, a typed API and this board, with replay of past events"],
];

export default function AboutPage() {
  useTitle("About");
  const health = useHealthCheck();
  const status = useGetSystemStatus();
  return (
    <Page>
      <PageTitle sub="Hazard warnings read from what people post, before the sirens.">About Calamity Watch</PageTitle>
      <div className="max-w-[70ch] space-y-4 text-[16px] leading-6">
        <p>Calamity Watch is Aman's 2026 rebuild of a project first written in 2018 for Microsoft's CodeFunDo++ hackathon. The idea has not changed: when a flood, fire or storm hits, people post about it before official bulletins catch up, and that chatter can be measured.</p>
        <p>What changed is that every part is now measured. The original guessed; this version has held-out test scores, a baseline for each place, and a record of whether each alert was later confirmed by an official feed and how far ahead it was.</p>
      </div>

      <h2 className="text-[20px] leading-7 mt-10 mb-3">2018 and 2026, part by part</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px] leading-5" data-testid="table-lineage">
          <thead className="text-[12px] text-muted-foreground"><tr><th className="text-left font-medium py-1 pr-4">Part</th><th className="text-left font-medium pr-4">2018</th><th className="text-left font-medium">2026</th></tr></thead>
          <tbody>{ROWS.map(([a, b, c]) => <tr key={a} className="border-t border-line align-top"><th scope="row" className="text-left font-bold py-2 pr-4">{a}</th><td className="pr-4 py-2 text-muted-foreground">{b}</td><td className="py-2">{c}</td></tr>)}</tbody>
        </table>
      </div>

      <h2 className="text-[20px] leading-7 mt-10 mb-3">What it is not</h2>
      <ul className="list-disc pl-5 space-y-1 max-w-[70ch]">
        <li>It is not an official warning source and has no link to any emergency agency. Follow your local authorities.</li>
        <li>It cannot see places where people are not posting, or posting in languages the models were not trained on.</li>
        <li>A quiet board does not mean a place is safe. It means the posts it can read did not break from the baseline.</li>
        <li>Lead times are measured against the official feeds it checks, not against every warning that was issued.</li>
      </ul>
      <p className="mt-3"><TextLink href="/model" testId="link-about-model">Model metrics, datasets and limitations</TextLink></p>

      <h2 className="text-[20px] leading-7 mt-10 mb-3">Sources and their state now</h2>
      <p className="text-[14px] text-muted-foreground mb-2" data-testid="text-api-health">API {health.isLoading ? "checking" : health.data ? health.data.status : "unreachable"}.</p>
      {status.data && (
        <table className="w-full text-[14px] max-w-[800px]">
          <thead className="text-[12px] text-muted-foreground"><tr><th className="text-left font-medium py-1">Source</th><th className="text-left font-medium">State</th><th className="text-left font-medium">Last success</th></tr></thead>
          <tbody>
            {[...status.data.sources, ...status.data.officialFeeds].map((s) => (
              <tr key={s.name} className="border-t border-line align-top"><td className="py-1.5 pr-3">{s.label}</td><td className="pr-3">{SOURCE_STATE_LABEL[s.state]}<span className="block text-[12px] text-muted-foreground">{s.detail}</span></td><td className="num">{ago(s.lastSuccessAt, new Date(status.data!.now))}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-6 text-[14px] text-muted-foreground max-w-[70ch]">Map tiles by OpenFreeMap from OpenMapTiles, data from OpenStreetMap contributors. Official events from GDACS, USGS, the US National Weather Service and NASA FIRMS. Weather context from Open-Meteo.</p>
    </Page>
  );
}
