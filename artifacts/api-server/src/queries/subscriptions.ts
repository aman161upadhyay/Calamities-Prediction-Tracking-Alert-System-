import { randomBytes } from "node:crypto";
import { db, placesTable, subscriptionsTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
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
  // The schema checks the shape; the SMTP length limits are checked here so an impossible address is refused before it
  // is recorded as pending.
  const local = email.split("@")[0] ?? "";
  if (email.length > 254 || local.length > 64 || local.length === 0) throw new ApiError(400, "That email address cannot be delivered to: at most 254 characters, with at most 64 before the @");
  // Any non-null place id is checked, including values the schema's bounds let through, so an unknown place is a 400 and never an insert error.
  if (input.placeId != null) {
    if (!Number.isInteger(input.placeId) || input.placeId < 1 || input.placeId > 2147483647) throw new ApiError(400, "placeId must be a positive integer id of a tracked place");
    const [place] = await db.select({ id: placesTable.id }).from(placesTable).where(eq(placesTable.id, input.placeId)).limit(1);
    if (!place) throw new ApiError(400, "Unknown place");
  }
  const scopeText = [input.placeId != null ? "one place" : "all places", input.hazard ? hazardMeta(input.hazard).label.toLowerCase() : "all hazards", `${input.minLevel} and above`].join(", ");
  const existing = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, email), inArray(subscriptionsTable.status, ["verified", "pending"])));
  const duplicate = existing.find((s) => (s.placeId ?? null) === (input.placeId ?? null) && (s.hazard ?? null) === (input.hazard ?? null));
  const configured = emailConfigured();
  // The reply is the same whether this address was already subscribed or not, and carries no row id, so an anonymous
  // caller cannot learn who is subscribed to what by submitting addresses.
  const reply = (message: string) => ({ id: null, status: "pending_verification" as const, message, emailDeliveryConfigured: configured });
  if (!configured) {
    // Without an email provider nobody can prove they own the address, so the request stays pending and unverified.
    if (!duplicate) {
      await db.insert(subscriptionsTable).values({ email, placeId: input.placeId ?? null, hazard: input.hazard ?? null, minLevel: input.minLevel, status: "pending", token: randomBytes(24).toString("hex") });
    }
    return reply(`Recorded as pending (${scopeText}).`);
  }
  if (duplicate) {
    if (duplicate.status === "pending") {
      // Resend the original confirmation link rather than say that one exists.
      await sendEmail(email, "Confirm your Calamity Watch Post subscription", confirmationBody(scopeText, `${config.publicBaseUrl}/subscribe/verify?token=${duplicate.token}`));
    }
    return reply(`If ${email} is not already confirmed for these filters (${scopeText}), a confirmation link is on its way.`);
  }
  const token = randomBytes(24).toString("hex");
  await db.insert(subscriptionsTable).values({ email, placeId: input.placeId ?? null, hazard: input.hazard ?? null, minLevel: input.minLevel, status: "pending", token });
  const result = await sendEmail(email, "Confirm your Calamity Watch Post subscription", confirmationBody(scopeText, `${config.publicBaseUrl}/subscribe/verify?token=${token}`));
  if (!result.ok) throw new ApiError(502, `Could not send the confirmation email: ${result.detail}`);
  return reply(`If ${email} is not already confirmed for these filters (${scopeText}), a confirmation link is on its way.`);
}

function confirmationBody(scopeText: string, verifyUrl: string): string {
  return [`Confirm this subscription (${scopeText}):`, verifyUrl, "", "Calamity Watch Post is experimental and not an official warning source.", "If you did not ask for this, ignore this message."].join("\n");
}

export async function verifySubscription(token: string) {
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.token, token)).limit(1);
  const emailDeliveryConfigured = emailConfigured();
  if (!sub) return { id: null, status: "invalid" as const, message: "This confirmation link is not valid.", emailDeliveryConfigured };
  if (sub.status === "removed") return { id: sub.id, status: "removed" as const, message: "This subscription was removed.", emailDeliveryConfigured };
  if (sub.status !== "verified") await db.update(subscriptionsTable).set({ status: "verified", verifiedAt: new Date() }).where(eq(subscriptionsTable.id, sub.id));
  return { id: sub.id, status: "verified" as const, message: "Subscription confirmed.", emailDeliveryConfigured };
}

export async function unsubscribe(token: string) {
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.token, token)).limit(1);
  if (!sub) return { id: null, status: "invalid" as const, message: "This link is not valid.", emailDeliveryConfigured: emailConfigured() };
  await db.update(subscriptionsTable).set({ status: "removed", removedAt: new Date() }).where(eq(subscriptionsTable.id, sub.id));
  return { id: sub.id, status: "removed" as const, message: "You will not receive further messages.", emailDeliveryConfigured: emailConfigured() };
}
