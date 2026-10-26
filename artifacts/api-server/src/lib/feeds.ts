/** Display names for official-event feeds as stored in official_events.feed. */
export const FEED_LABELS: Record<string, string> = {
  gdacs: "GDACS",
  usgs: "USGS",
  nws: "NWS",
  firms: "NASA FIRMS",
  scenario: "Historical record",
};

export function feedLabel(feed: string): string {
  return FEED_LABELS[feed] ?? feed.toUpperCase();
}
