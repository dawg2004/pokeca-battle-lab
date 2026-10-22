// Subset of TCGdex's card record that we read. Effect text stays free text; we never interpret it.
export type TcgdexAttack = { name: string; cost?: string[]; damage?: number | string | null; effect?: string | null };
export type TcgdexAbility = { type?: string; name: string; effect?: string | null };
export type TcgdexCard = {
  id: string;
  name: string;
  category: "Pokemon" | "Trainer" | "Energy" | string;
  hp?: number | null;
  stage?: string | null;
  suffix?: string | null;
  evolveFrom?: string | null;
  retreat?: number | null;
  types?: string[] | null;
  attacks?: TcgdexAttack[] | null;
  abilities?: TcgdexAbility[] | null;
  weaknesses?: { type: string; value?: string }[] | null;
  trainerType?: string | null;
  energyType?: string | null;
  effect?: string | null;
};

export type CardGap = { kind: "effect" | "engine"; label: string };

export type CardSupport = {
  name: string;
  count: number;
  status: "supported" | "gaps" | "unresolved";
  tcgdexId: string | null;
  // True when the name matched several prints and we picked one; effect text can differ between prints.
  ambiguousPrint: boolean;
  facts: { hp: number | null; stage: string | null; evolveFrom: string | null; retreat: number | null } | null;
  gaps: CardGap[];
};

export type DeckCoverage = {
  total: number;
  supported: number;
  withGaps: number;
  unresolved: number;
  effectGapCopies: number;
  engineGapCopies: number;
  cards: CardSupport[];
};
