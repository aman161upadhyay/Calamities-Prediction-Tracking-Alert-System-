import { randomBytes } from "node:crypto";
import { db, placesTable, subscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { config } from "../lib/config";
import { hazardMeta } from "../lib/hazards";
import { emailConfigured, sendEmail } from "../services/notify";
import { ApiError } from "./common";

interface Input {
  email: string;
  placeId?: number | null;
  hazard?: string | null;
  minLevel: string;
}

export async function createSubscription(input: Input) {
  const email = input.email.trim().toLowerCase();
  if (input.placeId) {
    const [place] = await db.select({ id: placesTable.id }).from(placesTable).where(eq(placesTable.id, input.placeId)).limit(1);
    if (!place) throw new ApiError(400, "Unknown place");
  }
  const existing = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, email), eq(subscriptionsTable.status, "verified")));
  const duplicate = existing.find((s) => (s.placeId ?? null) === (input.placeId ?? null) && (s.hazard ?? null) === (input.hazard ?? null));
  if (duplicate) return { id: duplicate.id, status: "verified" as const, message: "This address already has a verified subscription with the same filters." };

  const token = randomBytes(24).toString("hex");
  const scopeText = [input.placeId ? "one place" : "all places", input.hazard ? hazardMeta(input.hazard).label.toLowerCase() : "all hazards", `${input.minLevel} and above`].join(", ");
  if (!emailConfigured()) {
    const [row] = await db.insert(subscriptionsTable).values({ email, placeId: input.placeId ?? null, hazard: input.hazard ?? null, minLevel: input.minLevel, status: "verified", token, verifiedAt: new Date() }).returning({ id: subscriptionsTable.id });
    return { id: row!.id, status: "verified" as const, message: `Saved (${scopeText}). Email delivery is not configured on this deployment, so alerts are recorded against your subscription but no message is sent.` };
  }
  const [row] = await db.insert(subscriptionsTable).values({ email, placeId: input.placeId ?? null, hazard: input.hazard ?? null, minLevel: input.minLevel, status: "pending", token }).returning({ id: subscriptionsTable.id });
  const verifyUrl = `${config.publicBaseUrl}/subscribe/verify?token=${token}`;
  const result = await sendEmail(email, "Confirm your Calamity Watch subscription", [`Confirm this subscription (${scopeText}):`, verifyUrl, "", "Calamity Watch is experimental and not an official warning source.", "If you did not ask for this, ignore this message."].join("\n"));
  if (!result.ok) throw new ApiError(502, `Could not send the confirmation email: ${result.detail}`);
  return { id: row!.id, status: "pending_verification" as const, message: `Check ${email} for a confirmation link.` };
}

export async function verifySubscription(token: string) {
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.token, token)).limit(1);
  if (!sub) return { id: null, status: "invalid" as const, message: "This confirmation link is not valid." };
  if (sub.status === "removed") return { id: sub.id, status: "removed" as const, message: "This subscription was removed." };
  if (sub.status !== "verified") await db.update(subscriptionsTable).set({ status: "verified", verifiedAt: new Date() }).where(eq(subscriptionsTable.id, sub.id));
  return { id: sub.id, status: "verified" as const, message: "Subscription confirmed." };
}

export async function unsubscribe(token: string) {
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.token, token)).limit(1);
  if (!sub) return { id: null, status: "invalid" as const, message: "This link is not valid." };
  await db.update(subscriptionsTable).set({ status: "removed", removedAt: new Date() }).where(eq(subscriptionsTable.id, sub.id));
  return { id: sub.id, status: "removed" as const, message: "You will not receive further messages." };
}
