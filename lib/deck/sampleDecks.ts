import type { Ability, CardDefinition, TrainerKind } from "./types";
import type { DeckList } from "./types";

const p = (
  id: string,
  name: string,
  hp: number,
  attacks: CardDefinition["attacks"],
  options: { retreatCost?: number; ability?: Ability; evolvesFrom?: string; setName?: string } = {}
): CardDefinition => ({
  id,
  name,
  category: "pokemon",
  setName: options.setName ?? "Battle Lab",
  hp,
  isBasic: options.evolvesFrom ? undefined : true,
  evolvesFrom: options.evolvesFrom,
  retreatCost: options.retreatCost,
  ability: options.ability,
  attacks
});

const trainer = (
  id: string,
  name: string,
  trainerKind: TrainerKind,
  trainerEffect?: NonNullable<CardDefinition["trainerEffect"]>
): CardDefinition => ({
  id,
  name,
  category: "trainer",
  setName: "Battle Lab",
  trainerKind,
  trainerEffect
});

const energy = (id: string, name: string): CardDefinition => ({
  id,
  name,
  category: "energy",
  setName: "Battle Lab"
});

export const battleLabCards = {
  striker: p(
    "BL-001",
    "Lab Striker",
    90,
    [
      { id: "jab", name: "Quick Jab", cost: 1, damage: 30 },
      { id: "drive", name: "Drive Burst", cost: 2, damage: 60 }
    ],
    { retreatCost: 1 }
  ),
  wall: p(
    "BL-002",
    "Lab Wall",
    130,
    [
      { id: "guard-hit", name: "Guard Hit", cost: 1, damage: 20 },
      { id: "heavy-swing", name: "Heavy Swing", cost: 3, damage: 80 }
    ],
    { retreatCost: 2, ability: { id: "lab-regeneration", name: "Lab Regeneration", effect: "healSelf" } }
  ),
  scout: p(
    "BL-003",
    "Lab Scout",
    70,
    [{ id: "poke", name: "Poke", cost: 1, damage: 20 }],
    { retreatCost: 0, ability: { id: "quick-search", name: "Quick Search", effect: "drawExtra" } }
  ),
  scoutEx: p(
    "BL-003X",
    "Lab Scout EX",
    130,
    [
      { id: "poke-plus", name: "Poke Plus", cost: 1, damage: 40 },
      { id: "overdrive", name: "Overdrive", cost: 2, damage: 90 }
    ],
    { retreatCost: 1, evolvesFrom: "Lab Scout" }
  ),
  charger: p(
    "BL-004",
    "Lab Charger",
    100,
    [{ id: "charge-shot", name: "Charge Shot", cost: 2, damage: 50 }],
    { retreatCost: 1 }
  ),
  draw: trainer("BL-101", "Research Notes", "supporter", "draw2"),
  switch: trainer("BL-102", "Bench Route", "item", "switch"),
  search: trainer("BL-103", "Setup Call", "item", "searchBasic"),
  stadium: trainer("BL-104", "Lab Arena", "stadium"),
  tool: trainer("BL-105", "Lab Visor", "tool"),
  energy: energy("BL-201", "Battle Energy")
} satisfies Record<string, CardDefinition>;

const sampleEntries = [
  { card: battleLabCards.striker, count: 4 },
  { card: battleLabCards.wall, count: 4 },
  { card: battleLabCards.scout, count: 2 },
  { card: battleLabCards.scoutEx, count: 2 },
  { card: battleLabCards.charger, count: 4 },
  { card: battleLabCards.draw, count: 8 },
  { card: battleLabCards.switch, count: 4 },
  { card: battleLabCards.search, count: 4 },
  { card: battleLabCards.stadium, count: 2 },
  { card: battleLabCards.tool, count: 2 },
  { card: battleLabCards.energy, count: 24 }
];

export const sampleDeck: DeckList = {
  code: "xx4cGx-D0BtE3-8cGaGK",
  name: "Battle Lab Starter 60",
  source: "local-fixture",
  entries: sampleEntries,
  notes: [
    "Official deck-code fetching is intentionally disabled in MVP v0.1.",
    "This local fixture exercises deck loading, legal actions, game logs, and win detection.",
    "Includes an evolution line (Lab Scout to Lab Scout EX), retreat costs, one Ability of each kind, a Stadium, and a Tool."
  ]
};

export const secondSampleDeck: DeckList = {
  ...sampleDeck,
  code: "9gn6PL-yECm7y-ngLLnn",
  name: "Research Fixture 60"
};
