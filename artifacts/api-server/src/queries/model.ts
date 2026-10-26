import { DETECTOR } from "../lib/config";
import { HAZARDS, TRAINED_CLASSES, hazardMeta } from "../lib/hazards";
import { mlModelCard, mlScore } from "../ml/client";
import { upsertPlaces } from "../services/places";
import { ApiError } from "./common";

let cardCache: { at: number; value: Record<string, unknown> } | null = null;

export const LIMITATIONS = [
  "This is a research prototype. It is not an official warning source and must not be used to decide whether to evacuate.",
  "Stage one is trained on HumAID tweets from 14 events in 2016 to 2019 (English only). Vocabulary, platforms and events have changed since; expect lower accuracy on today's posts than on the test split.",
  `Only ${TRAINED_CLASSES.join(", ")} have labelled training data. ${HAZARDS.filter((h) => !h.trained).map((h) => h.label.toLowerCase()).join(", ")} are routed by keywords plus the relevance score, which is weaker.`,
  "Fear is a probability from a general-purpose emotion model, not a measure of actual danger. Sarcasm, news headlines and fiction can score high.",
  "Posts are counted toward a place only when the text names it. Posts about a place that never mention it are missed; posts that mention several places count for each.",
  "The baseline needs seven days of history. In the first week after start, and at the start of every replay, every surge reads as a spike because the baseline is empty.",
  "Live coverage depends on what the sources return: Bluesky public search without credentials, and X only when a bearer token and budget are configured. Volumes are small compared with 2018-era Twitter streams.",
  "Replay scenarios use HumAID tweet ids, labels and timestamps. The text is scored locally and withheld from the interface under the dataset's terms; collections start hours to days after each event began.",
  "Corroboration is a spatial and temporal match against official feeds: within 250 km (or the extent of the region or country when the alert is at that level), and the official event is active between 24 h before and 48 h after the alert opened (an event with no recorded end counts as active for 72 h). It shows that an official event existed near the alert, not that the alert caused or predicted it.",
  "Counts are posts, not independent witnesses. Posts are deduplicated only by platform id, so one prolific author or copied text under different ids can satisfy the minimum of five relevant posts and inflate a signal.",
  "Hazard typing follows the training events, which were mostly hurricanes. Automated weather-bulletin reposts on Bluesky (\"continues Flood Warning for ...\") are often typed as cyclone rather than flood; the relevance score is usually right, the hazard label less so.",
  "Named-entity recognition is the small English spaCy model. It misses some town names outside Europe and North America and sometimes reads a person or product as a place; a place name that is also an ordinary English word is only used when the text also names its country or state.",
];

export async function modelInfo() {
  if (!cardCache || Date.now() - cardCache.at > 60_000) {
    try {
      cardCache = { at: Date.now(), value: await mlModelCard() };
    } catch (err) {
      if (cardCache) return assemble(cardCache.value);
      throw new ApiError(503, "The model service is not ready yet; try again in a minute.");
    }
  }
  return assemble(cardCache.value);
}

function assemble(card: Record<string, unknown>) {
  return {
    version: String(card.version ?? "unknown"),
    modelReady: Boolean(card.modelReady),
    stageOne: card.stageOne,
    emotionModel: card.emotionModel,
    sentimentModel: card.sentimentModel,
    geoparser: card.geoparser,
    detector: {
      baselineDays: DETECTOR.baselineDays,
      minRelevantPerHour: DETECTOR.minRelevantPerHour,
      thresholds: DETECTOR.thresholds,
      openAfterHours: DETECTOR.openAfterHours,
      closeAfterHours: DETECTOR.closeAfterHours,
      corroborationRadiusKm: DETECTOR.corroborationRadiusKm,
      corroborationWindowHours: DETECTOR.corroborationWindowHours,
      corroborationLookbackHours: DETECTOR.corroborationLookbackHours,
      corroborationActiveHours: DETECTOR.corroborationActiveHours,
    },
    limitations: LIMITATIONS,
  };
}

export async function classifyText(text: string) {
  let res;
  try {
    res = await mlScore([{ id: "classify", text }]);
  } catch {
    throw new ApiError(503, "The model service is not ready yet; try again in a minute.");
  }
  const r = res.results[0]!;
  const placeIds = await upsertPlaces(r.places);
  const places = r.places
    .map((p) => ({ placeId: placeIds.get(p.key) ?? 0, name: p.name, country: p.country, confidence: Math.round(p.confidence * 100) / 100, method: p.method }))
    .filter((p) => p.placeId > 0);
  const label = hazardMeta(r.hazard).label.toLowerCase();
  const contribution = Math.round(r.pRelevant * r.pFear * 100) / 100;
  const parts: string[] = [];
  if (r.pRelevant >= DETECTOR.relevanceThreshold) {
    parts.push(`Relevance ${r.pRelevant.toFixed(2)}: counted as a ${label} post${r.hazardMethod === "keyword" ? " (hazard chosen from its vocabulary, since the model has no training data for this type)" : ""}.`);
    parts.push(`Fear ${r.pFear.toFixed(2)}, so it would add ${contribution.toFixed(2)} to the hour's fear mass.`);
  } else {
    parts.push(`Relevance ${r.pRelevant.toFixed(2)} is below 0.5, so it would count toward ${label} volume but not toward any relevant-post count or alert.`);
  }
  const confident = places.filter((p) => p.confidence >= DETECTOR.placeConfidenceMin);
  if (confident.length) parts.push(`Place: ${confident.map((p) => `${p.name}, ${p.country}`).join("; ")}. It would feed that place's ${label} series.`);
  else if (places.length) parts.push(`A place was found (${places.map((p) => p.name).join(", ")}) but below confidence 0.5, so it would not feed any place's series.`);
  else parts.push("No place could be resolved from the text, so it would count toward the hazard totals but not toward any place.");
  return {
    text,
    pRelevant: r.pRelevant,
    hazard: r.hazard,
    hazardProbs: r.hazardProbs,
    pFear: r.pFear,
    pAnger: r.pAnger,
    pSadness: r.pSadness,
    emotions: r.emotions,
    sentiment: r.sentiment,
    sentimentScore: r.sentimentScore,
    places,
    latencyMs: res.latencyMs,
    modelVersion: res.modelVersion,
    explanation: parts.join(" "),
  };
}

/** Written for this page; these are not real posts. */
export const MODEL_EXAMPLES = [
  { text: "Heavy flooding in Kerala, thousands stranded in Aluva and Chalakudy, rescue boats needed urgently", note: "A clear case: flood vocabulary, a plea, and a region the gazetteer knows." },
  { text: "Water is already at the first floor, we are moving to the terrace. Is anyone coming with boats?", note: "A first-person plea with no hazard word in it. The training data is mostly news-style posts, so expect relevance near the 0.5 line." },
  { text: "Felt a long shake in Mexico City just now, lamps swinging, everyone ran out to the street.", note: "No earthquake keyword at all. Bag-of-words models usually miss this; see what this one does with it." },
  { text: "This heat is a joke, third day over 45 in Jacobabad and the power is out again.", note: "Heat has no labelled training data, so the hazard comes from keyword routing with lower confidence." },
  { text: "Hurricane season starts next week, remember to check your insurance.", note: "No event under way. Preparedness advice counts as relevant in the training labels (caution and advice), so this scores higher than you might expect." },
  { text: "My team got absolutely flooded with support tickets after the launch lol", note: "Flood as a metaphor. Relevance should be low." },
  { text: "Smoke from the fire north of Chico is covering the whole valley, schools closed, air quality off the charts.", note: "Wildfire with a mid-sized city; checks the gazetteer." },
];
