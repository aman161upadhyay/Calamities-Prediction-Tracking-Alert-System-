import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

/** Events from official feeds: gdacs | usgs | nws | firms | scenario */
export const officialEventsTable = pgTable(
  "official_events",
  {
    id: serial("id").primaryKey(),
    feed: text("feed").notNull(),
    externalId: text("external_id").notNull(),
    hazard: text("hazard").notNull(),
    title: text("title").notNull(),
    severity: text("severity").notNull().default(""),
    lat: real("lat"),
    lon: real("lon"),
    country: text("country"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    url: text("url"),
    scenario: text("scenario").notNull().default(""),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("official_feed_external_idx").on(t.feed, t.externalId),
    index("official_hazard_starts_idx").on(t.hazard, t.startsAt),
  ],
);

export type OfficialEvent = typeof officialEventsTable.$inferSelect;
export type InsertOfficialEvent = typeof officialEventsTable.$inferInsert;
