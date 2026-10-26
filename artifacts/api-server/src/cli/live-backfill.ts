/**
 * Operator command: fill the live tape backwards. The scheduler only reads Bluesky forward from the moment the server
 * first ran, so a fresh deployment shows every hazard rising at the same hour (the hour ingest began) against an empty
 * baseline. This command pages the public Bluesky search back through the days before the first live post, with the
 * same per-term sampling as the scheduler (the search is exhausted window by window, so the history has the same
 * density as the hours the scheduler collects), scores what it fetched, rebuilds the hourly signals and runs the
 * detector over the completed hours so the live ledger carries the week's real alerts.
 *
 *   pnpm --filter @workspace/api-server run live:backfill -- --days 7
 *
 * Run it from the workspace shell while the API server (which owns the model service) is up. It is safe beside the
 * scheduler: post inserts and score upserts are idempotent, and the detector only reads completed hours.
 */
import { db, postsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { HAZARDS } from "../lib/hazards";
import { fetchJson, HttpError } from "../lib/http";
import { logger } from "../lib/logger";
import { HOUR_MS, floorHour } from "../lib/time";
import { mlHealth } from "../ml/client";
import { corroborateAlerts, runDetector } from "../services/detector";
import { hashAuthor } from "../services/ingest/bluesky";
import { scorePending } from "../services/scoring";
import { rebuildSignals } from "../services/signals";

interface BskyPost {
  uri: string;
  author: { did: string; handle: string };
  record: { text?: string; createdAt?: string; langs?: string[] };
}
interface SearchResponse {
  posts: BskyPost[];
  cursor?: string;
}

const WINDOW_MS = 6 * HOUR_MS;
const MIN_WINDOW_MS = 15 * 60_000; // the scheduler's own cadence; a quarter hour with 100 posts for one term is denser than anything the live tape keeps
const PAGE = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function searchOnce(term: string, since: Date, until: Date): Promise<BskyPost[] | null> {
  const params = new URLSearchParams({ q: term, limit: String(PAGE), sort: "latest", lang: "en", since: since.toISOString(), until: until.toISOString() });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await fetchJson<SearchResponse>(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?${params}`, { timeoutMs: 20_000 });
      return data.posts ?? [];
    } catch (err) {
      if (err instanceof HttpError && err.status === 429) {
        logger.warn({ term }, "bluesky rate limit; pausing 30 s");
        await sleep(30_000);
        continue;
      }
      logger.warn({ term, since, until, err: err instanceof Error ? err.message : err }, "bluesky window failed; skipping it");
      return null;
    }
  }
  return null;
}

/**
 * The public AppView answers the first page of a search but refuses its cursor (403, "administrative rules"), so depth
 * comes from narrowing the window instead of paging: a window that comes back full is split in half until each half
 * fits in one page or reaches a quarter hour.
 */
async function fetchWindow(term: string, since: Date, until: Date, stats: { requests: number }): Promise<BskyPost[]> {
  stats.requests += 1;
  const posts = await searchOnce(term, since, until);
  await sleep(100);
  if (!posts) return [];
  if (posts.length < PAGE || until.getTime() - since.getTime() <= MIN_WINDOW_MS) return posts;
  const mid = new Date((since.getTime() + until.getTime()) / 2);
  const [a, b] = [await fetchWindow(term, since, mid, stats), await fetchWindow(term, mid, until, stats)];
  return [...a, ...b];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const daysArg = args.indexOf("--days");
  const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 7;
  if (!Number.isFinite(days) || days <= 0 || days > 14) throw new Error("--days must be between 1 and 14");

  const health = await mlHealth(0);
  if (!health?.ready) throw new Error("The model service is not ready. Start the API server first; it launches the model service and this command talks to it.");

  // The tape is filled back from the first scheduler run, not from the oldest post it holds: a search sorted by latest
  // occasionally returns a post written days earlier, and anchoring on created_at would fill the wrong week.
  const first = await db.execute<{ first: Date | string | null }>(sql`select min(started_at) as first from ingest_runs where source = 'bluesky' and status = 'ok'`);
  const end = first.rows[0]?.first ? new Date(first.rows[0].first) : new Date();
  const start = new Date(end.getTime() - days * 24 * HOUR_MS);
  logger.info({ from: start.toISOString(), to: end.toISOString() }, "backfilling the live tape");

  let requests = 0;
  let fetched = 0;
  let inserted = 0;
  const seen = new Set<string>();
  for (const hazard of HAZARDS) {
    for (const term of hazard.search) {
      let termNew = 0;
      for (let t = start.getTime(); t < end.getTime(); t += WINDOW_MS) {
        const since = new Date(t);
        const until = new Date(Math.min(t + WINDOW_MS, end.getTime()));
        const stats = { requests: 0 };
        const posts = await fetchWindow(term, since, until, stats);
        requests += stats.requests;
        const values = [];
        for (const p of posts) {
          const text = p.record?.text?.trim();
          const createdAt = p.record?.createdAt ? new Date(p.record.createdAt) : null;
          if (!text || !createdAt || Number.isNaN(createdAt.getTime()) || seen.has(p.uri)) continue;
          if (createdAt < since || createdAt >= until) continue;
          seen.add(p.uri);
          fetched += 1;
          const rkey = p.uri.split("/").pop() ?? "";
          values.push({
            source: "bluesky",
            externalId: p.uri,
            url: `https://bsky.app/profile/${p.author.handle}/post/${rkey}`,
            text,
            lang: p.record.langs?.[0] ?? "en",
            createdAt,
            authorHash: hashAuthor(p.author.did),
            scenario: "",
            queryHazard: hazard.id,
          });
        }
        if (values.length) {
          const rows = await db.insert(postsTable).values(values).onConflictDoNothing({ target: [postsTable.source, postsTable.externalId] }).returning({ id: postsTable.id });
          inserted += rows.length;
          termNew += rows.length;
        }
      }
      logger.info({ term, new: termNew, requests }, "term backfilled");
    }
  }
  logger.info({ requests, fetched, inserted }, "fetch finished; scoring");

  let scored = 0;
  for (;;) {
    const n = await scorePending({ scenario: "", limit: 512 });
    scored += n;
    if (n > 0) logger.info({ scored }, "scoring progress");
    if (n < 512) break;
  }

  const currentHour = floorHour(new Date());
  const from = floorHour(start);
  const rows = await rebuildSignals("", from, currentHour);
  const outcome = await runDetector({ scenario: "", rows, firstIncompleteHour: currentHour, live: false });
  const corroborated = await corroborateAlerts("", new Date());
  logger.info({ scored, seriesHours: rows.length, opened: outcome.opened.length, closed: outcome.closed, corroborated }, "live tape backfilled");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error({ err }, "live backfill failed");
    process.exit(1);
  });
