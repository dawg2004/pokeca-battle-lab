import type { Attack, CardDefinition, DeckList } from "@/lib/deck/types";

export type PlayerId = "player" | "opponent";

export interface BattleCard extends CardDefinition {
  instanceId: string;
  attachedEnergy: number;
  damage: number;
  turnPlayed: number;
  evolvedThisTurn: boolean;
  abilityUsedThisTurn: boolean;
  tool: BattleCard | null;
  previousStages: BattleCard[];
}

export type Zone = {
  deck: BattleCard[];
  hand: BattleCard[];
  active: BattleCard | null;
  bench: BattleCard[];
  discard: BattleCard[];
  prizes: BattleCard[];
  prizeTaken: number;
};

export type BattleLogEntry = {
  id: string;
  turn: number;
  actor: PlayerId;
  message: string;
};

export type Stadium = {
  card: BattleCard;
  owner: PlayerId;
} | null;

export type BattleState = {
  id: string;
  turn: number;
  currentPlayer: PlayerId;
  winner: PlayerId | null;
  zones: Record<PlayerId, Zone>;
  energyAttachedThisTurn: Record<PlayerId, boolean>;
  supporterUsedThisTurn: Record<PlayerId, boolean>;
  retreatedThisTurn: Record<PlayerId, boolean>;
  stadium: Stadium;
  log: BattleLogEntry[];
};

export type LegalAction =
  | { id: string; type: "PLAY_BASIC"; player: PlayerId; cardInstanceId: string }
  | { id: string; type: "ATTACH_ENERGY"; player: PlayerId; cardInstanceId: string; targetInstanceId: string }
  | { id: string; type: "EVOLVE"; player: PlayerId; cardInstanceId: string; targetInstanceId: string }
  | { id: string; type: "USE_TRAINER"; player: PlayerId; cardInstanceId: string }
  | { id: string; type: "ATTACH_TOOL"; player: PlayerId; cardInstanceId: string; targetInstanceId: string }
  | { id: string; type: "USE_ABILITY"; player: PlayerId; sourceInstanceId: string; abilityId: string }
  | { id: string; type: "RETREAT"; player: PlayerId; targetInstanceId: string }
  | { id: string; type: "ATTACK"; player: PlayerId; attack: Attack }
  | { id: string; type: "END_TURN"; player: PlayerId };

export type DecisionEngine = (state: BattleState, actions: LegalAction[]) => LegalAction;

export type BattleSetup = {
  playerDeck: DeckList;
  opponentDeck: DeckList;
  seed?: number;
};
