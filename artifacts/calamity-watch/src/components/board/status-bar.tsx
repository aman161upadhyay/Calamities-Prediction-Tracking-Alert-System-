import type { SystemStatus } from "@workspace/api-client-react";

/**
 * Strip under the header. In replay it names the clock; live, it only speaks when a source has a problem,
 * because the station header already carries live state and last ingest.
 */
export function StatusBar({ status, isLoading, isError, onRetry, replayLabel }: { status?: SystemStatus; isLoading: boolean; isError: boolean; onRetry: () => void; replayLabel?: string }) {
  if (replayLabel) {
    return (
      <div className="border-b border-rule-strong bg-sheet text-[13px] leading-5">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 min-h-10 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="plate-label text-ink">▶ Replay</span>
          <span className="mono" data-testid="text-replay-clock">{replayLabel}</span>
          <span className="text-ink-muted">Historical data, not live. Experimental, not an official warning source.</span>
        </div>
      </div>
    );
  }
  if (isLoading) return null;
  if (isError && !status)
    return (
      <div className="border-b border-rule bg-paper text-[13px]">
        <p className="mx-auto max-w-[1440px] px-4 md:px-8 py-2">
          <span className="text-pen font-semibold">▲ Status unavailable.</span>{" "}
          <button type="button" className="ink-link" onClick={onRetry} data-testid="button-retry-status">Ask again</button>
        </p>
      </div>
    );
  return null;
}
