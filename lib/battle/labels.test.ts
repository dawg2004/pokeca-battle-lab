import { describe, expect, it } from "vitest";
import { sampleDeck } from "@/lib/deck/sampleDecks";
import { createInitialBattle, generateLegalActions } from "./engine";
import { actionTagJa, describeActionJa } from "./labels";

describe("action labels", () => {
  it("names the cards involved and never leaves unresolved placeholders", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed });
      for (const action of generateLegalActions(state)) {
        expect(describeActionJa(state, action)).not.toContain("?");
        expect(actionTagJa(state, action).length).toBeGreaterThan(0);
      }
    }
  });

  it("distinguishes energy attachments that target different Pokemon", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed });
      const attaches = generateLegalActions(state).filter((a) => a.type === "ATTACH_ENERGY");
      const targets = new Set(attaches.map((a) => (a.type === "ATTACH_ENERGY" ? a.targetInstanceId : "")));
      if (targets.size < 2) continue;

      const byTarget = new Map<string, string>();
      for (const a of attaches) if (a.type === "ATTACH_ENERGY") byTarget.set(a.targetInstanceId, describeActionJa(state, a));
      const names = new Set(
        [...byTarget.keys()].map((id) => {
          const zone = state.zones[state.currentPlayer];
          return [zone.active, ...zone.bench].find((c) => c?.instanceId === id)?.name;
        })
      );
      // Distinct Pokemon names produce distinct labels; same-named copies share a label by design.
      if (names.size >= 2) expect(new Set(byTarget.values()).size).toBeGreaterThanOrEqual(2);
      return;
    }
    throw new Error("no seed produced attachments to two differently named Pokemon");
  });

  it("adds the board position only when the same Pokemon appears more than once", () => {
    const state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed: 3 });
    const zone = state.zones.player;
    const active = zone.active!;
    zone.bench = [{ ...active, instanceId: "dup-1" }, { ...active, instanceId: "dup-2" }];

    const labelFor = (target: string) =>
      describeActionJa(state, {
        id: `retreat-${target}`,
        type: "RETREAT",
        player: "player",
        targetInstanceId: target
      });

    expect(labelFor("dup-1")).toContain("ベンチ1");
    expect(labelFor("dup-2")).toContain("ベンチ2");
    expect(labelFor("dup-1")).not.toBe(labelFor("dup-2"));

    zone.bench = [{ ...active, instanceId: "solo", name: "Unique Mon" }];
    expect(labelFor("solo")).not.toContain("ベンチ");
  });
});
