import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { ApiError } from "./queries/common";

const app: Express = express();
// Behind the platform proxy; without this every client shares the proxy's address for rate limiting.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url?.includes("/healthz") ?? false },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const errType = err && typeof err === "object" && "type" in err ? (err as { type?: string }).type : undefined;
  if (errType === "entity.parse.failed") {
    res.status(400).json({ error: "Body must be valid JSON" });
    return;
  }
  if (errType === "entity.too.large") {
    res.status(413).json({ error: "Body is larger than 64 kB" });
    return;
  }
  logger.error({ err, url: req.url }, "unhandled error");
  res.status(500).json({ error: "Something went wrong on the server." });
});

export default app;
