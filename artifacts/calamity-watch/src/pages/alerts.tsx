import { Link, useLocation, useSearch } from "wouter";
import { useListAlerts, useListReplayScenarios, useGetPlace, getListAlertsQueryKey, getGetPlaceQueryKey, type AlertStatus } from "@workspace/api-client-react";
import { Page } from "@/components/layout/shell";
import { EmptyState, ErrorState, ExperimentalNote, LoadingRows, btn } from "@/components/kit";
import { PlateLabel } from "@/components/instruments/plate";
import { AlertLedger, RadioRow } from "@/components/evidence/parts";
import { HAZARDS, HAZARD_LABEL, isHazard, utcDateTime } from "@/lib/format";
import { useTitle } from "./home";

const LIMIT = 200;

export default function AlertsPage() {
  useTitle("Alerts");
  const search = useSearch();
  const [, navigate] = useLocation();
  const sp = new URLSearchParams(search);
  const st = sp.get("status");
  const status: AlertStatus | undefined = st === "open" || st === "closed" ? st : undefined;
  const hz = sp.get("hazard");
  const hazard = isHazard(hz) ? hz : undefined;
  const pid = Number(sp.get("placeId"));
  const placeId = Number.isInteger(pid) && pid > 0 ? pid : undefined;
  const scenario = sp.get("scenario") || undefined;
  const asOf = sp.get("asOf") || undefined;
  const scope = scenario ? { scenario, asOf } : null;

  const params = { limit: LIMIT, ...(status ? { status } : {}), ...(hazard ? { hazard } : {}), ...(placeId ? { placeId } : {}), ...(scenario ? { scenario } : {}), ...(scenario && asOf ? { asOf } : {}) };
  const q = useListAlerts(params, { query: { queryKey: getListAlertsQueryKey(params), refetchInterval: scenario ? false : 60_000 } });
  const scenarios = useListReplayScenarios();
  const placeParams = scenario ? { scenario } : undefined;
  const place = useGetPlace(placeId ?? 0, placeParams, { query: { queryKey: getGetPlaceQueryKey(placeId ?? 0, placeParams), enabled: !!placeId } });
  const scen = scenarios.data?.find((s) => s.id === scenario);

  const set = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams(search);
    for (const [k, v] of Object.entries(patch)) (v ? n.set(k, v) : n.delete(k));
    const s = n.toString();
    navigate(`/alerts${s ? `?${s}` : ""}`);
  };

  const filtered = !!(status || hazard || placeId);
  const rows = q.data ?? [];
  const nOpen = rows.filter((a) => a.status === "open").length;
  const nStamped = rows.filter((a) => a.corroboration.state === "corroborated").length;

  return (
    <Page wide>
      <header className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end mb-10">
        <h1 className="display h1-station">The alert ledger</h1>
        <p className="text-ink-muted max-w-[56ch]">
          An alert opens when a place's fear signal for one hazard stays above its own 7-day baseline, and closes when it falls back. Each row is one alert; the last column says whether an official record matched it, and by how much it led or lagged.
        </p>
      </header>

      <div className="grid gap-3 mb-6" data-testid="filters-alerts">
        <RadioRow
          label="Record"
          testId="filter-scope"
          value={scenario ?? ""}
          onChange={(v) => set({ scenario: v || undefined, asOf: undefined, placeId: undefined })}
          options={[{ value: "", label: "Live" }, ...(scenarios.data ?? []).map((s) => ({ value: s.id, label: s.name.split(",")[0] + ` ${new Date(s.startsAt).getUTCFullYear()}` }))]}
        />
        <RadioRow label="Status" testId="filter-status" value={status ?? ""} onChange={(v) => set({ status: v || undefined })} options={[{ value: "", label: "All" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />
        <RadioRow label="Hazard" testId="filter-hazard" value={hazard ?? ""} onChange={(v) => set({ hazard: v || undefined })} options={[{ value: "", label: "All" }, ...HAZARDS.map((h) => ({ value: h, label: HAZARD_LABEL[h] }))]} />
        {placeId && (
          <p className="md:pl-[104px] text-[13px]">
            Place: <span className="font-semibold" data-testid="text-filter-place">{place.data?.place.name ?? `#${placeId}`}</span>{" "}
            <button type="button" className="ink-link text-ink-muted ml-2" onClick={() => set({ placeId: undefined })} data-testid="button-clear-place">Show every place</button>
          </p>
        )}
      </div>

      <div className="bg-sheet border border-rule-strong">
        <PlateLabel
          parts={["Ledger", "alerts", scope ? (scen?.name.split(",")[0] ?? scope.scenario) : "live", "UTC"]}
          right={q.data ? <span className="mono" data-testid="text-alert-counts">{rows.length} rows · {nOpen} open · {nStamped} stamped</span> : null}
        />
        {scope?.asOf && <p className="px-4 py-2 border-b border-rule text-[12px] text-ink-muted">Read as of <span className="mono text-ink">{utcDateTime(scope.asOf)}</span> in the replay.</p>}
        <div className="min-h-[360px]">
          {q.isLoading && <LoadingRows rows={7} label="Reading the ledger" />}
          {q.isError && <ErrorState what="the alert ledger" onRetry={() => q.refetch()} />}
          {q.data && rows.length === 0 && (
            <div className="p-6 md:p-10 grid place-items-center text-center">
              <EmptyState className="text-center">
                {filtered ? (
                  <p>No alert in this record matches these filters.</p>
                ) : scope ? (
                  <p>This replay has not opened an alert by this point.</p>
                ) : (
                  <p className="text-ink text-[15px] leading-6">No alert has opened from live posts yet. The detector needs a place to stay above its own baseline for two hours, and so far none has. Every replay below has closed alerts with official stamps.</p>
                )}
              </EmptyState>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {filtered && <button type="button" className={btn} onClick={() => set({ status: undefined, hazard: undefined, placeId: undefined })} data-testid="button-clear-filters">Clear the filters</button>}
                {!scope && (scenarios.data ?? []).slice(0, 5).map((s) => (
                  <button key={s.id} type="button" className={btn} onClick={() => set({ scenario: s.id, asOf: undefined, placeId: undefined })} data-testid={`button-switch-${s.id}`}>
                    Read {s.name.split(",")[0]}
                  </button>
                ))}
                {!scope && scenarios.isError && <Link href="/replay" className={btn} data-testid="link-alerts-replay">Open the replays</Link>}
              </div>
            </div>
          )}
          {q.data && rows.length > 0 && <AlertLedger alerts={rows} scope={scope} levelLabel={!scope ? "Level now" : asOf ? `Level at ${utcDateTime(asOf)}` : "Level at end"} />}
        </div>
        {rows.length === LIMIT && <p className="px-4 py-2 border-t border-rule text-[12px] text-ink-muted">Showing the first {LIMIT}, open first then most recent. Narrow by hazard or status to see older ones.</p>}
      </div>
      <ExperimentalNote className="mt-3" />
    </Page>
  );
}
