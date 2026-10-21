import type { AbilityEffect, CardDefinition } from "@/lib/deck/types";

// Plain-language descriptions of what the ENGINE actually does, so the coach never has to guess card effects.
export function describeAbilityEffect(effect: AbilityEffect): string {
  switch (effect) {
    case "drawExtra":
      return "山札を1枚引く";
    case "healSelf":
      return "このポケモンのダメージを20回復";
    case "healBench":
      return "ベンチのポケモン全員のダメージを20回復";
    case "energyAccel":
      return "手札のエネルギーを1枚、このポケモンにつける（手張りとは別枠）";
  }
}

const trainerEffectText = {
  draw2: "山札を2枚引く",
  switch: "バトル場とベンチのポケモンを入れ替える",
  searchBasic: "山札からたねポケモンを1枚ベンチに出す"
} as const;

export function describeTrainerEffect(card: CardDefinition): string {
  if (card.trainerEffect) return trainerEffectText[card.trainerEffect];
  return "効果なし（このエンジンでは未実装）";
}
