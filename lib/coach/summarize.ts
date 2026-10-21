import { describeAbilityEffect, describeTrainerEffect } from "@/lib/battle/effects";
import { describeActionJa } from "@/lib/battle/labels";
import type { BattleCard, BattleState, LegalAction } from "@/lib/battle/types";

export type CoachAction = { id: string; label: string };

export type CoachPosition = {
  turn: number;
  you: string;
  yourActive: unknown;
  yourBench: unknown[];
  yourHand: string[];
  yourDeckCount: number;
  yourPrizesTaken: number;
  opponentActive: unknown;
  opponentBench: unknown[];
  opponentHandCount: number;
  opponentPrizesTaken: number;
  stadium: string | null;
  flags: { energyAttached: boolean; supporterUsed: boolean; retreated: boolean };
  recentLog: string[];
  actions: CoachAction[];
};

function cardView(card: BattleCard | null) {
  if (!card) return null;
  return {
    name: card.name,
    hp: card.hp,
    damage: card.damage,
    energy: card.attachedEnergy,
    tool: card.tool?.name ?? null,
    ability: card.ability ? `${card.ability.name}（${describeAbilityEffect(card.ability.effect)}）` : null,
    retreatCost: card.retreatCost ?? 0,
    attacks: (card.attacks ?? []).map((a) => `${a.name} (cost ${a.cost}, ${a.damage} dmg)`)
  };
}

function handEntry(card: BattleCard): string {
  if (card.category === "energy") return `${card.name}（エネルギー）`;
  if (card.category === "trainer") {
    const kind = { supporter: "サポート", item: "グッズ", stadium: "スタジアム", tool: "どうぐ" }[card.trainerKind ?? "item"];
    return `${card.name}（${kind}: ${describeTrainerEffect(card)}）`;
  }
  return card.evolvesFrom ? `${card.name}（${card.evolvesFrom}から進化）` : `${card.name}（たね）`;
}

// Only information the acting player could see: own hand by name, opponent hand as a count.
export function summarizeForCoach(state: BattleState, actions: LegalAction[]): CoachPosition {
  const me = state.currentPlayer;
  const opp = me === "player" ? "opponent" : "player";
  const mine = state.zones[me];
  const theirs = state.zones[opp];

  return {
    turn: state.turn,
    you: me,
    yourActive: cardView(mine.active),
    yourBench: mine.bench.map(cardView),
    yourHand: mine.hand.map(handEntry),
    yourDeckCount: mine.deck.length,
    yourPrizesTaken: mine.prizeTaken,
    opponentActive: cardView(theirs.active),
    opponentBench: theirs.bench.map(cardView),
    opponentHandCount: theirs.hand.length,
    opponentPrizesTaken: theirs.prizeTaken,
    stadium: state.stadium?.card.name ?? null,
    flags: {
      energyAttached: state.energyAttachedThisTurn[me],
      supporterUsed: state.supporterUsedThisTurn[me],
      retreated: state.retreatedThisTurn[me]
    },
    recentLog: state.log.slice(0, 6).map((e) => e.message),
    actions: actions.map((a) => ({ id: a.id, label: describeActionJa(state, a) }))
  };
}
