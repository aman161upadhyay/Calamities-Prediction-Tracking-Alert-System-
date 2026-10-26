import { ApiError } from "./common";
import { HOUR_MS, floorHour } from "../lib/time";
import { SCENARIOS, preparationInProgress, prepareScenario, scenarioById, scenarioSpan, scenarioStates, type ScenarioDefinition } from "../services/replay";

const spanCache = new Map<string, { startsAt: Date; endsAt: Date; postCount: number }>();

async function describe(def: ScenarioDefinition, states: Awaited<ReturnType<typeof scenarioStates>>) {
  const st = states.get(def.id);
  let span = spanCache.get(def.id);
  if (!span || st?.state !== "ready") {
    span = await scenarioSpan(def);
    if (st?.state === "ready") spanCache.set(def.id, span);
  }
  const state = preparationInProgress(def.id, st) ? "preparing" : st?.state === "preparing" ? "failed" : (st?.state as "not_prepared" | "ready" | "failed" | undefined) ?? "not_prepared";
  return {
    id: def.id,
    name: def.name,
    hazard: def.hazard,
    region: def.region,
    country: def.country,
    lat: def.lat,
    lon: def.lon,
    startsAt: span.startsAt.toISOString(),
    // The replay clock runs to the hour boundary after the last post: the detector reads that final hour as complete,
    // so an alert can open exactly there and the player must be able to reach it.
    endsAt: new Date(floorHour(span.endsAt).getTime() + HOUR_MS).toISOString(),
    postCount: span.postCount,
    state,
    progress: state === "preparing" ? st?.progress ?? 0 : state === "ready" ? 1 : null,
    description: def.description,
    datasetSource: def.datasetSource,
    keyMoments: def.moments.map((m) => ({ at: new Date(m.at).toISOString(), label: m.label })),
    alertsOpened: st?.alertsOpened ?? null,
    firstAlertAt: st?.firstAlertAt ? st.firstAlertAt.toISOString() : null,
  };
}

export async function listScenarios() {
  const states = await scenarioStates();
  return Promise.all(SCENARIOS.map((d) => describe(d, states)));
}

export async function getScenario(id: string) {
  const def = scenarioById(id);
  if (!def) throw new ApiError(404, "Scenario not found");
  return describe(def, await scenarioStates());
}

export async function startScenario(id: string) {
  const def = scenarioById(id);
  if (!def) throw new ApiError(404, "Scenario not found");
  const states = await scenarioStates();
  const st = states.get(id);
  // Idempotent for a ready scenario: nothing is deleted or rebuilt from this path.
  if (st?.state !== "ready" && !preparationInProgress(id, st)) void prepareScenario(id);
  return describe(def, await scenarioStates());
}
