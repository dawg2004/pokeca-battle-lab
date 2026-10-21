import type { BattleState, DecisionEngine, LegalAction } from "./types";

const scoreAction = (state: BattleState, action: LegalAction): number => {
  if (action.type === "ATTACK") {
    const opponent = action.player === "player" ? "opponent" : "player";
    const defender = state.zones[opponent].active;
    const knockoutBonus = defender?.hp && defender.damage + action.attack.damage >= defender.hp ? 1000 : 0;
    return 500 + knockoutBonus + action.attack.damage;
  }
  if (action.type === "EVOLVE") return 400;
  if (action.type === "ATTACH_ENERGY") return 300;
  if (action.type === "PLAY_BASIC") return 220;
  if (action.type === "USE_ABILITY") return 200;
  if (action.type === "USE_TRAINER") return 180;
  if (action.type === "ATTACH_TOOL") return 150;
  if (action.type === "RETREAT") return 50;
  return 0;
};

export const heuristicDecisionEngine: DecisionEngine = (state, actions) => {
  if (actions.length === 0) {
    throw new Error("Decision engine received no legal actions.");
  }

  return [...actions].sort((a, b) => scoreAction(state, b) - scoreAction(state, a))[0];
};

export function describeAction(action: LegalAction): string {
  if (action.type === "PLAY_BASIC") return "Bench a Basic Pokemon";
  if (action.type === "ATTACH_ENERGY") return "Attach an Energy";
  if (action.type === "EVOLVE") return "Evolve a Pokemon";
  if (action.type === "USE_TRAINER") return "Use a Trainer";
  if (action.type === "ATTACH_TOOL") return "Attach a Tool";
  if (action.type === "USE_ABILITY") return "Use an Ability";
  if (action.type === "RETREAT") return "Retreat the Active Pokemon";
  if (action.type === "ATTACK") return `Attack: ${action.attack.name}`;
  return "End turn";
}
