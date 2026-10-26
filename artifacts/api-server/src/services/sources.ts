import { db, ingestRunsTable, sourceStateTable } from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { fmtUtc } from "../lib/time";

export type SourceStateName = "ok" | "offline" | "not_configured" | "budget_reached" | "error" | "idle";

export async function setSourceState(name: string, state: SourceStateName, detail: string, success = state === "ok"): Promise<void> {
  const now = new Date();
  await db
    .insert(sourceStateTable)
    .values({ name, state, detail, lastSuccessAt: success ? now : null, lastErrorAt: state === "error" || state === "offline" ? now : null, updatedAt: now })
    .onConflictDoUpdate({
      target: sourceStateTable.name,
      set: {
        state,
        detail,
        updatedAt: now,
        ...(success ? { lastSuccessAt: now } : {}),
        ...(state === "error" || state === "offline" ? { lastErrorAt: now } : {}),
      },
    });
}

export interface RunResult {
  requests: number;
  itemsFetched: number;
  itemsNew: number;
  costEstimateUsd?: number | null;
  detail?: string;
  /** Override the source state detail sentence. */
  stateDetail?: string;
}

/** Run one ingestion for a source, recording an ingest_runs row and the source health. */
export async function runSource(source: string, fn: () => Promise<RunResult>): Promise<RunResult | null> {
  const [run] = await db.insert(ingestRunsTable).values({ source, status: "ok" }).returning({ id: ingestRunsTable.id });
  try {
    const result = await fn();
    await db
      .update(ingestRunsTable)
      .set({
        finishedAt: new Date(),
        status: "ok",
        requests: result.requests,
        itemsFetched: result.itemsFetched,
        itemsNew: result.itemsNew,
        costEstimateUsd: result.costEstimateUsd ?? null,
        detail: result.detail ?? null,
      })
      .where(eq(ingestRunsTable.id, run!.id));
    await setSourceState(source, "ok", result.stateDetail ?? `${result.itemsNew} new of ${result.itemsFetched} fetched at ${fmtUtc(new Date())}`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ source, err: message }, "source run failed");
    await db.update(ingestRunsTable).set({ finishedAt: new Date(), status: "error", detail: message.slice(0, 500) }).where(eq(ingestRunsTable.id, run!.id));
    const offline = /ENOTFOUND|ECONNREFUSED|aborted|fetch failed|ETIMEDOUT/i.test(message);
    await setSourceState(source, offline ? "offline" : "error", (offline ? "Could not reach the source: " : "Last run failed: ") + message.slice(0, 160));
    return null;
  }
}

export async function lastSuccessfulRun(source: string) {
  const rows = await db
    .select()
    .from(ingestRunsTable)
    .where(and(eq(ingestRunsTable.source, source), eq(ingestRunsTable.status, "ok")))
    .orderBy(desc(ingestRunsTable.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function runsSince(source: string, since: Date) {
  const rows = await db
    .select({
      n: sql<number>`count(*)::int`,
      items: sql<number>`coalesce(sum(${ingestRunsTable.itemsFetched}), 0)::int`,
      requests: sql<number>`coalesce(sum(${ingestRunsTable.requests}), 0)::int`,
      cost: sql<number>`coalesce(sum(${ingestRunsTable.costEstimateUsd}), 0)::float8`,
      itemsNew: sql<number>`coalesce(sum(${ingestRunsTable.itemsNew}), 0)::int`,
    })
    .from(ingestRunsTable)
    .where(and(eq(ingestRunsTable.source, source), gte(ingestRunsTable.startedAt, since)));
  return rows[0]!;
}
