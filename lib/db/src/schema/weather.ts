import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { placesTable } from "./places";

/** Open-Meteo context for featured places, refreshed every 6 hours. */
export const weatherSnapshotsTable = pgTable(
  "weather_snapshots",
  {
    id: serial("id").primaryKey(),
    placeId: integer("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    riverDischargeM3s: real("river_discharge_m3s"),
    riverDischargeMax7dM3s: real("river_discharge_max7d_m3s"),
    precipitationNext72hMm: real("precipitation_next72h_mm"),
    tempMaxNext72hC: real("temp_max_next72h_c"),
    windGustMaxNext72hKmh: real("wind_gust_max_next72h_kmh"),
  },
  (t) => [index("weather_place_idx").on(t.placeId, t.fetchedAt)],
);

export type WeatherSnapshot = typeof weatherSnapshotsTable.$inferSelect;
