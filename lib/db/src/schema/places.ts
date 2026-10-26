import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

/** A resolved location: a city from GeoNames, a curated region, or a country. */
export const placesTable = pgTable(
  "places",
  {
    id: serial("id").primaryKey(),
    /** Stable gazetteer key, e.g. "geonames:1275339", "region:in-kl", "country:IN". */
    key: text("key").notNull(),
    name: text("name").notNull(),
    admin1: text("admin1"),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    lat: real("lat").notNull(),
    lon: real("lon").notNull(),
    population: integer("population"),
    /** city | region | country */
    kind: text("kind").notNull().default("city"),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("places_key_idx").on(t.key)],
);

export type Place = typeof placesTable.$inferSelect;
export type InsertPlace = typeof placesTable.$inferInsert;
