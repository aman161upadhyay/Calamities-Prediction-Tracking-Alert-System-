import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { placesTable } from "./places";

/** A public post fetched from a source. Author handles are never stored, only a salted hash. */
export const postsTable = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    /** x | bluesky | replay */
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url"),
    text: text("text").notNull(),
    lang: text("lang"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    authorHash: text("author_hash"),
    /** Replay scenario id, or '' for live data. */
    scenario: text("scenario").notNull().default(""),
    /** Hazard keyword set that found this post (search context), may be null. */
    queryHazard: text("query_hazard"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("posts_source_external_idx").on(t.source, t.externalId),
    index("posts_created_at_idx").on(t.createdAt),
    index("posts_scenario_created_idx").on(t.scenario, t.createdAt),
  ],
);

export type Post = typeof postsTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;

/** Model output for one post. One row per post; re-scoring overwrites. */
export const postScoresTable = pgTable(
  "post_scores",
  {
    postId: integer("post_id").primaryKey().references(() => postsTable.id, { onDelete: "cascade" }),
    modelVersion: text("model_version").notNull(),
    pRelevant: real("p_relevant").notNull(),
    hazard: text("hazard").notNull(),
    hazardProbs: jsonb("hazard_probs").$type<Record<string, number>>().notNull(),
    /** How the hazard label was chosen: model | keyword */
    hazardMethod: text("hazard_method").notNull().default("model"),
    emotions: jsonb("emotions").$type<Record<string, number>>().notNull(),
    pFear: real("p_fear").notNull(),
    pAnger: real("p_anger").notNull(),
    pSadness: real("p_sadness").notNull(),
    sentiment: text("sentiment").notNull(),
    sentimentScore: real("sentiment_score").notNull(),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("post_scores_hazard_idx").on(t.hazard, t.pRelevant)],
);

export type PostScore = typeof postScoresTable.$inferSelect;
export type InsertPostScore = typeof postScoresTable.$inferInsert;

/** Place resolutions for a post (a post can mention several places). */
export const postPlacesTable = pgTable(
  "post_places",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
    placeId: integer("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull(),
    /** ner_gazetteer | platform_geo | scenario */
    method: text("method").notNull(),
    mention: text("mention"),
  },
  (t) => [
    uniqueIndex("post_places_post_place_idx").on(t.postId, t.placeId),
    index("post_places_place_idx").on(t.placeId),
  ],
);

export type PostPlace = typeof postPlacesTable.$inferSelect;
export type InsertPostPlace = typeof postPlacesTable.$inferInsert;
