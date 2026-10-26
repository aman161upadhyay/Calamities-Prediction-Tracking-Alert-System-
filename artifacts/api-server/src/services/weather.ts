import { db, placesTable, weatherSnapshotsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { fetchJson } from "../lib/http";
import { runSource } from "./sources";

interface FloodResponse {
  daily?: { time: string[]; river_discharge?: (number | null)[]; river_discharge_max?: (number | null)[] };
}
interface ForecastResponse {
  hourly?: { time: string[]; precipitation?: (number | null)[]; temperature_2m?: (number | null)[]; wind_gusts_10m?: (number | null)[] };
}

const max = (xs: (number | null)[] | undefined) => (xs && xs.some((x) => x !== null) ? Math.max(...xs.filter((x): x is number => x !== null)) : null);
const sum = (xs: (number | null)[] | undefined) => (xs ? xs.reduce<number>((s, x) => s + (x ?? 0), 0) : null);

/** Open-Meteo river discharge and 72 h forecast context for featured places. */
export async function refreshWeather(): Promise<void> {
  await runSource("openmeteo", async () => {
    const featured = await db.select().from(placesTable).where(eq(placesTable.featured, true));
    let requests = 0;
    let saved = 0;
    for (const place of featured) {
      const q = `latitude=${place.lat.toFixed(3)}&longitude=${place.lon.toFixed(3)}`;
      requests += 2;
      const [flood, forecast] = await Promise.all([
        fetchJson<FloodResponse>(`https://flood-api.open-meteo.com/v1/flood?${q}&daily=river_discharge,river_discharge_max&forecast_days=7`, { timeoutMs: 20_000 }).catch(() => null),
        fetchJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${q}&hourly=precipitation,temperature_2m,wind_gusts_10m&forecast_days=3`, { timeoutMs: 20_000 }).catch(() => null),
      ]);
      if (!flood && !forecast) continue;
      const hourly = forecast?.hourly;
      const next72 = (xs: (number | null)[] | undefined) => xs?.slice(0, 72);
      await db.insert(weatherSnapshotsTable).values({
        placeId: place.id,
        riverDischargeM3s: flood?.daily?.river_discharge?.[0] ?? null,
        riverDischargeMax7dM3s: max(flood?.daily?.river_discharge_max ?? flood?.daily?.river_discharge),
        precipitationNext72hMm: sum(next72(hourly?.precipitation)),
        tempMaxNext72hC: max(next72(hourly?.temperature_2m)),
        windGustMaxNext72hKmh: max(next72(hourly?.wind_gusts_10m)),
      });
      saved += 1;
    }
    return { requests, itemsFetched: saved, itemsNew: saved, stateDetail: `Forecast context for ${saved} featured places` };
  });
}

export async function latestWeather(placeId: number) {
  const rows = await db.select().from(weatherSnapshotsTable).where(eq(weatherSnapshotsTable.placeId, placeId)).orderBy(desc(weatherSnapshotsTable.fetchedAt)).limit(1);
  return rows[0] ?? null;
}
