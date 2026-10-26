import { Router, type IRouter } from "express";
import {
  ClassifyTextBody,
  CreateSubscriptionBody,
  GetHazardTimelineQueryParams,
  ListAlertsQueryParams,
  ListOfficialEventsQueryParams,
  ListPlacesQueryParams,
  ListPostsQueryParams,
  UnsubscribeBody,
  VerifySubscriptionQueryParams,
} from "@workspace/api-zod";
import healthRouter from "./health";
import { handle, intParam, parseQuery, parseWith } from "./helpers";
import { parseHazard, parseScope } from "../queries/common";
import { boardSnapshot, hazardSummaries } from "../queries/board";
import { hazardDetail } from "../queries/hazards";
import { buildTimeline, officialEventsInScope } from "../queries/series";
import { listPlaces, placeDetail } from "../queries/places";
import { listPosts } from "../queries/posts";
import { alertDetail, listAlerts } from "../queries/alerts";
import { systemStatus } from "../queries/status";
import { MODEL_EXAMPLES, classifyText, modelInfo } from "../queries/model";
import { getScenario, listScenarios, startScenario } from "../queries/replay";
import { createSubscription, unsubscribe, verifySubscription } from "../queries/subscriptions";

const router: IRouter = Router();

router.use(healthRouter);

router.get("/status", handle(async () => systemStatus()));

router.get("/board", handle(async (req) => boardSnapshot(parseScope(req.query))));

router.get("/hazards", handle(async (req) => hazardSummaries(parseScope(req.query))));

router.get("/hazards/:hazard", handle(async (req) => hazardDetail(parseScope(req.query), parseHazard(req.params.hazard))));

router.get(
  "/hazards/:hazard/timeline",
  handle(async (req) => {
    const scope = parseScope(req.query);
    const q = parseQuery(GetHazardTimelineQueryParams, req.query);
    return buildTimeline(scope, parseHazard(req.params.hazard), q.placeId ?? null, q.hours);
  }),
);

router.get(
  "/places",
  handle(async (req) => {
    const scope = parseScope(req.query);
    const q = parseQuery(ListPlacesQueryParams, req.query);
    return listPlaces(scope, { q: q.q, featured: q.featured });
  }),
);

router.get("/places/:placeId", handle(async (req) => placeDetail(parseScope(req.query), intParam(String(req.params.placeId), "placeId"))));

router.get(
  "/posts",
  handle(async (req) => {
    const scope = parseScope(req.query);
    const q = parseQuery(ListPostsQueryParams, req.query);
    return listPosts(scope, { hazard: q.hazard, placeId: q.placeId, source: q.source, minRelevance: q.minRelevance, limit: q.limit });
  }),
);

router.get(
  "/alerts",
  handle(async (req) => {
    const scope = parseScope(req.query);
    const q = parseQuery(ListAlertsQueryParams, req.query);
    return listAlerts(scope, { status: q.status, hazard: q.hazard, placeId: q.placeId, limit: q.limit });
  }),
);

router.get(
  "/alerts/:alertId",
  handle(async (req) => {
    const asOf = typeof req.query.asOf === "string" && req.query.asOf ? new Date(req.query.asOf) : null;
    return alertDetail(intParam(String(req.params.alertId), "alertId"), asOf && !Number.isNaN(asOf.getTime()) ? asOf : null);
  }),
);

router.get(
  "/official-events",
  handle(async (req) => {
    const scope = parseScope(req.query);
    const q = parseQuery(ListOfficialEventsQueryParams, req.query);
    return officialEventsInScope(scope, { hours: q.hours, hazard: q.hazard, limit: q.limit });
  }),
);

router.get("/model", handle(async () => modelInfo()));

router.post(
  "/model/classify",
  handle(async (req) => {
    const body = parseWith(ClassifyTextBody, req.body);
    return classifyText(body.text.trim());
  }),
);

router.get("/model/examples", handle(async () => MODEL_EXAMPLES));

router.get("/replay/scenarios", handle(async () => listScenarios()));

router.get("/replay/scenarios/:scenarioId", handle(async (req) => getScenario(String(req.params.scenarioId))));

router.post(
  "/replay/scenarios/:scenarioId/prepare",
  handle(async (req, res) => {
    const data = await startScenario(String(req.params.scenarioId));
    res.status(202).json(data);
    return undefined;
  }),
);

router.post(
  "/subscriptions",
  handle(async (req, res) => {
    const body = parseWith(CreateSubscriptionBody, req.body);
    const data = await createSubscription(body);
    res.status(201).json(data);
    return undefined;
  }),
);

router.get(
  "/subscriptions/verify",
  handle(async (req) => {
    const q = parseWith(VerifySubscriptionQueryParams, req.query);
    return verifySubscription(q.token);
  }),
);

router.post(
  "/subscriptions/unsubscribe",
  handle(async (req) => {
    const body = parseWith(UnsubscribeBody, req.body);
    return unsubscribe(body.token);
  }),
);

export default router;
