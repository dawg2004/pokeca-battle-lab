import { describe, expect, it } from "vitest";
import type { DeckList } from "@/lib/deck/types";
import { classifyCard } from "./classify";
import { buildCoverage, printId } from "./coverage";
import type { CardFetcher } from "./tcgdex";
import type { TcgdexCard } from "./types";

const plain: TcgdexCard = {
  id: "TST-001",
  name: "テストむし",
  category: "Pokemon",
  hp: 60,
  stage: "Basic",
  retreat: 1,
  attacks: [{ name: "たいあたり", cost: ["Colorless"], damage: 10 }]
};

describe("classifyCard", () => {
  it("marks a plain colorless Pokemon with no weakness as fully supported", () => {
    const result = classifyCard("テストむし", 4, plain, false);
    expect(result.status).toBe("supported");
    expect(result.facts).toEqual({ hp: 60, stage: "Basic", evolveFrom: null, retreat: 1 });
  });

  it("flags abilities and attack effects as effect gaps without interpreting the text", () => {
    const card: TcgdexCard = {
      ...plain,
      abilities: [{ name: "テスト特性", effect: "(free text)" }],
      attacks: [{ name: "ふしぎ", cost: ["Colorless"], damage: 20, effect: "(free text)" }]
    };
    const labels = classifyCard("x", 1, card, false).gaps.filter((g) => g.kind === "effect").map((g) => g.label);
    expect(labels).toEqual(["特性「テスト特性」", "ワザ「ふしぎ」の効果"]);
  });

  it("flags engine limits: typed energy, weakness, ex, non-numeric damage", () => {
    const card: TcgdexCard = {
      ...plain,
      name: "テストex",
      attacks: [{ name: "ばくはつ", cost: ["Fire", "Colorless"], damage: "30x" }],
      weaknesses: [{ type: "Water", value: "x2" }]
    };
    const engine = classifyCard("テストex", 1, card, false).gaps.filter((g) => g.kind === "engine");
    expect(engine).toHaveLength(4);
  });

  it("always flags trainers and special energy as needing effect work, but not basic energy", () => {
    const supporter: TcgdexCard = { id: "T-1", name: "テスト博士", category: "Trainer", trainerType: "Supporter" };
    expect(classifyCard("a", 1, supporter, false).gaps[0].label).toBe("サポートの効果");
    expect(classifyCard("b", 1, { id: "E-1", name: "特殊", category: "Energy", energyType: "Special" }, false).status).toBe("gaps");
    expect(classifyCard("c", 1, { id: "E-2", name: "基本", category: "Energy", energyType: "Normal" }, false).status).toBe("supported");
  });
});

describe("buildCoverage", () => {
  const cards: Record<string, TcgdexCard> = {
    "TST-001": plain,
    "TST-050": { id: "TST-050", name: "テスト博士", category: "Trainer", trainerType: "Supporter" },
    "TST-051": { id: "TST-051", name: "テスト博士", category: "Trainer", trainerType: "Supporter" }
  };
  const calls: string[] = [];
  const fetcher: CardFetcher = {
    byId: async (id) => (calls.push(`id:${id}`), cards[id] ?? null),
    byName: async (name) =>
      Object.values(cards).filter((c) => c.name === name).map((c) => ({ id: c.id, name: c.name }))
  };

  const deck: DeckList = {
    code: "x",
    name: "t",
    source: "official-site-experimental",
    notes: [],
    entries: [
      { card: { id: "a", name: "テストむし", category: "pokemon", setName: "TST", number: "001/100" }, count: 4 },
      { card: { id: "b", name: "テスト博士", category: "trainer", setName: "Supporter" }, count: 3 },
      { card: { id: "c", name: "存在しないカード", category: "pokemon" }, count: 1 }
    ]
  };

  it("maps 'SET NUMBER/TOTAL' to a print id", () => {
    expect(printId("SV5K", "057/071")).toBe("SV5K-057");
    expect(printId(undefined, "057/071")).toBeNull();
  });

  it("ignores a print id that resolves to a different card and falls back to the name", async () => {
    const wrong: DeckList = {
      ...deck,
      entries: [{ card: { id: "w", name: "テスト博士", category: "pokemon", setName: "TST", number: "001/100" }, count: 2 }]
    };
    const coverage = await buildCoverage(wrong, fetcher);
    expect(coverage.cards[0].tcgdexId).toBe("TST-050");
    expect(coverage.cards[0].ambiguousPrint).toBe(true);
  });

  it("resolves by print id, falls back to name (flagging ambiguity) and reports unresolved cards", async () => {
    const coverage = await buildCoverage(deck, fetcher);
    expect(calls).toContain("id:TST-001");
    expect(coverage.cards.map((c) => c.status)).toEqual(["supported", "gaps", "unresolved"]);
    expect(coverage.cards[1].ambiguousPrint).toBe(true);
    expect(coverage.total).toBe(8);
    expect(coverage.supported).toBe(4);
    expect(coverage.withGaps).toBe(3);
    expect(coverage.unresolved).toBe(1);
    expect(coverage.effectGapCopies).toBe(3);
  });
});
