import type { DeckList } from "@/lib/deck/types";
import { classifyCard, unresolvedCard } from "./classify";
import type { CardFetcher } from "./tcgdex";
import type { CardSupport, DeckCoverage } from "./types";

// Official deck pages give "SET NUMBER/TOTAL" for Pokemon, which is exactly TCGdex's "SET-NUMBER" print id.
export function printId(setName?: string, number?: string): string | null {
  if (!setName || !number) return null;
  const n = number.split("/")[0]?.trim();
  return n ? `${setName}-${n}` : null;
}

export async function buildCoverage(deck: DeckList, fetcher: CardFetcher): Promise<DeckCoverage> {
  const cards: CardSupport[] = [];

  for (const entry of deck.entries) {
    const { name, category, setName, number } = entry.card;
    let card = null;
    let ambiguous = false;
    let printMissed = false;

    const id = category === "pokemon" ? printId(setName, number) : null;
    if (id) {
      const byPrint = await fetcher.byId(id);
      // Never attribute another card's data to this entry: the print id must resolve to the same card name.
      if (byPrint && byPrint.name === name) card = byPrint;
      else printMissed = true;
    }

    if (!card) {
      const exact = (await fetcher.byName(name)).filter((hit) => hit.name === name);
      if (exact.length > 0) {
        // The deck named an exact print we could not confirm, so the name match may be a different print.
        ambiguous = exact.length > 1 || printMissed;
        card = await fetcher.byId(exact[0].id);
      }
    }

    cards.push(card ? classifyCard(name, entry.count, card, ambiguous) : unresolvedCard(name, entry.count));
  }

  const copies = (pick: (c: CardSupport) => boolean) => cards.filter(pick).reduce((sum, c) => sum + c.count, 0);
  return {
    total: copies(() => true),
    supported: copies((c) => c.status === "supported"),
    withGaps: copies((c) => c.status === "gaps"),
    unresolved: copies((c) => c.status === "unresolved"),
    effectGapCopies: copies((c) => c.gaps.some((g) => g.kind === "effect")),
    engineGapCopies: copies((c) => c.gaps.some((g) => g.kind === "engine")),
    cards
  };
}
