import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find the repository root above ${start}`);
}

export const REPO_ROOT = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
export const ML_DIR = path.join(REPO_ROOT, "services", "ml");
export const ML_DATA_DIR = path.join(ML_DIR, "data");

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`${name} must be a number, got "${raw}"`);
  return n;
}

function firstDomain(): string | null {
  const domains = process.env.REPLIT_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean);
  return domains && domains.length > 0 ? `https://${domains[0]}` : null;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  /** External model service; when unset the API server starts the Python service itself. */
  mlServiceUrl: process.env.ML_SERVICE_URL || null,
  mlPort: num("ML_PORT", 8765),
  mlPython: process.env.ML_PYTHON || path.join(REPO_ROOT, ".pythonlibs", "bin", "python"),
  schedulerEnabled: process.env.SCHEDULER !== "off",
  xBearerToken: process.env.X_BEARER_TOKEN || null,
  xDailyBudgetUsd: num("X_DAILY_BUDGET_USD", 0.5),
  xCostPerPostUsd: num("X_COST_PER_POST_USD", 0.005),
  firmsMapKey: process.env.FIRMS_MAP_KEY || null,
  resendApiKey: process.env.RESEND_API_KEY || null,
  alertFromEmail: process.env.ALERT_FROM_EMAIL || null,
  publicBaseUrl: process.env.PUBLIC_BASE_URL || firstDomain() || "http://localhost:5173",
  authorHashSalt: process.env.SESSION_SECRET || "calamity-watch",
  userAgent: "CalamityWatch/0.1 (research project; github.com/aman161upadhyay)",
} as const;

export const DETECTOR = {
  baselineDays: 7,
  minRelevantPerHour: 5,
  madFloor: 1.0,
  thresholds: { elevated: 1.5, high: 3, severe: 5 },
  openAfterHours: 2,
  closeAfterHours: 3,
  corroborationRadiusKm: 250,
  corroborationWindowHours: 48,
  corroborationLookbackHours: 24,
  placeConfidenceMin: 0.5,
  relevanceThreshold: 0.5,
  staleAfterMinutes: 45,
} as const;
