export const HOUR_MS = 3_600_000;

export function floorHour(d: Date): Date {
  return new Date(Math.floor(d.getTime() / HOUR_MS) * HOUR_MS);
}
export function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * HOUR_MS);
}
export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}
export function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}
export function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
export function fmtUtc(d: Date): string {
  return d.toISOString().slice(11, 16) + " UTC";
}
