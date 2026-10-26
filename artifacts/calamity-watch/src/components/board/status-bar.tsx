import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SourceHealth, SystemStatus } from "@workspace/api-client-react";
import { SOURCE_STATE_LABEL, ago, utcTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATE_COLOR: Record<string, string> = {
  ok: "#9DA9BC",
  idle: "#9DA9BC",
  offline: "#FF6B3D",
  error: "#FF6B3D",
  not_configured: "#E8B04B",
  budget_reached: "#E8B04B",
};

function SourceChip({ s }: { s: SourceHealth }) {
  return (
    <span title={s.detail} data-testid={`status-source-${s.name}`} className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: s.state === "ok" ? "#5EEAD4" : STATE_COLOR[s.state] }} />
      {s.label} <span style={{ color: STATE_COLOR[s.state] }}>{SOURCE_STATE_LABEL[s.state]}</span>
    </span>
  );
}

export function StatusBar({ status, isLoading, isError, onRetry, replayLabel }: { status?: SystemStatus; isLoading: boolean; isError: boolean; onRetry: () => void; replayLabel?: string }) {
  const [open, setOpen] = useState(false);
  if (replayLabel) {
    return (
      <div className="border-b border-line bg-surface text-[13px] leading-5">
        <div className="mx-auto max-w-[1600px] px-4 min-h-10 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-bold" style={{ color: "#A78BFA" }}>Replay</span>
          <span data-testid="text-replay-clock">{replayLabel}</span>
          <span className="text-muted-foreground">Historical data, not live. Experimental, not an official warning source.</span>
        </div>
      </div>
    );
  }
  const okFeeds = status?.officialFeeds.filter((f) => f.state === "ok").length ?? 0;
  const problems = status ? [...status.sources, ...status.officialFeeds].filter((s) => s.state !== "ok" && s.state !== "idle") : [];
  return (
    <div className="border-b border-line bg-surface text-[13px] leading-5" data-testid="status-bar">
      <div className="mx-auto max-w-[1600px] px-4 min-h-10 py-2 flex items-center gap-x-4 gap-y-1 flex-wrap">
        {isLoading && <span className="text-muted-foreground">Reading system status</span>}
        {isError && !status && (
          <span>
            <span style={{ color: "#FF6B3D" }}>Status unavailable.</span>{" "}
            <button type="button" className="underline underline-offset-2" onClick={onRetry} data-testid="button-retry-status">Retry</button>
          </span>
        )}
        {status && (
          <>
            <span className="inline-flex items-center gap-1.5 font-bold" data-testid="status-live">
              <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: status.isStale ? "#E8B04B" : "#5EEAD4" }} />
              {status.isStale ? "Stale" : "Live"}
            </span>
            <span className="text-muted-foreground" data-testid="text-last-ingest">
              last ingest <span className="num text-foreground">{status.lastIngestAt ? utcTime(status.lastIngestAt) : "none yet"}</span>
              {status.lastIngestAt && <> ({ago(status.lastIngestAt, new Date(status.now))})</>}
            </span>
            <span className="hidden lg:contents">
              {status.sources.map((s) => <SourceChip key={s.name} s={s} />)}
              <span className="text-muted-foreground whitespace-nowrap" data-testid="text-official-feeds">{okFeeds} of {status.officialFeeds.length} official feeds ok</span>
              <span className="text-muted-foreground whitespace-nowrap">model <span className="num text-foreground">{status.modelVersion}</span>{status.modelReady === false && " (loading)"}</span>
            </span>
            <span className="ml-auto text-muted-foreground whitespace-nowrap">Experimental, not an official source</span>
            <button type="button" className="lg:hidden inline-flex items-center gap-1 text-muted-foreground" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="button-status-details">
              Sources <ChevronDown size={14} className={cn("transition-transform duration-150", open && "rotate-180")} />
            </button>
          </>
        )}
      </div>
      {status && open && (
        <div className="lg:hidden mx-auto max-w-[1600px] px-4 pb-3 flex flex-col gap-1 fade-in">
          {[...status.sources, ...status.officialFeeds].map((s) => <SourceChip key={s.name} s={s} />)}
          <span className="text-muted-foreground">model <span className="num">{status.modelVersion}</span></span>
        </div>
      )}
      {status && problems.length > 0 && (
        <div className="mx-auto max-w-[1600px] px-4 pb-2 text-[12px] leading-4 text-muted-foreground" data-testid="text-source-problems">
          {problems.map((p) => (
            <span key={p.name} className="mr-4">
              <span style={{ color: STATE_COLOR[p.state] }}>{p.label}:</span> {p.detail}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
