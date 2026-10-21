import { applyAction, createInitialBattle, generateLegalActions } from "./engine";
import { heuristicDecisionEngine } from "./decision";
import type { BattleSetup, BattleState } from "./types";

export function runAutoBattle(setup: BattleSetup, maxActions = 200): BattleState {
  let state = createInitialBattle(setup);

  for (let i = 0; i < maxActions && !state.winner; i += 1) {
    const legalActions = generateLegalActions(state);
    if (legalActions.length === 0) break;
    const action = heuristicDecisionEngine(state, legalActions);
    state = applyAction(state, action);
  }

  return state;
}
