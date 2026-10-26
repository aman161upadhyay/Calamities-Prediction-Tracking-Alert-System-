import { db, notificationsTable, placesTable, subscriptionsTable, type Alert } from "@workspace/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { config } from "../lib/config";
import { hazardMeta, levelRank } from "../lib/hazards";
import { logger } from "../lib/logger";

export function emailConfigured(): boolean {
  return Boolean(config.resendApiKey && config.alertFromEmail);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<{ ok: boolean; detail: string }> {
  if (!emailConfigured()) return { ok: false, detail: "Email delivery is not configured (RESEND_API_KEY and ALERT_FROM_EMAIL)." };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${config.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: config.alertFromEmail, to: [to], subject, text }),
  });
  if (!res.ok) return { ok: false, detail: `Resend returned HTTP ${res.status}` };
  return { ok: true, detail: "sent" };
}

/** Email verified subscribers whose filters match a newly opened or raised live alert. One message per alert. */
export async function notifySubscribers(alerts: Alert[]): Promise<void> {
  for (const alert of alerts) {
    if (alert.scenario !== "") continue;
    const subs = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.status, "verified"),
          or(isNull(subscriptionsTable.placeId), eq(subscriptionsTable.placeId, alert.placeId)),
          or(isNull(subscriptionsTable.hazard), eq(subscriptionsTable.hazard, alert.hazard)),
        ),
      );
    const eligible = subs.filter((s) => levelRank(alert.currentLevel) >= levelRank(s.minLevel));
    if (eligible.length === 0) continue;
    const already = new Set(
      (await db.select({ subscriptionId: notificationsTable.subscriptionId }).from(notificationsTable).where(and(eq(notificationsTable.alertId, alert.id), inArray(notificationsTable.subscriptionId, eligible.map((s) => s.id))))).map((n) => n.subscriptionId),
    );
    const [place] = await db.select().from(placesTable).where(eq(placesTable.id, alert.placeId)).limit(1);
    const label = hazardMeta(alert.hazard).label;
    for (const sub of eligible) {
      if (already.has(sub.id)) continue;
      const url = `${config.publicBaseUrl}/alerts/${alert.id}`;
      const text = [
        `Calamity Watch (experimental, not an official warning source)`,
        ``,
        `${label} signal for ${place?.name ?? "a tracked place"} is ${alert.currentLevel}.`,
        alert.summary,
        ``,
        `Details: ${url}`,
        `Unsubscribe: ${config.publicBaseUrl}/subscribe/unsubscribe?token=${sub.token}`,
      ].join("\n");
      const result = emailConfigured() ? await sendEmail(sub.email, `${label} signal ${alert.currentLevel} for ${place?.name ?? "a tracked place"}`, text) : { ok: false, detail: "Email delivery is not configured; notification recorded only." };
      await db.insert(notificationsTable).values({ subscriptionId: sub.id, alertId: alert.id, channel: "email", status: result.ok ? "sent" : "skipped", detail: result.detail }).onConflictDoNothing();
      logger.info({ alertId: alert.id, subscriptionId: sub.id, status: result.ok ? "sent" : "skipped" }, "notification");
    }
  }
}
