import { db, postsTable } from "@workspace/db";
import { config } from "../../lib/config";
import { HAZARDS } from "../../lib/hazards";
import { HttpError, fetchJson } from "../../lib/http";
import { fmtUtc, utcDayStart } from "../../lib/time";
import { lastSuccessfulRun, runSource, runsSince, setSourceState } from "../sources";
import { hashAuthor } from "./bluesky";

interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  lang?: string;
  author_id?: string;
}

interface XSearchResponse {
  data?: XTweet[];
  meta?: { result_count?: number; newest_id?: string };
}

export interface XBudget {
  configured: boolean;
  dailyUsd: number;
  spentTodayUsd: number;
  postsReadToday: number;
  requestsToday: number;
}

export async function xBudgetStatus(): Promise<XBudget> {
  const today = await runsSince("x", utcDayStart(new Date()));
  return {
    configured: Boolean(config.xBearerToken),
    dailyUsd: config.xDailyBudgetUsd,
    spentTodayUsd: Math.round(Number(today.cost) * 10_000) / 10_000,
    postsReadToday: Number(today.items),
    requestsToday: Number(today.requests),
  };
}

/**
 * X recent search, capped by a daily budget. Pricing is pay-per-use on X's self-serve tiers, so the spend
 * here is an estimate: posts read times X_COST_PER_POST_USD.
 */
export async function ingestX(): Promise<void> {
  if (!config.xBearerToken) {
    await setSourceState("x", "not_configured", "Add X_BEARER_TOKEN to read from X. Bluesky is the live source until then.", false);
    return;
  }
  const budget = await xBudgetStatus();
  const remaining = budget.dailyUsd - budget.spentTodayUsd;
  const perHazard = Math.floor(remaining / config.xCostPerPostUsd / HAZARDS.length);
  if (perHazard < 10) {
    await setSourceState("x", "budget_reached", `Daily budget of $${budget.dailyUsd.toFixed(2)} reached at ${fmtUtc(new Date())}; resumes at 00:00 UTC`, false);
    return;
  }
  const maxResults = Math.min(50, perHazard);
  await runSource("x", async () => {
    const last = await lastSuccessfulRun("x");
    const startTime = new Date(Math.max(last ? last.startedAt.getTime() - 5 * 60_000 : Date.now() - 2 * 3_600_000, Date.now() - 6 * 24 * 3_600_000));
    let requests = 0;
    let fetched = 0;
    let inserted = 0;
    for (const hazard of HAZARDS) {
      const query = `(${hazard.search.map((s) => (s.includes(" ") ? `"${s}"` : s)).join(" OR ")}) -is:retweet lang:en`;
      const params = new URLSearchParams({
        query,
        max_results: String(maxResults),
        "tweet.fields": "created_at,lang,author_id",
        start_time: new Date(Math.min(startTime.getTime(), Date.now() - 30_000)).toISOString(),
      });
      requests += 1;
      let data: XSearchResponse;
      try {
        data = await fetchJson<XSearchResponse>(`https://api.x.com/2/tweets/search/recent?${params}`, {
          headers: { authorization: `Bearer ${config.xBearerToken}` },
          timeoutMs: 20_000,
        });
      } catch (err) {
        if (err instanceof HttpError) {
          const reason =
            err.status === 401 ? "X rejected the bearer token (401)" :
            err.status === 403 ? "This X token's access level does not include recent search (403)" :
            err.status === 429 ? "X rate limit reached (429); the next run will retry" :
            `X returned HTTP ${err.status}`;
          throw new Error(reason);
        }
        throw err;
      }
      const values = (data.data ?? []).map((t) => ({
        source: "x",
        externalId: t.id,
        url: `https://x.com/i/web/status/${t.id}`,
        text: t.text,
        lang: t.lang ?? "en",
        createdAt: t.created_at ? new Date(t.created_at) : new Date(),
        authorHash: t.author_id ? hashAuthor(t.author_id) : null,
        scenario: "",
        queryHazard: hazard.id,
      }));
      fetched += values.length;
      if (values.length) {
        const rows = await db.insert(postsTable).values(values).onConflictDoNothing({ target: [postsTable.source, postsTable.externalId] }).returning({ id: postsTable.id });
        inserted += rows.length;
      }
    }
    const cost = fetched * config.xCostPerPostUsd;
    return {
      requests,
      itemsFetched: fetched,
      itemsNew: inserted,
      costEstimateUsd: cost,
      stateDetail: `${inserted} new posts; about $${(budget.spentTodayUsd + cost).toFixed(2)} of $${budget.dailyUsd.toFixed(2)} used today`,
    };
  });
}
