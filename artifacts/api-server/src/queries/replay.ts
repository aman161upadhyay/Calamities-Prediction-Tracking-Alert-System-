import { ApiError } from "./common";
import { SCENARIOS, isPreparing, prepareScenario, scenarioById, scenarioSpan, scenarioStates, type ScenarioDefinition } from "../services/replay";

const spanCache = new Map<string, { startsAt: Date; endsAt: Date; postCount: number }>();

async function describe(def: ScenarioDefinition, states: Awaited<ReturnType<typeof scenarioStates>>) {
  const st = states.get(def.id);
  let span = spanCache.get(def.id);
  if (!span || st?.state !== "ready") {
    span = await scenarioSpan(def);
    if (st?.state === "ready") spanCache.set(def.id, span);
  }
  const state = isPreparing(def.id) ? "preparing" : (st?.state as "not_prepared" | "preparing" | "ready" | "failed" | undefined) ?? "not_prepared";
  return {
    id: def.id,
    name: def.name,
    hazard: def.hazard,
    region: def.region,
    country: def.country,
    lat: def.lat,
    lon: def.lon,
    startsAt: span.startsAt.toISOString(),
    endsAt: span.endsAt.toISOString(),
    postCount: span.postCount,
    state: state === "preparing" && !isPreparing(def.id) ? "failed" : state,
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
  if (st?.state !== "ready" && !isPreparing(id)) void prepareScenario(id);
  return describe(def, await scenarioStates());
}
