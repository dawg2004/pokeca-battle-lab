import type { CardGap, CardSupport, TcgdexCard } from "./types";

const COLORLESS = "Colorless";

// What the battle engine cannot represent yet. These are facts about OUR engine, not guesses about cards.
function engineGaps(card: TcgdexCard): CardGap[] {
  const gaps: CardGap[] = [];
  const typedCost = (card.attacks ?? []).some((a) => (a.cost ?? []).some((c) => c !== COLORLESS));
  if (typedCost) gaps.push({ kind: "engine", label: "色つきエネルギーのコスト（エンジンは枚数のみ）" });
  if ((card.weaknesses ?? []).length > 0) gaps.push({ kind: "engine", label: "弱点（ダメージ計算に未反映）" });
  const isEx = card.suffix === "EX" || /ex$/i.test(card.name);
  if (isEx) gaps.push({ kind: "engine", label: "exのサイド枚数ルール（未対応）" });
  const nonPlainDamage = (card.attacks ?? []).some((a) => a.damage != null && typeof a.damage !== "number");
  if (nonPlainDamage) gaps.push({ kind: "engine", label: "ダメージが数値でない（×/＋などの計算）" });
  return gaps;
}

// Effect text is free text: any card that has some needs per-card, human-verified implementation.
function effectGaps(card: TcgdexCard): CardGap[] {
  const gaps: CardGap[] = [];
  for (const ability of card.abilities ?? []) gaps.push({ kind: "effect", label: `特性「${ability.name}」` });
  for (const attack of card.attacks ?? []) {
    if (attack.effect) gaps.push({ kind: "effect", label: `ワザ「${attack.name}」の効果` });
  }
  if (card.category === "Trainer") {
    const kind = { Supporter: "サポート", Item: "グッズ", Stadium: "スタジアム", Tool: "どうぐ" }[card.trainerType ?? ""] ?? "トレーナーズ";
    gaps.push({ kind: "effect", label: `${kind}の効果` });
  }
  if (card.category === "Energy" && card.energyType === "Special") gaps.push({ kind: "effect", label: "特殊エネルギーの効果" });
  return gaps;
}

export function classifyCard(name: string, count: number, card: TcgdexCard, ambiguousPrint: boolean): CardSupport {
  const gaps = [...effectGaps(card), ...engineGaps(card)];
  return {
    name,
    count,
    status: gaps.length === 0 ? "supported" : "gaps",
    tcgdexId: card.id,
    ambiguousPrint,
    facts: card.category === "Pokemon"
      ? { hp: card.hp ?? null, stage: card.stage ?? null, evolveFrom: card.evolveFrom ?? null, retreat: card.retreat ?? null }
      : null,
    gaps
  };
}

export function unresolvedCard(name: string, count: number): CardSupport {
  return { name, count, status: "unresolved", tcgdexId: null, ambiguousPrint: false, facts: null, gaps: [] };
}
