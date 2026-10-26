/**
 * Operator command: rebuild replay scenarios (and, with --live, re-geoparse live posts) after a model or gazetteer
 * change. Forced rebuilds delete and renumber a scenario's alerts, so they are not reachable from the public API;
 * run this from the workspace shell while the API server (which owns the model service) is up, and do not restart
 * the API while it runs: the API reads this command's progress from the state row and reports the scenario as
 * preparing until it finishes.
 *
 *   pnpm --filter @workspace/api-server run replay:rebuild                 # every scenario
 *   pnpm --filter @workspace/api-server run replay:rebuild -- kerala-floods-2018 hurricane-harvey-2017
 *   pnpm --filter @workspace/api-server run replay:rebuild -- --live       # live posts only (last 10 days)
 *
 * With --live the live ledger is redone the way a forced scenario rebuild is: posts re-geoparsed, the hourly signals
 * rebuilt, the live alerts deleted and raised again from the completed hours, then corroborated. Live alert ids change.
 */
import { alertsTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { HOUR_MS, floorHour } from "../lib/time";
import { logger } from "../lib/logger";
import { mlHealth } from "../ml/client";
import { corroborateAlerts, runDetector } from "../services/detector";
import { SCENARIOS, prepareScenario, scenarioById, scenarioStates } from "../services/replay";
import { regeoparseScenario } from "../services/scoring";
import { rebuildSignals } from "../services/signals";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const live = args.includes("--live");
  const ids = args.filter((a) => !a.startsWith("--"));
  const unknown = ids.filter((id) => !scenarioById(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown scenario(s): ${unknown.join(", ")}. Known: ${SCENARIOS.map((s) => s.id).join(", ")}`);
  }
  const health = await mlHealth(0);
  if (!health?.ready) {
    throw new Error("The model service is not ready. Start the API server first; it launches the model service and this command talks to it.");
  }
  const targets = live && ids.length === 0 ? [] : ids.length > 0 ? ids : SCENARIOS.map((s) => s.id);
  for (const id of targets) {
    const started = Date.now();
    await prepareScenario(id, { force: true });
    const st = (await scenarioStates()).get(id);
    logger.info({ scenario: id, state: st?.state, alertsOpened: st?.alertsOpened, seconds: Math.round((Date.now() - started) / 1000) }, "scenario rebuilt");
    if (st?.state !== "ready") throw new Error(`Scenario ${id} ended in state ${st?.state ?? "unknown"}`);
  }
  if (live) {
    const n = await regeoparseScenario({ scenario: "" });
    const currentHour = floorHour(new Date());
    const from = new Date(currentHour.getTime() - 10 * 24 * HOUR_MS);
    await db.delete(alertsTable).where(eq(alertsTable.scenario, ""));
    const rows = await rebuildSignals("", from, currentHour);
    const outcome = await runDetector({ scenario: "", rows, firstIncompleteHour: currentHour, live: false });
    const corroborated = await corroborateAlerts("", new Date());
    logger.info({ regeoparsed: n, seriesHours: rows.length, opened: outcome.opened.length, closed: outcome.closed, corroborated }, "live posts re-geoparsed, signals and alerts rebuilt");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error({ err }, "replay rebuild failed");
    process.exit(1);
  });
