import { sampleDeck, secondSampleDeck } from "./sampleDecks";
import type { DeckList, DeckSummary } from "./types";

const fixtureByCode = new Map([
  [sampleDeck.code.toLowerCase(), sampleDeck],
  [secondSampleDeck.code.toLowerCase(), secondSampleDeck]
]);

export function summarizeDeck(deck: DeckList): DeckSummary {
  return deck.entries.reduce(
    (summary, entry) => {
      summary.total += entry.count;
      if (entry.card.category === "trainer") {
        summary.trainers += entry.count;
      } else {
        summary[entry.card.category] += entry.count;
      }
      return summary;
    },
    { total: 0, pokemon: 0, trainers: 0, energy: 0 }
  );
}

export function resolveDeckCode(rawCode: string): DeckList {
  const code = rawCode.trim();
  const fixture = fixtureByCode.get(code.toLowerCase());

  if (fixture) {
    return fixture;
  }

  return {
    ...sampleDeck,
    code,
    name: "Battle Lab Starter 60",
    notes: [
      "Unknown deck code. MVP v0.1 falls back to the local starter fixture.",
      "A production official-site adapter needs written permission or an approved data source before enabling."
    ]
  };
}
