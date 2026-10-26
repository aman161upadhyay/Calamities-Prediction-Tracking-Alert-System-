import { config } from "./lib/config";
import { logger } from "./lib/logger";
import { HOUR_MS, floorHour } from "./lib/time";
import { mlHealth } from "./ml/client";
import { corroborateAlerts, runDetector } from "./services/detector";
import { ingestBluesky } from "./services/ingest/bluesky";
import { ingestX } from "./services/ingest/x";
import { notifySubscribers } from "./services/notify";
import { ingestOfficialFeeds } from "./services/official";
import { lastSuccessfulRun } from "./services/sources";
import { scorePending } from "./services/scoring";
import { rebuildSignals } from "./services/signals";
import { refreshWeather } from "./services/weather";

const TICK_MS = 15 * 60_000;
let ticking = false;

/** Score new live posts, refresh the last three hours of signals and run the detector. */
export async function processLive(): Promise<void> {
  const health = await mlHealth(0);
  if (!health?.ready) {
    logger.info("model service not ready; skipping scoring this tick");
    return;
  }
  let total = 0;
  for (let i = 0; i < 20; i++) {
    const n = await scorePending({ scenario: "", limit: 256 });
    total += n;
    if (n < 256) break;
  }
  const now = new Date();
  const currentHour = floorHour(now);
  const from = new Date(currentHour.getTime() - 2 * HOUR_MS);
  const rows = await rebuildSignals("", from, new Date(currentHour.getTime() + HOUR_MS));
  const outcome = await runDetector({ scenario: "", rows, firstIncompleteHour: currentHour, live: true });
  await corroborateAlerts("", now);
  await notifySubscribers([...outcome.opened, ...outcome.upgraded]);
  logger.info({ scored: total, series: rows.length, opened: outcome.opened.length, closed: outcome.closed }, "live tick processed");
}

export async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  const started = Date.now();
  try {
    await Promise.all([ingestBluesky(), ingestOfficialFeeds()]);
    const lastX = await lastSuccessfulRun("x");
    if (!lastX || Date.now() - lastX.startedAt.getTime() > 55 * 60_000) await ingestX();
    const lastWeather = await lastSuccessfulRun("openmeteo");
    if (!lastWeather || Date.now() - lastWeather.startedAt.getTime() > 6 * HOUR_MS) await refreshWeather();
    await processLive();
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "scheduler tick failed");
  } finally {
    ticking = false;
    logger.info({ ms: Date.now() - started }, "scheduler tick done");
  }
}

export function startScheduler(): void {
  if (!config.schedulerEnabled) {
    logger.warn("scheduler disabled (SCHEDULER=off)");
    return;
  }
  setTimeout(() => void tick(), 15_000);
  setInterval(() => void tick(), TICK_MS);
  // The model takes about a minute to load; score whatever arrived in the first tick once it is ready.
  setTimeout(() => void processLive().catch((err) => logger.error({ err }, "post-start scoring failed")), 150_000);
}
