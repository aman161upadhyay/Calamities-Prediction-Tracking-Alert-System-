import { config } from "./config";

export class HttpError extends Error {
  constructor(public status: number, public url: string, public bodySnippet: string) {
    super(`HTTP ${status} from ${url}: ${bodySnippet.slice(0, 200)}`);
  }
}

export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 20_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": config.userAgent, ...(rest.headers ?? {}) },
    });
    if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const { timeoutMs = 20_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal, headers: { "user-agent": config.userAgent, ...(rest.headers ?? {}) } });
    if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
