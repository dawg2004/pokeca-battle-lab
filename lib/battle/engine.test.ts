import { describe, expect, it } from "vitest";
import { sampleDeck } from "@/lib/deck/sampleDecks";
import { summarizeDeck } from "@/lib/deck/resolveDeck";
import type { CardDefinition, DeckList } from "@/lib/deck/types";
import { applyAction, createInitialBattle, generateLegalActions } from "./engine";
import { heuristicDecisionEngine } from "./decision";
import { runAutoBattle } from "./simulate";
import type { BattleCard, BattleState, Zone } from "./types";

function card(def: CardDefinition): CardDefinition {
  return def;
}

function battleCard(def: CardDefinition, instanceId: string, overrides: Partial<BattleCard> = {}): BattleCard {
  return {
    ...def,
    instanceId,
    attachedEnergy: 0,
    damage: 0,
    turnPlayed: 0,
    evolvedThisTurn: false,
    abilityUsedThisTurn: false,
    tool: null,
    previousStages: [],
    ...overrides
  };
}

function emptyZone(overrides: Partial<Zone> = {}): Zone {
  return {
    deck: [],
    hand: [],
    active: null,
    bench: [],
    discard: [],
    prizes: [],
    prizeTaken: 0,
    ...overrides
  };
}

function opponentZone(): Zone {
  return emptyZone({
    active: battleCard(card({ id: "opp-mon", name: "Opponent Mon", category: "pokemon", hp: 100, isBasic: true }), "opp-active", {
      turnPlayed: 1
    })
  });
}

function baseState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    id: "test-battle",
    turn: 1,
    currentPlayer: "player",
    winner: null,
    zones: {
      player: emptyZone(),
      opponent: opponentZone()
    },
    energyAttachedThisTurn: { player: false, opponent: false },
    supporterUsedThisTurn: { player: false, opponent: false },
    retreatedThisTurn: { player: false, opponent: false },
    stadium: null,
    log: [],
    ...overrides
  };
}

describe("deck fixtures", () => {
  it("contains a legal 60-card MVP deck", () => {
    expect(summarizeDeck(sampleDeck)).toEqual({
      total: 60,
      pokemon: 16,
      trainers: 20,
      energy: 24
    });
  });
});

describe("battle engine", () => {
  it("generates only executable actions for the current player", () => {
    const state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed: 7 });
    const actions = generateLegalActions(state);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.player === state.currentPlayer)).toBe(true);
  });

  it("applies a heuristic-selected legal action", () => {
    const state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed: 9 });
    const action = heuristicDecisionEngine(state, generateLegalActions(state));
    const next = applyAction(state, action);
    expect(next.log.length).toBeGreaterThan(state.log.length);
  });

  it("can finish a deterministic auto battle", () => {
    const result = runAutoBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed: 11 }, 250);
    expect(result.winner).not.toBeNull();
    expect(result.log.length).toBeGreaterThan(5);
  });
});

describe("evolution", () => {
  it("allows evolving a Pokemon that has been in play since a previous turn, and blocks attacking that turn", () => {
    const larvaDef = card({
      id: "larva",
      name: "Larva",
      category: "pokemon",
      hp: 60,
      isBasic: true,
      attacks: [{ id: "nibble", name: "Nibble", cost: 0, damage: 10 }]
    });
    const cocoonDef = card({
      id: "cocoon",
      name: "Cocoon",
      category: "pokemon",
      hp: 120,
      evolvesFrom: "Larva",
      attacks: [{ id: "smash", name: "Smash", cost: 0, damage: 50 }]
    });

    const state = baseState({
      turn: 2,
      zones: {
        player: emptyZone({
          active: battleCard(larvaDef, "p-active", { turnPlayed: 1 }),
          hand: [battleCard(cocoonDef, "p-hand-cocoon")]
        }),
        opponent: opponentZone()
      }
    });

    const evolve = generateLegalActions(state).find((action) => action.type === "EVOLVE");
    expect(evolve).toBeDefined();

    const next = applyAction(state, evolve!);
    expect(next.zones.player.active?.name).toBe("Cocoon");
    expect(next.zones.player.active?.evolvedThisTurn).toBe(true);
    expect(next.zones.player.hand).toHaveLength(0);
    expect(generateLegalActions(next).some((action) => action.type === "ATTACK")).toBe(false);
  });

  it("does not allow evolving a Pokemon on the same turn it was played", () => {
    const larvaDef = card({ id: "larva", name: "Larva", category: "pokemon", hp: 60, isBasic: true });
    const cocoonDef = card({ id: "cocoon", name: "Cocoon", category: "pokemon", hp: 120, evolvesFrom: "Larva" });

    const state = baseState({
      turn: 1,
      zones: {
        player: emptyZone({
          active: battleCard(larvaDef, "p-active", { turnPlayed: 1 }),
          hand: [battleCard(cocoonDef, "p-hand-cocoon")]
        }),
        opponent: opponentZone()
      }
    });

    expect(generateLegalActions(state).some((action) => action.type === "EVOLVE")).toBe(false);
  });
});

function mulliganTestDeck(basicCount: number, fillerCount: number): DeckList {
  const basic: CardDefinition = { id: "mul-basic", name: "Mulligan Basic", category: "pokemon", hp: 60, isBasic: true };
  const filler: CardDefinition = { id: "mul-filler", name: "Mulligan Filler", category: "energy" };
  return {
    code: "mulligan-test",
    name: "Mulligan Test Deck",
    source: "local-fixture",
    entries: [
      { card: basic, count: basicCount },
      { card: filler, count: fillerCount }
    ],
    notes: []
  };
}

describe("mulligan", () => {
  it("redraws until a Basic Pokemon is found instead of an instant loss", () => {
    const deck = mulliganTestDeck(1, 59);
    let recovered: BattleState | null = null;

    for (let seed = 0; seed < 50 && !recovered; seed += 1) {
      const state = createInitialBattle({ playerDeck: deck, opponentDeck: sampleDeck, seed });
      const mulliganed = state.log.some((entry) => entry.message.includes("mulliganed"));
      if (mulliganed && state.zones.player.active) {
        recovered = state;
      }
    }

    expect(recovered).not.toBeNull();
    expect(recovered!.zones.player.active?.name).toBe("Mulligan Basic");
    expect(recovered!.winner).toBeNull();
  });

  it("does not hang and safely ends the game when a deck has no Basic Pokemon at all", () => {
    const deck = mulliganTestDeck(0, 60);
    expect(() => createInitialBattle({ playerDeck: deck, opponentDeck: sampleDeck, seed: 1 })).not.toThrow();

    const state = createInitialBattle({ playerDeck: deck, opponentDeck: sampleDeck, seed: 1 });
    expect(state.zones.player.active).toBeNull();
    expect(state.winner).not.toBeNull();
  });
});

describe("multi-stage evolution", () => {
  it("evolves through a Basic -> Stage 1 -> Stage 2 chain across separate turns", () => {
    const basicDef = card({ id: "egg", name: "Egg", category: "pokemon", hp: 60, isBasic: true });
    const stage1Def = card({ id: "hatchling", name: "Hatchling", category: "pokemon", hp: 90, evolvesFrom: "Egg" });
    const stage2Def = card({ id: "dragon", name: "Dragon", category: "pokemon", hp: 150, evolvesFrom: "Hatchling" });

    let state = baseState({
      turn: 2,
      zones: {
        player: emptyZone({
          active: battleCard(basicDef, "p-active", { turnPlayed: 1 }),
          hand: [battleCard(stage1Def, "p-hand-stage1")]
        }),
        opponent: opponentZone()
      }
    });

    const evolveToStage1 = generateLegalActions(state).find((action) => action.type === "EVOLVE");
    expect(evolveToStage1).toBeDefined();
    state = applyAction(state, evolveToStage1!);
    expect(state.zones.player.active?.name).toBe("Hatchling");
    expect(state.zones.player.active?.previousStages).toHaveLength(1);

    // A later turn resets evolvedThisTurn, allowing the next stage of the chain.
    state = {
      ...state,
      turn: 3,
      zones: { ...state.zones, player: { ...state.zones.player, hand: [battleCard(stage2Def, "p-hand-stage2")] } }
    };
    if (state.zones.player.active) state.zones.player.active.evolvedThisTurn = false;

    const evolveToStage2 = generateLegalActions(state).find((action) => action.type === "EVOLVE");
    expect(evolveToStage2).toBeDefined();
    const finalState = applyAction(state, evolveToStage2!);
    expect(finalState.zones.player.active?.name).toBe("Dragon");
    expect(finalState.zones.player.active?.previousStages.map((c) => c.name)).toEqual(["Egg", "Hatchling"]);
  });

  it("blocks evolving a Pokemon twice in the same turn even across a multi-stage chain", () => {
    const basicDef = card({ id: "egg", name: "Egg", category: "pokemon", hp: 60, isBasic: true });
    const stage1Def = card({ id: "hatchling", name: "Hatchling", category: "pokemon", hp: 90, evolvesFrom: "Egg" });
    const stage2Def = card({ id: "dragon", name: "Dragon", category: "pokemon", hp: 150, evolvesFrom: "Hatchling" });

    let state = baseState({
      turn: 2,
      zones: {
        player: emptyZone({
          active: battleCard(basicDef, "p-active", { turnPlayed: 1 }),
          hand: [battleCard(stage1Def, "p-hand-stage1"), battleCard(stage2Def, "p-hand-stage2")]
        }),
        opponent: opponentZone()
      }
    });

    const evolveToStage1 = generateLegalActions(state).find((action) => action.type === "EVOLVE");
    expect(evolveToStage1).toBeDefined();
    state = applyAction(state, evolveToStage1!);
    expect(state.zones.player.active?.name).toBe("Hatchling");
    expect(state.zones.player.active?.evolvedThisTurn).toBe(true);

    expect(generateLegalActions(state).some((action) => action.type === "EVOLVE")).toBe(false);
  });
});

describe("retreat", () => {
  it("swaps the active Pokemon with a bench Pokemon and pays the retreat cost", () => {
    const active = battleCard(
      card({ id: "runner", name: "Runner", category: "pokemon", hp: 60, isBasic: true, retreatCost: 1 }),
      "p-active",
      { attachedEnergy: 1 }
    );
    const bench = battleCard(card({ id: "backup", name: "Backup", category: "pokemon", hp: 60, isBasic: true }), "p-bench");

    const state = baseState({
      zones: {
        player: emptyZone({ active, bench: [bench] }),
        opponent: opponentZone()
      }
    });

    const retreat = generateLegalActions(state).find((action) => action.type === "RETREAT");
    expect(retreat).toBeDefined();

    const next = applyAction(state, retreat!);
    expect(next.zones.player.active?.name).toBe("Backup");
    expect(next.zones.player.bench.find((c) => c.name === "Runner")?.attachedEnergy).toBe(0);
    expect(next.retreatedThisTurn.player).toBe(true);
    expect(generateLegalActions(next).some((action) => action.type === "RETREAT")).toBe(false);
  });

  it("blocks retreat when the energy attached is below the retreat cost", () => {
    const active = battleCard(
      card({ id: "runner", name: "Runner", category: "pokemon", hp: 60, isBasic: true, retreatCost: 2 }),
      "p-active",
      { attachedEnergy: 1 }
    );
    const bench = battleCard(card({ id: "backup", name: "Backup", category: "pokemon", hp: 60, isBasic: true }), "p-bench");

    const state = baseState({
      zones: {
        player: emptyZone({ active, bench: [bench] }),
        opponent: opponentZone()
      }
    });

    expect(generateLegalActions(state).some((action) => action.type === "RETREAT")).toBe(false);
  });
});

describe("tool cards", () => {
  it("attaches a tool card to a Pokemon and blocks a second tool on the same target", () => {
    const active = battleCard(card({ id: "runner", name: "Runner", category: "pokemon", hp: 60, isBasic: true }), "p-active");
    const tool = battleCard(card({ id: "visor", name: "Lab Visor", category: "trainer", trainerKind: "tool" }), "p-hand-tool");

    const state = baseState({
      zones: {
        player: emptyZone({ active, hand: [tool] }),
        opponent: opponentZone()
      }
    });

    const attach = generateLegalActions(state).find((action) => action.type === "ATTACH_TOOL");
    expect(attach).toBeDefined();

    const next = applyAction(state, attach!);
    expect(next.zones.player.active?.tool?.name).toBe("Lab Visor");
    expect(generateLegalActions(next).some((action) => action.type === "ATTACH_TOOL")).toBe(false);
  });
});

describe("abilities", () => {
  it("uses an ability once per turn", () => {
    const active = battleCard(
      card({
        id: "sage",
        name: "Lab Sage",
        category: "pokemon",
        hp: 60,
        isBasic: true,
        ability: { id: "lab-scan", name: "Lab Scan", effect: "drawExtra" }
      }),
      "p-active"
    );
    const deckCard = battleCard(card({ id: "filler", name: "Filler", category: "energy" }), "p-deck-1");

    const state = baseState({
      zones: {
        player: emptyZone({ active, deck: [deckCard] }),
        opponent: opponentZone()
      }
    });

    const useAbility = generateLegalActions(state).find((action) => action.type === "USE_ABILITY");
    expect(useAbility).toBeDefined();

    const next = applyAction(state, useAbility!);
    expect(next.zones.player.hand).toHaveLength(1);
    expect(next.zones.player.active?.abilityUsedThisTurn).toBe(true);
    expect(generateLegalActions(next).some((action) => action.type === "USE_ABILITY")).toBe(false);
  });

  it("heals the whole Bench with a healBench ability", () => {
    const active = battleCard(
      card({
        id: "medic",
        name: "Lab Medic",
        category: "pokemon",
        hp: 60,
        isBasic: true,
        ability: { id: "lab-care", name: "Lab Care", effect: "healBench" }
      }),
      "p-active"
    );
    const benchA = battleCard(card({ id: "hurt-a", name: "Hurt A", category: "pokemon", hp: 60, isBasic: true }), "p-bench-a", {
      damage: 30
    });
    const benchB = battleCard(card({ id: "hurt-b", name: "Hurt B", category: "pokemon", hp: 60, isBasic: true }), "p-bench-b", {
      damage: 10
    });

    const state = baseState({
      zones: {
        player: emptyZone({ active, bench: [benchA, benchB] }),
        opponent: opponentZone()
      }
    });

    const useAbility = generateLegalActions(state).find((action) => action.type === "USE_ABILITY");
    expect(useAbility).toBeDefined();

    const next = applyAction(state, useAbility!);
    expect(next.zones.player.bench.find((c) => c.name === "Hurt A")?.damage).toBe(10);
    expect(next.zones.player.bench.find((c) => c.name === "Hurt B")?.damage).toBe(0);
  });

  it("attaches energy from hand via an energyAccel ability without using the turn's energy attachment", () => {
    const active = battleCard(
      card({
        id: "surger",
        name: "Lab Surger",
        category: "pokemon",
        hp: 60,
        isBasic: true,
        ability: { id: "lab-surge", name: "Lab Surge", effect: "energyAccel" }
      }),
      "p-active"
    );
    const energyCard = battleCard(card({ id: "en", name: "Battle Energy", category: "energy" }), "p-hand-energy");

    const state = baseState({
      zones: {
        player: emptyZone({ active, hand: [energyCard] }),
        opponent: opponentZone()
      }
    });

    const useAbility = generateLegalActions(state).find((action) => action.type === "USE_ABILITY");
    expect(useAbility).toBeDefined();

    const next = applyAction(state, useAbility!);
    expect(next.zones.player.active?.attachedEnergy).toBe(1);
    expect(next.zones.player.hand).toHaveLength(0);
    expect(next.energyAttachedThisTurn.player).toBe(false);
  });
});

describe("trainer kinds", () => {
  it("only allows one supporter per turn", () => {
    const active = battleCard(card({ id: "runner", name: "Runner", category: "pokemon", hp: 60, isBasic: true }), "p-active");
    const supporterA = battleCard(
      card({ id: "sup-a", name: "Colleague A", category: "trainer", trainerKind: "supporter", trainerEffect: "draw2" }),
      "p-hand-sup-a"
    );
    const supporterB = battleCard(
      card({ id: "sup-b", name: "Colleague B", category: "trainer", trainerKind: "supporter", trainerEffect: "draw2" }),
      "p-hand-sup-b"
    );
    const deckCards = [
      battleCard(card({ id: "filler-1", name: "Filler 1", category: "energy" }), "p-deck-1"),
      battleCard(card({ id: "filler-2", name: "Filler 2", category: "energy" }), "p-deck-2")
    ];

    const state = baseState({
      zones: {
        player: emptyZone({ active, hand: [supporterA, supporterB], deck: deckCards }),
        opponent: opponentZone()
      }
    });

    const firstSupporter = generateLegalActions(state).find(
      (action) => action.type === "USE_TRAINER" && action.cardInstanceId === "p-hand-sup-a"
    );
    expect(firstSupporter).toBeDefined();

    const afterFirst = applyAction(state, firstSupporter!);
    expect(afterFirst.supporterUsedThisTurn.player).toBe(true);

    const secondSupporterAvailable = generateLegalActions(afterFirst).some(
      (action) => action.type === "USE_TRAINER" && action.cardInstanceId === "p-hand-sup-b"
    );
    expect(secondSupporterAvailable).toBe(false);
  });

  it("replaces a stadium and discards the previous one to its owner's discard pile", () => {
    const active = battleCard(card({ id: "runner", name: "Runner", category: "pokemon", hp: 60, isBasic: true }), "p-active");
    const stadiumA = battleCard(
      card({ id: "stadium-a", name: "Lab Arena", category: "trainer", trainerKind: "stadium" }),
      "p-hand-stadium-a"
    );
    const stadiumB = battleCard(
      card({ id: "stadium-b", name: "Research Facility", category: "trainer", trainerKind: "stadium" }),
      "o-hand-stadium-b"
    );

    let state = baseState({
      zones: {
        player: emptyZone({ active, hand: [stadiumA] }),
        opponent: emptyZone({
          active: battleCard(card({ id: "opp-mon", name: "Opponent Mon", category: "pokemon", hp: 100, isBasic: true }), "opp-active")
        })
      }
    });

    const playStadiumA = generateLegalActions(state).find((action) => action.type === "USE_TRAINER");
    expect(playStadiumA).toBeDefined();
    state = applyAction(state, playStadiumA!);
    expect(state.stadium?.card.name).toBe("Lab Arena");

    state = {
      ...state,
      currentPlayer: "opponent",
      zones: { ...state.zones, opponent: { ...state.zones.opponent, hand: [stadiumB] } }
    };
    const playStadiumB = generateLegalActions(state).find((action) => action.type === "USE_TRAINER");
    expect(playStadiumB).toBeDefined();
    const next = applyAction(state, playStadiumB!);

    expect(next.stadium?.card.name).toBe("Research Facility");
    expect(next.zones.player.discard.some((c) => c.name === "Lab Arena")).toBe(true);
  });
});

describe("starter deck fixture wiring", () => {
  it("the starter deck surfaces evolution, retreat, ability, or tool actions during play", () => {
    const interestingTypes = new Set(["EVOLVE", "RETREAT", "USE_ABILITY", "ATTACH_TOOL"]);
    let sawInteresting = false;

    outer: for (let seed = 0; seed < 40; seed += 1) {
      let state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed });
      for (let i = 0; i < 60 && !state.winner; i += 1) {
        const actions = generateLegalActions(state);
        if (actions.some((action) => interestingTypes.has(action.type))) {
          sawInteresting = true;
          break outer;
        }
        const action = heuristicDecisionEngine(state, actions);
        state = applyAction(state, action);
      }
    }

    expect(sawInteresting).toBe(true);
  });
});
