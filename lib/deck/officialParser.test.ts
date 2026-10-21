import { describe, expect, it } from "vitest";
import { parseOfficialDeckHtml } from "./officialParser";

const html = `
<input type="hidden" name="deck_pke" id="deck_pke" value="47388_3_1-49792_4_1" />
<input type="hidden" name="deck_gds" id="deck_gds" value="49573_3_1" />
<input type="hidden" name="deck_tool" id="deck_tool" value="" />
<input type="hidden" name="deck_tech" id="deck_tech" value="" />
<input type="hidden" name="deck_sup" id="deck_sup" value="48443_4_1" />
<input type="hidden" name="deck_sta" id="deck_sta" value="" />
<input type="hidden" name="deck_ene" id="deck_ene" value="23275_6_1" />
<script>
PCGDECK.searchItemName[47388]='ラボストライカーex(TST 001/010)';
PCGDECK.searchItemNameAlt[47388]='ラボストライカーex';
PCGDECK.searchItemName[49792]='ラボウォール(TST 002/010)';
PCGDECK.searchItemNameAlt[49792]='ラボウォール';
PCGDECK.searchItemName[49573]='テスト用グッズ';
PCGDECK.searchItemNameAlt[49573]='テスト用グッズ';
PCGDECK.searchItemName[48443]='テスト用サポート';
PCGDECK.searchItemNameAlt[48443]='テスト用サポート';
PCGDECK.searchItemName[23275]='テスト用エネルギー';
PCGDECK.searchItemNameAlt[23275]='テスト用エネルギー';
</script>`;

describe("parseOfficialDeckHtml", () => {
  it("extracts counts, names, categories, and set metadata", () => {
    const deck = parseOfficialDeckHtml("9gn6PL-yECm7y-ngLLnn", html);

    expect(deck.source).toBe("official-site-experimental");
    expect(deck.entries).toHaveLength(5);
    expect(deck.entries.reduce((sum, entry) => sum + entry.count, 0)).toBe(20);
    expect(deck.entries[0].card).toMatchObject({
      name: "ラボストライカーex",
      category: "pokemon",
      setName: "TST",
      number: "001/010"
    });
    expect(deck.entries.at(-1)?.card.category).toBe("energy");
  });
});
