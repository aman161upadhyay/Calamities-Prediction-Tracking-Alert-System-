import type { NextFunction, Request, Response } from "express";

/**
 * A fixed-window limiter per client address, in memory. Enough for a single-process research deployment; it is meant to
 * stop a script from testing subscriptions or hammering the classifier, not to survive a distributed flood.
 */
export function rateLimit({ windowMs, max, what }: { windowMs: number; max: number; what: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: `Too many ${what} from this address; try again in ${Math.ceil((entry.resetAt - now) / 60_000)} min.` });
      return;
    }
    next();
  };
}
