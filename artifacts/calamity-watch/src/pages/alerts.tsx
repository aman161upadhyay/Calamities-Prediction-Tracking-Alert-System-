import { Link, useLocation, useSearch } from "wouter";
import { useListAlerts, useListHazards, getListAlertsQueryKey, type AlertStatus } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, ExperimentalNote, LoadingRows, PageTitle, Panel } from "@/components/kit";
import { AlertRow } from "@/components/board/rows";
import { HAZARDS, HAZARD_LABEL, isHazard } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTitle } from "./home";

const chip = "press rounded-[4px] border px-2.5 py-1 text-[13px] leading-5";

export default function AlertsPage() {
  useTitle("Alerts");
  const search = useSearch();
  const [, navigate] = useLocation();
  const sp = new URLSearchParams(search);
  const status = (sp.get("status") === "open" || sp.get("status") === "closed" ? sp.get("status") : undefined) as AlertStatus | undefined;
  const hz = sp.get("hazard");
  const hazard = isHazard(hz) ? hz : undefined;
  const params = { limit: 100, ...(status ? { status } : {}), ...(hazard ? { hazard } : {}) };
  const q = useListAlerts(params, { query: { queryKey: getListAlertsQueryKey(params), refetchInterval: 60_000 } });
  const hazards = useListHazards();
  const counts = Object.fromEntries((hazards.data ?? []).map((h) => [h.hazard, h.openAlerts]));

  // Filters live in the URL so Back keeps them.
  const set = (k: string, v?: string) => {
    const n = new URLSearchParams(search);
    if (v) n.set(k, v);
    else n.delete(k);
    const s = n.toString();
    navigate(`/alerts${s ? `?${s}` : ""}`);
  };

  return (
    <Page>
      <PageTitle sub="An alert opens when a place's fear-weighted signal for one hazard stays above its own 7-day baseline. Open alerts first, then most recent.">Alerts</PageTitle>
      <div className="flex flex-col gap-3 mb-4">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {([undefined, "open", "closed"] as const).map((s) => (
            <button key={s ?? "all"} type="button" aria-pressed={status === s} onClick={() => set("status", s)} data-testid={`button-filter-status-${s ?? "all"}`} className={cn(chip, status === s ? "border-[#3a4a66] bg-surface-2" : "border-line text-muted-foreground")}>
              {s === undefined ? "All statuses" : s === "open" ? "Open" : "Closed"}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Filter by hazard" className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={!hazard} onClick={() => set("hazard")} data-testid="button-filter-hazard-all" className={cn(chip, !hazard ? "border-[#3a4a66] bg-surface-2" : "border-line text-muted-foreground")}>All hazards</button>
          {HAZARDS.map((h) => (
            <button key={h} type="button" aria-pressed={hazard === h} onClick={() => set("hazard", h)} data-testid={`button-filter-hazard-${h}`} className={cn(chip, hazard === h ? "border-[#3a4a66] bg-surface-2" : "border-line text-muted-foreground")}>
              {HAZARD_LABEL[h]}{counts[h] ? <span className="num ml-1 text-muted-foreground">{counts[h]} open</span> : null}
            </button>
          ))}
        </div>
      </div>
      <Panel>
        {q.isLoading && <LoadingRows rows={5} />}
        {q.isError && <ErrorState what="alerts" onRetry={() => q.refetch()} />}
        {q.data && q.data.length === 0 && (
          <EmptyState action={(status || hazard) && <button type="button" className="underline underline-offset-2" onClick={() => navigate("/alerts")} data-testid="button-clear-filters">Clear filters</button>}>
            {status || hazard ? (
              "No alerts match these filters."
            ) : (
              <>
                No alert has opened since live ingestion began; the detector needs a place to stay above its own baseline for two hours.{" "}
                <Link href="/replay" className="text-[#7FB8FF] underline underline-offset-2" data-testid="link-alerts-replay">Replay a past event</Link> to watch alerts open and close.
              </>
            )}
          </EmptyState>
        )}
        {q.data && q.data.length > 0 && <ul data-testid="list-alerts">{q.data.map((a) => <AlertRow key={a.id} alert={a} />)}</ul>}
      </Panel>
      <ExperimentalNote className="mt-3" />
    </Page>
  );
}
