import { createHash } from "node:crypto";
import { db, postsTable } from "@workspace/db";
import { config } from "../../lib/config";
import { HAZARDS } from "../../lib/hazards";
import { fetchJson } from "../../lib/http";
import { logger } from "../../lib/logger";
import { lastSuccessfulRun, runSource } from "../sources";

interface BskyPost {
  uri: string;
  author: { did: string; handle: string };
  record: { text?: string; createdAt?: string; langs?: string[] };
}

interface SearchResponse {
  posts: BskyPost[];
  cursor?: string;
}

export function hashAuthor(id: string): string {
  return createHash("sha256").update(`${config.authorHashSalt}:${id}`).digest("hex").slice(0, 16);
}

/** Public Bluesky search (no credentials). One request per hazard search term, newest first. */
export async function ingestBluesky(): Promise<void> {
  await runSource("bluesky", async () => {
    const last = await lastSuccessfulRun("bluesky");
    const since = new Date((last ? last.startedAt.getTime() : Date.now() - 2 * 3_600_000) - 10 * 60_000);
    let requests = 0;
    let fetched = 0;
    let inserted = 0;
    const seen = new Set<string>();
    for (const hazard of HAZARDS) {
      for (const term of hazard.search) {
        const params = new URLSearchParams({ q: term, limit: "100", sort: "latest", lang: "en", since: since.toISOString() });
        requests += 1;
        let data: SearchResponse;
        try {
          data = await fetchJson<SearchResponse>(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?${params}`, { timeoutMs: 15_000 });
        } catch (err) {
          logger.warn({ term, err: err instanceof Error ? err.message : err }, "bluesky search failed");
          continue;
        }
        const values = [];
        for (const p of data.posts ?? []) {
          const text = p.record?.text?.trim();
          const createdAt = p.record?.createdAt ? new Date(p.record.createdAt) : null;
          if (!text || !createdAt || Number.isNaN(createdAt.getTime()) || seen.has(p.uri)) continue;
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
        }
      }
    }
    return { requests, itemsFetched: fetched, itemsNew: inserted, detail: `since ${since.toISOString()}` };
  });
}
