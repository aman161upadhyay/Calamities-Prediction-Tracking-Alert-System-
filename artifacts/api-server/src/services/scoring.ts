import { db, modelRunsTable, postPlacesTable, postScoresTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { mlScore } from "../ml/client";
import { upsertPlaces } from "./places";

const CHUNK = 64;

interface PendingPost {
  id: number;
  text: string;
}

export interface ScoreOptions {
  scenario: string;
  limit: number;
  /** Replay posts with no resolvable place are attached to the scenario's anchor place with low confidence. */
  fallbackPlaceId?: number | null;
  onProgress?: (done: number, total: number) => void | Promise<void>;
}

/** Score posts that have no model output yet. Returns how many were scored. */
export async function scorePending(opts: ScoreOptions): Promise<number> {
  const pending = await db.execute<PendingPost & Record<string, unknown>>(sql`
    select p.id, p.text from posts p
    left join post_scores s on s.post_id = p.id
    where s.post_id is null and p.scenario = ${opts.scenario}
    order by p.id
    limit ${opts.limit}
  `);
  const rows = pending.rows;
  if (rows.length === 0) return 0;
  const [run] = await db.insert(modelRunsTable).values({ modelVersion: "pending", status: "running" }).returning({ id: modelRunsTable.id });
  let scored = 0;
  let version = "unknown";
  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const res = await mlScore(chunk.map((r) => ({ id: String(r.id), text: r.text })));
      version = res.modelVersion;
      const placeIds = await upsertPlaces(res.results.flatMap((r) => r.places));
      const scoreValues = res.results.map((r) => ({
        postId: Number(r.id),
        modelVersion: res.modelVersion,
        pRelevant: r.pRelevant,
        hazard: r.hazard,
        hazardProbs: r.hazardProbs,
        hazardMethod: r.hazardMethod,
        emotions: r.emotions,
        pFear: r.pFear,
        pAnger: r.pAnger,
        pSadness: r.pSadness,
        sentiment: r.sentiment,
        sentimentScore: r.sentimentScore,
        scoredAt: new Date(),
      }));
      const placeValues: (typeof postPlacesTable.$inferInsert)[] = [];
      for (const r of res.results) {
        const postId = Number(r.id);
        if (r.places.length === 0 && opts.fallbackPlaceId) {
          placeValues.push({ postId, placeId: opts.fallbackPlaceId, confidence: 0.3, method: "scenario", mention: null });
          continue;
        }
        for (const p of r.places) {
          const placeId = placeIds.get(p.key);
          if (placeId) placeValues.push({ postId, placeId, confidence: p.confidence, method: p.method, mention: p.mention });
        }
      }
      await db.transaction(async (tx) => {
        await tx
          .insert(postScoresTable)
          .values(scoreValues)
          .onConflictDoUpdate({
            target: postScoresTable.postId,
            set: {
              modelVersion: sql`excluded.model_version`,
              pRelevant: sql`excluded.p_relevant`,
              hazard: sql`excluded.hazard`,
              hazardProbs: sql`excluded.hazard_probs`,
              hazardMethod: sql`excluded.hazard_method`,
              emotions: sql`excluded.emotions`,
              pFear: sql`excluded.p_fear`,
              pAnger: sql`excluded.p_anger`,
              pSadness: sql`excluded.p_sadness`,
              sentiment: sql`excluded.sentiment`,
              sentimentScore: sql`excluded.sentiment_score`,
              scoredAt: sql`excluded.scored_at`,
            },
          });
        if (placeValues.length) {
          await tx.insert(postPlacesTable).values(placeValues).onConflictDoNothing({ target: [postPlacesTable.postId, postPlacesTable.placeId] });
        }
      });
      scored += chunk.length;
      await opts.onProgress?.(scored, rows.length);
    }
    await db.update(modelRunsTable).set({ finishedAt: new Date(), postsScored: scored, status: "ok", modelVersion: version }).where(eq(modelRunsTable.id, run!.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, scored }, "scoring failed");
    await db.update(modelRunsTable).set({ finishedAt: new Date(), postsScored: scored, status: "error", detail: message.slice(0, 500), modelVersion: version }).where(eq(modelRunsTable.id, run!.id));
    throw err;
  }
  return scored;
}
