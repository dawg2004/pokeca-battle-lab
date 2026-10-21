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
  "Only the effects written in the data (ability text, trainer text in yourHand) are real. Never describe any other effect of a card.",
  "Ending the turn is a last resort: do not recommend it while an action that develops the board (energy, bench, evolve, attach, draw) is available.",
  "Answer in natural Japanese for Pokemon TCG players. Use standard terms: ワザ, 特性, 手札, 山札, ベンチ, バトル場, サイド, きぜつ, エネルギーをつける, 進化, にげる.",
  "Keep card names exactly as written in the data. Do not translate or transliterate them, and do not coin new words.",
  "The ONLY game rules in force: 1 supporter per turn; 1 manual energy attach per turn; 1 retreat per turn (costs energy); each ability once per turn per Pokemon; items, tools and abilities of different Pokemon are otherwise unlimited; a Pokemon cannot evolve on the turn it was played or evolved, and cannot attack the turn it evolved.",
  "Never state any other rule or restriction. If you cannot name a concrete downside from the data (HP, damage, energy counts, hand contents), write that the downside is small instead of inventing one.",
  "reason: why this action now (max 2 sentences). risk: the main downside (1 sentence).",
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
