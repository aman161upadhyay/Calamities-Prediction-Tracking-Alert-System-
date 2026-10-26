import { useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { useUnsubscribe, useVerifySubscription, getVerifySubscriptionQueryKey } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { ErrorState, LoadingRows, PageTitle, TextLink, btnPrimary } from "@/components/kit";
import { SubscribeForm, SubscribeResultNote } from "@/components/sections/subscribe-form";
import { errorMessage } from "@/lib/format";
import { useTitle } from "./home";

export default function SubscribePage() {
  useTitle("Subscribe");
  const place = new URLSearchParams(useSearch()).get("place") ?? undefined;
  return (
    <Page>
      <PageTitle sub="Get an email when an alert opens for a place or hazard you care about. Pick a place, a hazard, or both, and the level that is worth an email.">Get alerts by email</PageTitle>
      <SubscribeForm initialPlaceId={place} />
    </Page>
  );
}

export function VerifyPage() {
  useTitle("Confirm subscription");
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const q = useVerifySubscription({ token }, { query: { queryKey: getVerifySubscriptionQueryKey({ token }), enabled: !!token, retry: false } });
  return (
    <Page>
      <PageTitle>Confirm your subscription</PageTitle>
      {!token && <p>This link has no token. Open the link from the confirmation email again, or <TextLink href="/subscribe" testId="link-resubscribe">subscribe again</TextLink>.</p>}
      {q.isLoading && <LoadingRows rows={2} label="Confirming" />}
      {q.isError && <ErrorState what="the confirmation" onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <SubscribeResultNote r={q.data} />
          {q.data.status === "invalid" && <p className="mt-2">The link has expired or was already used. <TextLink href="/subscribe" testId="link-resubscribe">Subscribe again</TextLink>.</p>}
        </>
      )}
    </Page>
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
    <Page>
      <PageTitle>Unsubscribe</PageTitle>
      {!token && <p>This link has no token. Use the unsubscribe link at the bottom of any alert email.</p>}
      {m.isPending && <LoadingRows rows={1} label="Removing subscription" />}
      {m.isError && (
        <div role="alert">
          <p style={{ color: "#C8102E" }}>Couldn't remove the subscription: {errorMessage(m.error)}.</p>
          <button type="button" className={`${btnPrimary} mt-2`} onClick={() => m.mutate({ data: { token } })} data-testid="button-retry-unsubscribe">Try removing it again</button>
        </div>
      )}
      {m.data && <SubscribeResultNote r={m.data} />}
    </Page>
  );
}
