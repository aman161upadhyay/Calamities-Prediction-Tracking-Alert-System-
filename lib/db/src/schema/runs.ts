import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

/** One ingestion run for one source. */
export const ingestRunsTable = pgTable(
  "ingest_runs",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    /** ok | error | skipped */
    status: text("status").notNull().default("ok"),
    requests: integer("requests").notNull().default(0),
    itemsFetched: integer("items_fetched").notNull().default(0),
    itemsNew: integer("items_new").notNull().default(0),
    costEstimateUsd: real("cost_estimate_usd"),
    detail: text("detail"),
  },
  (t) => [index("ingest_runs_source_idx").on(t.source, t.startedAt)],
);

export type IngestRun = typeof ingestRunsTable.$inferSelect;

/** One scoring batch sent to the model service. */
export const modelRunsTable = pgTable("model_runs", {
  id: serial("id").primaryKey(),
  modelVersion: text("model_version").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  postsScored: integer("posts_scored").notNull().default(0),
  status: text("status").notNull().default("ok"),
  detail: text("detail"),
});

/** Current health of each source and feed, written by the scheduler. */
export const sourceStateTable = pgTable("source_state", {
  name: text("name").primaryKey(),
  /** ok | offline | not_configured | budget_reached | error | idle */
  state: text("state").notNull().default("idle"),
  detail: text("detail").notNull().default(""),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SourceState = typeof sourceStateTable.$inferSelect;

/** Preparation state for a replay scenario; the scenario definition lives in code. */
export const replayScenarioStateTable = pgTable("replay_scenario_state", {
  id: text("id").primaryKey(),
  /** not_prepared | preparing | ready | failed */
  state: text("state").notNull().default("not_prepared"),
  progress: real("progress"),
  postCount: integer("post_count").notNull().default(0),
  alertsOpened: integer("alerts_opened"),
  firstAlertAt: timestamp("first_alert_at", { withTimezone: true }),
  error: text("error"),
  preparedAt: timestamp("prepared_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReplayScenarioState = typeof replayScenarioStateTable.$inferSelect;
