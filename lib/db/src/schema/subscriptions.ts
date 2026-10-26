import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { placesTable } from "./places";
import { alertsTable } from "./alerts";

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    placeId: integer("place_id").references(() => placesTable.id, { onDelete: "set null" }),
    hazard: text("hazard"),
    minLevel: text("min_level").notNull().default("elevated"),
    /** pending | verified | removed */
    status: text("status").notNull().default("pending"),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("subscriptions_token_idx").on(t.token), index("subscriptions_email_idx").on(t.email)],
);

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type InsertSubscription = typeof subscriptionsTable.$inferInsert;

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id").notNull().references(() => subscriptionsTable.id, { onDelete: "cascade" }),
    alertId: integer("alert_id").notNull().references(() => alertsTable.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"),
    /** sent | skipped | failed */
    status: text("status").notNull(),
    detail: text("detail"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("notifications_sub_alert_idx").on(t.subscriptionId, t.alertId)],
);

export type Notification = typeof notificationsTable.$inferSelect;
