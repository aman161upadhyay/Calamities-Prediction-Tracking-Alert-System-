import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { useSearch } from "wouter";
import { useListAlerts, useUnsubscribe, useVerifySubscription, getListAlertsQueryKey, getVerifySubscriptionQueryKey } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { ErrorState, LoadingRows, TextLink, btnPrimary } from "@/components/kit";
import { Plate } from "@/components/instruments/plate";
import { SubscribeForm, SubscribeResultNote } from "@/components/sections/subscribe-form";
import { HAZARD_LABEL, errorMessage } from "@/lib/format";
import { useTitle } from "./home";

function FormPage({ title, lead, label, children, testId, aside }: { title: string; lead?: ReactNode; label: string[]; children: ReactNode; testId: string; aside?: ReactNode }) {
  const form = (
    <Plate label={label} testId={testId} className={aside ? "min-w-0" : "max-w-[760px]"}>
      <div className="p-4 md:p-6">{children}</div>
    </Plate>
  );
  return (
    <Page wide={!!aside}>
      <header className="mb-10 max-w-[760px]">
        <h1 className="display h1-station">{title}</h1>
        {lead && <p className="mt-5 text-ink-muted max-w-[60ch]">{lead}</p>}
      </header>
      {aside ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start">
          {form}
          <div className="grid gap-8 min-w-0">{aside}</div>
        </div>
      ) : form}
    </Page>
  );
}

export default function SubscribePage() {
  useTitle("Subscribe");
  const place = new URLSearchParams(useSearch()).get("place") ?? undefined;
  return (
    <FormPage title="Get alerts by email" label={["Form", "subscription"]} testId="plate-subscribe" aside={<><Specimen /><SendRules /></>} lead="An email when an alert opens for a place or hazard you care about. Pick a place, a hazard, or both, and the lowest level worth an email.">
      <SubscribeForm initialPlaceId={place} />
    </FormPage>
  );
}

export function VerifyPage() {
  useTitle("Confirm subscription");
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const q = useVerifySubscription({ token }, { query: { queryKey: getVerifySubscriptionQueryKey({ token }), enabled: !!token, retry: false } });
  return (
    <FormPage title="Confirm your subscription" label={["Form", "confirmation"]} testId="plate-verify">
      {!token && <p data-testid="text-no-token">This link has no token. Open the link from the confirmation email again, or <TextLink href="/subscribe" testId="link-resubscribe">subscribe again</TextLink>.</p>}
      {q.isLoading && <LoadingRows rows={2} label="Confirming with the server" />}
      {q.isError && <ErrorState what="the confirmation" onRetry={() => q.refetch()} className="p-0" />}
      {q.data && (
        <>
          <SubscribeResultNote r={q.data} />
          {q.data.status === "invalid" && <p className="mt-2 text-[14px]">The link has expired or was already used. <TextLink href="/subscribe" testId="link-resubscribe">Subscribe again</TextLink>.</p>}
        </>
      )}
    </FormPage>
  );
}

export function UnsubscribePage() {
  useTitle("Unsubscribe");
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const m = useUnsubscribe();
  const mutateRef = useRef(m.mutate);
  mutateRef.current = m.mutate;
  const sent = useRef(false);
  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true;
      mutateRef.current({ data: { token } });
    }
  }, [token]);
  return (
    <FormPage title="Unsubscribe" label={["Form", "removal"]} testId="plate-unsubscribe">
      {!token && <p data-testid="text-no-token">This link has no token. Use the unsubscribe link at the bottom of any alert email.</p>}
      {m.isPending && <LoadingRows rows={1} label="Removing the subscription" />}
      {m.isError && (
        <div role="alert">
          <p className="font-semibold">Error: couldn't remove the subscription: {errorMessage(m.error)}.</p>
          <button type="button" className={`${btnPrimary} mt-3`} onClick={() => m.mutate({ data: { token } })} data-testid="button-retry-unsubscribe">Remove the subscription again</button>
        </div>
      )}
      {m.data && <SubscribeResultNote r={m.data} />}
    </FormPage>
  );
}

const SPECIMEN_PARAMS = { scenario: "kerala-floods-2018", asOf: "2018-09-12T14:00:00Z", limit: 50 };

/** The plain-text alert email exactly as the server composes it (api-server services/notify.ts), filled from a real replay alert. */
function Specimen() {
  const q = useListAlerts(SPECIMEN_PARAMS, { query: { queryKey: getListAlertsQueryKey(SPECIMEN_PARAMS), staleTime: 10 * 60_000 } });
  const a = q.data && q.data.length > 0 ? q.data.reduce((m, x) => (x.peakZ > m.peakZ ? x : m)) : null;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const label = a ? HAZARD_LABEL[a.hazard] : "<Hazard>";
  const place = a ? a.placeName : "<place>";
  // The server mails the level at the moment it sends; a closed alert on the tape reads "insufficient" now, so the specimen uses its peak.
  const level = a ? a.peakLevel : "<level>";
  const subject = `${label} signal ${level} for ${place}`;
  const body = [
    "Calamity Watch Post (experimental, not an official warning source)",
    "",
    `${label} signal for ${place} is ${level}.`,
    a ? a.summary : "<summary>",
    "",
    `Details: ${base}/alerts/${a ? a.id : "<id>"}`,
    `Unsubscribe: ${base}/subscribe/unsubscribe?token=<token>`,
  ].join("\n");
  return (
    <Plate label={["Specimen", "alert email"]} testId="plate-specimen">
      {q.isLoading ? (
        <LoadingRows rows={5} label="Filling the specimen" />
      ) : q.isError ? (
        <ErrorState what="the specimen alert" onRetry={() => q.refetch()} />
      ) : (
        <div className="p-4">
          <div className="bg-paper border border-rule-strong mono text-[12px] leading-[18px] text-ink" data-testid="text-specimen">
            <p className="px-3 py-2 break-words"><span className="text-ink-muted">Subject: </span>{subject}</p>
            <pre className="px-3 py-2 border-t border-rule whitespace-pre-wrap break-words font-[inherit]">{body}</pre>
          </div>
          <p className="mt-2 text-[12px] text-ink-muted" data-testid="text-specimen-caption">
            {a ? <>Specimen filled from alert <span className="mono">{a.id}</span> on the Kerala 2018 tape, at its peak level; the live service sends the same template.</> : "The template as the live service sends it; no alert on the Kerala 2018 tape to fill it from."}
          </p>
        </div>
      )}
    </Plate>
  );
}

function SendRules() {
  const rows: [string, string][] = [
    ["Address", "Only a confirmed address. Until you open the confirmation link, nothing is sent."],
    ["Place", "The alert's place matches yours, or your subscription names no place."],
    ["Hazard", "The alert's hazard matches yours, or your subscription names no hazard."],
    ["Level", "The alert's current level is at or above the minimum you chose."],
    ["Repeats", "One email per alert per subscription, never a repeat."],
    ["Leaving", "Every email carries its own unsubscribe link."],
  ];
  return (
    <Plate label={["Rules", "when it sends"]} testId="plate-send-rules">
      <dl className="p-4 grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[14px] leading-5">
        {rows.map(([k, v]) => (<Fragment key={k}><dt className="text-ink-muted">{k}</dt><dd>{v}</dd></Fragment>))}
      </dl>
    </Plate>
  );
}
