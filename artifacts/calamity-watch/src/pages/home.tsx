import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { useGetModelInfo, useGetSystemStatus, getGetSystemStatusQueryKey } from "@workspace/api-client-react";
import { StatusBar } from "@/components/board/status-bar";
import { Board } from "@/components/board/board";
import { PipelineList, ModelSummary } from "@/components/sections/model-blocks";
import { ClassifierDemo } from "@/components/sections/classifier";
import { SubscribeForm } from "@/components/sections/subscribe-form";
import { ErrorState, LoadingRows, TextLink } from "@/components/kit";
import { utcDateTime } from "@/lib/format";

export function useTitle(t: string) {
  useEffect(() => {
    document.title = t ? `${t} · Calamity Watch` : "Calamity Watch";
  }, [t]);
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mx-auto max-w-[1600px] px-4 pt-12">
      <h2 id={`${id}-h`} className="text-[20px] leading-7">{title}</h2>
      {lead && <p className="mt-1 mb-4 text-muted-foreground max-w-[70ch]">{lead}</p>}
      {children}
    </section>
  );
}

export default function Home() {
  useTitle("");
  const status = useGetSystemStatus({ query: { queryKey: getGetSystemStatusQueryKey(), refetchInterval: 60_000 } });
  const model = useGetModelInfo();
  return (
    <>
      <StatusBar status={status.data} isLoading={status.isLoading} isError={status.isError} onRetry={() => status.refetch()} />
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <p className="max-w-[80ch] text-[16px] leading-6" data-testid="text-statement">
          Reads public posts about floods, fires, storms and quakes, scores relevance and fear with two models, and raises an alert when a place breaks from its own 7-day baseline.{" "}
          <a href="#how" className="text-[#7FB8FF] underline underline-offset-2" data-testid="link-how">How it works</a>
        </p>
      </div>
      <Board mode={{}} status={status.data} poll />

      <Section id="how" title="How it works" lead="Six stages run every few minutes. The counts are from the live pipeline over the last 24 hours, not estimates.">
        {status.isLoading && <LoadingRows rows={3} />}
        {status.isError && !status.data && <ErrorState what="pipeline counts" onRetry={() => status.refetch()} />}
        {status.data && <PipelineList stages={status.data.pipeline} asOf={utcDateTime(status.data.now)} />}
      </Section>

      <Section id="model" title="The models" lead={<>A trained hazard classifier decides whether a post is about a hazard and which one; a pretrained emotion model scores fear. Full metrics, datasets and limits are on the <TextLink href="/model" testId="link-model-page">model page</TextLink>.</>}>
        {model.isLoading && <LoadingRows rows={3} />}
        {model.isError && <ErrorState what="model metrics" onRetry={() => model.refetch()} />}
        {model.data && <ModelSummary m={model.data} />}
      </Section>

      <Section id="lineage" title="From a 2018 hackathon to a measured system">
        <div className="max-w-[70ch] space-y-3 text-[16px] leading-6">
          <p>In 2018, for Microsoft's CodeFunDo++ hackathon, the first version streamed tweets for four Indian cities, sent them to Azure for key phrases and sentiment, and flagged a city when negative tweets crossed a fixed threshold. Results went into a CSV and a small Flask page.</p>
          <p>The 2026 rebuild keeps the idea and replaces every part with one that can be measured: a trained hazard classifier and an emotion model instead of generic sentiment, a per-place 7-day baseline instead of fixed thresholds, any place in the gazetteer instead of four cities, and a check of every alert against official feeds with the lead time recorded.</p>
          <p><TextLink href="/about" testId="link-about-lineage">Read what changed and what the system is not</TextLink></p>
        </div>
      </Section>

      <Section id="try" title="Try the classifier" lead="Paste a post or write one. The same models score it that score the live feed.">
        <ClassifierDemo />
      </Section>

      <Section id="subscribe" title="Get alerts by email" lead="Choose a place, a hazard and the lowest level worth an email.">
        <SubscribeForm />
        <p className="mt-4 text-[14px] text-muted-foreground">Want to see the system under load first? <Link href="/replay" className="text-[#7FB8FF] underline underline-offset-2" data-testid="link-replay-cta">Replay a past disaster</Link>.</p>
      </Section>
    </>
  );
}
