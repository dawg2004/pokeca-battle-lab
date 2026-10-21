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
    ability: card.ability?.name ?? null,
    retreatCost: card.retreatCost ?? 0,
    attacks: (card.attacks ?? []).map((a) => `${a.name} (cost ${a.cost}, ${a.damage} dmg)`)
  };
}

function findCard(state: BattleState, instanceId: string): BattleCard | null {
  for (const zone of Object.values(state.zones)) {
    const all = [zone.active, ...zone.bench, ...zone.hand];
    const hit = all.find((c) => c?.instanceId === instanceId);
    if (hit) return hit;
  }
  return null;
}

export function labelAction(state: BattleState, action: LegalAction): string {
  const name = (id: string) => findCard(state, id)?.name ?? "?";
  switch (action.type) {
    case "PLAY_BASIC":
      return `Bench ${name(action.cardInstanceId)}`;
    case "ATTACH_ENERGY":
      return `Attach energy to ${name(action.targetInstanceId)}`;
    case "EVOLVE":
      return `Evolve ${name(action.targetInstanceId)} into ${name(action.cardInstanceId)}`;
    case "USE_TRAINER":
      return `Play trainer ${name(action.cardInstanceId)}`;
    case "ATTACH_TOOL":
      return `Attach ${name(action.cardInstanceId)} to ${name(action.targetInstanceId)}`;
    case "USE_ABILITY":
      return `Use ability of ${name(action.sourceInstanceId)}`;
    case "RETREAT":
      return `Retreat active, promote ${name(action.targetInstanceId)}`;
    case "ATTACK":
      return `Attack with ${action.attack.name} (${action.attack.damage} dmg)`;
    case "END_TURN":
      return "End turn";
  }
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
    yourHand: mine.hand.map((c) => c.name),
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
    actions: actions.map((a) => ({ id: a.id, label: labelAction(state, a) }))
  };
}
