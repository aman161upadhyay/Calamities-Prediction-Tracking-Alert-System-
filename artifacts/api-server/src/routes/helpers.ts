import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";
import { ApiError } from "../queries/common";

export type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Wrap an async handler: send the returned value as JSON, forward errors. */
export function handle(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res)
      .then((data) => {
        if (!res.headersSent) res.json(data);
      })
      .catch(next);
  };
}

export function parseWith<T extends ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(400, issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid input");
  }
  return result.data;
}

export function intParam(value: string | undefined, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, `${name} must be a positive integer`);
  return n;
}

/**
 * Validate query parameters other than the scope pair. The generated schemas type `asOf` as a Date, which a query
 * string can never satisfy, and `parseScope` already validates both `scenario` and `asOf`.
 */
export function parseQuery<T extends ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  const q = { ...(query as Record<string, unknown>) };
  delete q["asOf"];
  delete q["scenario"];
  return parseWith(schema, q);
}
