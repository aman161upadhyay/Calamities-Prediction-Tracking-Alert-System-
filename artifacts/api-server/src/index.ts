import app from "./app";
import { logger } from "./lib/logger";
import { startModelService } from "./ml/process";
import { startScheduler } from "./scheduler";
import { seedFeaturedPlaces } from "./services/places";
import { resumeInterruptedScenarios } from "./services/replay";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

startModelService();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  seedFeaturedPlaces()
    .catch((e) => logger.error({ err: e }, "featured place seed failed"))
    .finally(() => {
      startScheduler();
      resumeInterruptedScenarios().catch((e) => logger.error({ err: e }, "could not resume replay preparation"));
    });
});
