import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { placesTable } from "./places";

/** Hourly aggregate per place, hazard and scenario ('' = live). */
export const signalsHourlyTable = pgTable(
  "signals_hourly",
  {
    id: serial("id").primaryKey(),
    placeId: integer("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
    hazard: text("hazard").notNull(),
    hourUtc: timestamp("hour_utc", { withTimezone: true }).notNull(),
    scenario: text("scenario").notNull().default(""),
    nPosts: integer("n_posts").notNull().default(0),
    nRelevant: integer("n_relevant").notNull().default(0),
    fearMass: real("fear_mass").notNull().default(0),
    angerMass: real("anger_mass").notNull().default(0),
    sadnessMass: real("sadness_mass").notNull().default(0),
    optimismMass: real("optimism_mass").notNull().default(0),
    meanSentiment: real("mean_sentiment"),
    baselineMedian: real("baseline_median"),
    baselineMad: real("baseline_mad"),
    zScore: real("z_score"),
    level: text("level").notNull().default("insufficient"),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("signals_series_hour_idx").on(t.placeId, t.hazard, t.scenario, t.hourUtc),
    index("signals_hour_idx").on(t.scenario, t.hourUtc),
  ],
);

export type SignalHourly = typeof signalsHourlyTable.$inferSelect;
export type InsertSignalHourly = typeof signalsHourlyTable.$inferInsert;
