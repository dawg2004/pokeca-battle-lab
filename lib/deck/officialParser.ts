import type { CardCategory, CardDefinition, DeckEntry, DeckList, TrainerKind } from "./types";

type OfficialBucket = {
  field: string;
  category: CardCategory;
  label: string;
  trainerKind?: TrainerKind;
};

const buckets: OfficialBucket[] = [
  { field: "deck_pke", category: "pokemon", label: "Pokemon" },
  { field: "deck_gds", category: "trainer", label: "Goods", trainerKind: "item" },
  { field: "deck_tool", category: "trainer", label: "Pokemon Tool", trainerKind: "tool" },
  { field: "deck_tech", category: "trainer", label: "Technical Machine", trainerKind: "item" },
  { field: "deck_sup", category: "trainer", label: "Supporter", trainerKind: "supporter" },
  { field: "deck_sta", category: "trainer", label: "Stadium", trainerKind: "stadium" },
  { field: "deck_ene", category: "energy", label: "Energy" }
];

function unescapeJsString(value: string): string {
  return value.replace(/\\'/g, "'").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
}

function extractHiddenValue(html: string, id: string): string {
  const pattern = new RegExp(`<input[^>]+id=["']${id}["'][^>]+value=["']([^"']*)["']`, "i");
  return html.match(pattern)?.[1] ?? "";
}

function parseNames(html: string, arrayName: "searchItemName" | "searchItemNameAlt"): Map<string, string> {
  const names = new Map<string, string>();
  const pattern = new RegExp(`PCGDECK\\.${arrayName}\\[(\\d+)\\]=['"]((?:\\\\.|[^'"])*)['"];`, "g");
  for (const match of html.matchAll(pattern)) {
    names.set(match[1], unescapeJsString(match[2]));
  }
  return names;
}

function parseSetInfo(displayName: string): { name: string; setName?: string; number?: string } {
  const match = displayName.match(/^(.*)\(([^()]*)\)$/);
  if (!match) return { name: displayName };

  const meta = match[2].trim();
  const parts = meta.split(/\s+/);
  const maybeNumber = parts.at(-1);
  if (!maybeNumber?.includes("/")) return { name: displayName };

  return {
    name: match[1].trim(),
    setName: parts.slice(0, -1).join(" ") || undefined,
    number: maybeNumber
  };
}

function battleDefaults(
  card: Omit<CardDefinition, "attacks" | "hp" | "isBasic" | "trainerEffect" | "retreatCost" | "trainerKind">,
  trainerKind?: TrainerKind
): CardDefinition {
  if (card.category === "pokemon") {
    return {
      ...card,
      hp: 90,
      isBasic: true,
      retreatCost: 1,
      attacks: [
        { id: "official-light-hit", name: "Lab Proxy Hit", cost: 1, damage: 30 },
        { id: "official-heavy-hit", name: "Lab Proxy Burst", cost: 2, damage: 60 }
      ]
    };
  }

  if (card.category === "trainer") {
    const usesTrainerEffect = trainerKind !== "stadium" && trainerKind !== "tool";
    return {
      ...card,
      trainerKind,
      trainerEffect: usesTrainerEffect ? "draw2" : undefined
    };
  }

  return card;
}

function parseBucketEntries(value: string, bucket: OfficialBucket, names: Map<string, string>, altNames: Map<string, string>): DeckEntry[] {
  if (!value) return [];

  return value.split("-").flatMap((token) => {
    const [officialId, count] = token.split("_");
    if (!officialId || !count) return [];

    const displayName = names.get(officialId) ?? altNames.get(officialId) ?? `Official card ${officialId}`;
    const parsed = parseSetInfo(displayName);
    const card = battleDefaults(
      {
        id: `official-${officialId}`,
        name: parsed.name,
        category: bucket.category,
        setName: parsed.setName ?? bucket.label,
        number: parsed.number
      },
      bucket.trainerKind
    );

    return [{ card, count: Number.parseInt(count, 10) || 0 }];
  });
}

export function parseOfficialDeckHtml(code: string, html: string): DeckList {
  const names = parseNames(html, "searchItemName");
  const altNames = parseNames(html, "searchItemNameAlt");
  const entries = buckets.flatMap((bucket) => parseBucketEntries(extractHiddenValue(html, bucket.field), bucket, names, altNames));
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);

  if (entries.length === 0) {
    throw new Error("Official deck recipe was not found in the page HTML.");
  }

  return {
    code,
    name: `Official Deck ${code}`,
    source: "official-site-experimental",
    entries,
    notes: [
      `Official site recipe parsed from public deck HTML. Total cards: ${total}.`,
      "Card names and counts are for personal verification. Battle uses proxy stats until licensed card data and exact effects are available.",
      "Trainer kind (Supporter / Item / Stadium / Tool) is read directly from the official site's own field categorization, so that part is accurate. Retreat cost is a uniform placeholder like HP. Evolution chains and Abilities are not implemented for official cards yet, pending a licensed data source.",
      "Do not cache, redistribute, or commercialize official-site content without permission."
    ]
  };
}
