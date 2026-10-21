import { describe, expect, it } from "vitest";
import { createInitialBattle, generateLegalActions } from "@/lib/battle/engine";
import { sampleDeck } from "@/lib/deck/sampleDecks";
import { askCoach, CoachError, type CoachProvider } from "./coach";
import { summarizeForCoach } from "./summarize";

function setup() {
  const state = createInitialBattle({ playerDeck: sampleDeck, opponentDeck: sampleDeck, seed: 7 });
  const actions = generateLegalActions(state);
  return { state, actions, position: summarizeForCoach(state, actions) };
}

describe("AI coach", () => {
  it("shows only the acting player's hand by name and the opponent's hand as a count", () => {
    const { state, position } = setup();
    expect(position.yourHand).toHaveLength(state.zones.player.hand.length);
    expect(position.opponentHandCount).toBe(state.zones.opponent.hand.length);
    expect(JSON.stringify(position)).not.toContain(state.zones.opponent.hand[0]?.instanceId ?? "__none__");
  });

  it("accepts a recommendation that is one of the legal actions", async () => {
    const { position } = setup();
    const [first, second] = position.actions;
    const provider: CoachProvider = async () =>
      JSON.stringify({ recommendedActionId: first.id, reason: "r", alternativeActionId: second.id, risk: "k" });

    const advice = await askCoach(position, provider);
    expect(advice.recommendedActionId).toBe(first.id);
    expect(advice.alternativeActionId).toBe(second.id);
  });

  it("rejects an action id that is not in the legal list", async () => {
    const { position } = setup();
    const provider: CoachProvider = async () =>
      JSON.stringify({ recommendedActionId: "attack-made-up", reason: "r", alternativeActionId: null, risk: "k" });

    await expect(askCoach(position, provider)).rejects.toBeInstanceOf(CoachError);
  });

  it("drops an illegal alternative but keeps a legal recommendation", async () => {
    const { position } = setup();
    const provider: CoachProvider = async () =>
      JSON.stringify({
        recommendedActionId: position.actions[0].id,
        reason: "r",
        alternativeActionId: "nope",
        risk: "k"
      });

    const advice = await askCoach(position, provider);
    expect(advice.alternativeActionId).toBeNull();
  });

  it("rejects non-JSON replies", async () => {
    const { position } = setup();
    await expect(askCoach(position, async () => "not json")).rejects.toBeInstanceOf(CoachError);
  });
});
