import { db, placesTable, postPlacesTable, postScoresTable, postsTable, type Post, type PostScore } from "@workspace/db";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { mapPost, type PostPlaceRef, type Scope } from "./common";

export async function postsWithPlaces(rows: { post: Post; score: PostScore }[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.post.id);
  const placeRows = await db
    .select({ postId: postPlacesTable.postId, placeId: postPlacesTable.placeId, confidence: postPlacesTable.confidence, method: postPlacesTable.method, name: placesTable.name, country: placesTable.country })
    .from(postPlacesTable)
    .innerJoin(placesTable, eq(placesTable.id, postPlacesTable.placeId))
    .where(inArray(postPlacesTable.postId, ids));
  const byPost = new Map<number, PostPlaceRef[]>();
  for (const p of placeRows) {
    const list = byPost.get(p.postId) ?? [];
    list.push({ placeId: p.placeId, name: p.name, country: p.country, confidence: Math.round(p.confidence * 100) / 100, method: p.method });
    byPost.set(p.postId, list);
  }
  return rows.map((r) => mapPost(r.post, r.score, (byPost.get(r.post.id) ?? []).sort((a, b) => b.confidence - a.confidence)));
}

export interface PostFilters {
  hazard?: string;
  placeId?: number;
  source?: string;
  minRelevance: number;
  limit: number;
  /** Only posts newer than this (used for "recent" lists). */
  since?: Date;
}

export async function listPosts(scope: Scope, f: PostFilters) {
  const conds = [eq(postsTable.scenario, scope.scenario), lte(postsTable.createdAt, scope.asOf), gte(postScoresTable.pRelevant, f.minRelevance)];
  if (f.hazard) conds.push(eq(postScoresTable.hazard, f.hazard));
  if (f.source) conds.push(eq(postsTable.source, f.source));
  if (f.since) conds.push(gte(postsTable.createdAt, f.since));
  if (f.placeId) conds.push(sql`exists (select 1 from post_places pp where pp.post_id = ${postsTable.id} and pp.place_id = ${f.placeId})`);
  const rows = await db
    .select({ post: postsTable, score: postScoresTable })
    .from(postsTable)
    .innerJoin(postScoresTable, eq(postScoresTable.postId, postsTable.id))
    .where(and(...conds))
    .orderBy(desc(postsTable.createdAt))
    .limit(f.limit);
  return postsWithPlaces(rows);
}
