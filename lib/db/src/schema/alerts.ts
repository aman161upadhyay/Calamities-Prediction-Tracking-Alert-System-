import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { placesTable } from "./places";
import { officialEventsTable } from "./official-events";

export const alertsTable = pgTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    placeId: integer("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
    hazard: text("hazard").notNull(),
    scenario: text("scenario").notNull().default(""),
    /** open | closed */
    status: text("status").notNull().default("open"),
    peakLevel: text("peak_level").notNull(),
    currentLevel: text("current_level").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    peakZ: real("peak_z").notNull(),
    peakAt: timestamp("peak_at", { withTimezone: true }).notNull(),
    /** Relevant posts in the peak hour, so the summary's count and z-score describe the same hour. */
    peakN: integer("peak_n"),
    postCount: integer("post_count").notNull().default(0),
    summary: text("summary").notNull().default(""),
    /** corroborated | uncorroborated | pending */
    corroborationState: text("corroboration_state").notNull().default("pending"),
    officialEventId: integer("official_event_id").references(() => officialEventsTable.id, { onDelete: "set null" }),
    leadMinutes: integer("lead_minutes"),
    /** Consecutive low hours since the last elevated hour; used for hysteresis. */
    lowStreak: integer("low_streak").notNull().default(0),
    lastHourUtc: timestamp("last_hour_utc", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alerts_status_idx").on(t.scenario, t.status, t.openedAt),
    index("alerts_place_idx").on(t.placeId, t.hazard),
  ],
);

export type Alert = typeof alertsTable.$inferSelect;
export type InsertAlert = typeof alertsTable.$inferInsert;

export const alertEventsTable = pgTable(
  "alert_events",
  {
    id: serial("id").primaryKey(),
    alertId: integer("alert_id").notNull().references(() => alertsTable.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull(),
    /** opened | level_changed | corroborated | closed | notified */
    type: text("type").notNull(),
    detail: text("detail").notNull(),
  },
  (t) => [index("alert_events_alert_idx").on(t.alertId, t.at)],
);

export type AlertEvent = typeof alertEventsTable.$inferSelect;
export type InsertAlertEvent = typeof alertEventsTable.$inferInsert;
