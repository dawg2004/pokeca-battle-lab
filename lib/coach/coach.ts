import type { CoachPosition } from "./summarize";

export type CoachAdvice = {
  recommendedActionId: string;
  reason: string;
  alternativeActionId: string | null;
  risk: string;
};

export type CoachProvider = (systemPrompt: string, userPrompt: string) => Promise<string>;

export const COACH_SYSTEM_PROMPT = [
  "You are a Pokemon TCG coach inside a rules engine. The engine already decided which actions are legal.",
  "You MUST choose recommendedActionId (and alternativeActionId if any) only from the provided actions list, copying the id exactly.",
  "Do not invent card effects. Reason only from the card data and numbers given; if something is unknown, say so.",
  "Answer in Japanese, concisely. reason: why this action now (max 2 sentences). risk: the main downside (1 sentence).",
  'Return JSON only: {"recommendedActionId": string, "reason": string, "alternativeActionId": string|null, "risk": string}'
].join("\n");

export function buildUserPrompt(position: CoachPosition): string {
  return JSON.stringify(position);
}

export class CoachError extends Error {}

export function parseAdvice(raw: string, position: CoachPosition): CoachAdvice {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new CoachError("AIの返答がJSONではありませんでした。");
  }
  const obj = data as Partial<CoachAdvice>;
  const legal = new Set(position.actions.map((a) => a.id));

  if (typeof obj.recommendedActionId !== "string" || !legal.has(obj.recommendedActionId)) {
    throw new CoachError("AIが合法手にない行動を返したため破棄しました。");
  }
  const alt =
    typeof obj.alternativeActionId === "string" &&
    legal.has(obj.alternativeActionId) &&
    obj.alternativeActionId !== obj.recommendedActionId
      ? obj.alternativeActionId
      : null;

  return {
    recommendedActionId: obj.recommendedActionId,
    reason: typeof obj.reason === "string" ? obj.reason : "",
    alternativeActionId: alt,
    risk: typeof obj.risk === "string" ? obj.risk : ""
  };
}

export async function askCoach(position: CoachPosition, provider: CoachProvider): Promise<CoachAdvice> {
  const raw = await provider(COACH_SYSTEM_PROMPT, buildUserPrompt(position));
  return parseAdvice(raw, position);
}
