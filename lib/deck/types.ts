export type CardCategory = "pokemon" | "trainer" | "energy";

export type TrainerKind = "supporter" | "item" | "stadium" | "tool";

export type Attack = {
  id: string;
  name: string;
  cost: number;
  damage: number;
};

export type AbilityEffect = "drawExtra" | "healSelf" | "healBench" | "energyAccel";

export type Ability = {
  id: string;
  name: string;
  effect: AbilityEffect;
};

export type CardDefinition = {
  id: string;
  name: string;
  category: CardCategory;
  setName?: string;
  number?: string;
  hp?: number;
  isBasic?: boolean;
  evolvesFrom?: string;
  retreatCost?: number;
  ability?: Ability;
  attacks?: Attack[];
  trainerEffect?: "draw2" | "switch" | "searchBasic";
  trainerKind?: TrainerKind;
};

export type DeckEntry = {
  card: CardDefinition;
  count: number;
};

export type DeckList = {
  code: string;
  name: string;
  source: "local-fixture" | "official-adapter-disabled" | "official-site-experimental";
  entries: DeckEntry[];
  notes: string[];
};

export type DeckSummary = {
  total: number;
  pokemon: number;
  trainers: number;
  energy: number;
};
