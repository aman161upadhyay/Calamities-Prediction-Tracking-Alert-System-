import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config, ML_DIR, REPO_ROOT } from "../lib/config";
import { logger } from "../lib/logger";

let child: ChildProcess | null = null;
let stopping = false;
let restarts = 0;

export function mlBaseUrl(): string {
  return config.mlServiceUrl ?? `http://127.0.0.1:${config.mlPort}`;
}

/** Start the Python model service as a child process unless ML_SERVICE_URL points elsewhere. */
export function startModelService(): void {
  if (config.mlServiceUrl) {
    logger.info({ url: config.mlServiceUrl }, "Using external model service");
    return;
  }
  if (!fs.existsSync(config.mlPython)) {
    logger.error({ python: config.mlPython }, "Python interpreter for the model service not found; run uv sync");
    return;
  }
  const launch = () => {
    if (stopping) return;
    const args = ["-m", "uvicorn", "calamity_ml.service:app", "--host", "127.0.0.1", "--port", String(config.mlPort), "--log-level", "warning"];
    child = spawn(config.mlPython, args, {
      cwd: ML_DIR,
      env: {
        ...process.env,
        HF_HOME: process.env.HF_HOME ?? path.join(REPO_ROOT, ".cache", "huggingface"),
        HF_HUB_OFFLINE: process.env.HF_HUB_OFFLINE ?? (fs.existsSync(path.join(REPO_ROOT, ".cache", "huggingface", "hub")) ? "1" : "0"),
        TOKENIZERS_PARALLELISM: "false",
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (d: Buffer) => logger.info({ ml: d.toString().trim() }, "model service"));
    child.stderr?.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) logger.warn({ ml: line.slice(0, 500) }, "model service");
    });
    child.on("exit", (code, signal) => {
      logger.warn({ code, signal }, "model service exited");
      child = null;
      if (!stopping) {
        restarts += 1;
        const delay = Math.min(60_000, 2_000 * 2 ** Math.min(restarts, 5));
        setTimeout(launch, delay);
      }
    });
    logger.info({ pid: child.pid, port: config.mlPort }, "model service started");
  };
  launch();
  const stop = () => {
    stopping = true;
    child?.kill("SIGTERM");
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  process.once("exit", stop);
}
