import type { BattleCard, BattleState, LegalAction } from "./types";

function findCard(state: BattleState, instanceId: string): BattleCard | null {
  for (const zone of Object.values(state.zones)) {
    const hit = [zone.active, ...zone.bench, ...zone.hand].find((card) => card?.instanceId === instanceId);
    if (hit) return hit;
  }
  return null;
}

// Name of a card, with its position appended when the same player has another in-play card of the same name.
function nameWithSlot(state: BattleState, instanceId: string): string {
  for (const zone of Object.values(state.zones)) {
    const inPlay = [zone.active, ...zone.bench];
    const index = inPlay.findIndex((card) => card?.instanceId === instanceId);
    if (index < 0) continue;
    const card = inPlay[index] as BattleCard;
    const duplicated = inPlay.filter((other) => other?.name === card.name).length > 1;
    if (!duplicated) return card.name;
    return `${card.name}（${index === 0 ? "バトル場" : `ベンチ${index}`}）`;
  }
  return findCard(state, instanceId)?.name ?? "?";
}

const trainerKindLabel = { supporter: "サポート", item: "グッズ", stadium: "スタジアム", tool: "どうぐ" } as const;

// Human-readable Japanese label that names the cards involved, so identical action types are distinguishable.
export function describeActionJa(state: BattleState, action: LegalAction): string {
  const name = (id: string) => nameWithSlot(state, id);

  switch (action.type) {
    case "PLAY_BASIC":
      return `${name(action.cardInstanceId)}をベンチに出す`;
    case "ATTACH_ENERGY":
      return `${name(action.targetInstanceId)}に${name(action.cardInstanceId)}を付ける`;
    case "EVOLVE":
      return `${name(action.targetInstanceId)}を${name(action.cardInstanceId)}に進化させる`;
    case "USE_TRAINER":
      return `${name(action.cardInstanceId)}を使う`;
    case "ATTACH_TOOL":
      return `${name(action.targetInstanceId)}に${name(action.cardInstanceId)}を付ける`;
    case "USE_ABILITY": {
      const source = findCard(state, action.sourceInstanceId);
      return `${name(action.sourceInstanceId)}の特性「${source?.ability?.name ?? "?"}」を使う`;
    }
    case "RETREAT": {
      const active = state.zones[action.player].active;
      return `${active?.name ?? "?"}をにげさせ、${name(action.targetInstanceId)}と入れ替える`;
    }
    case "ATTACK": {
      const active = state.zones[action.player].active;
      return `${active?.name ?? "?"}の「${action.attack.name}」で攻撃`;
    }
    case "END_TURN":
      return "ターンを終える";
  }
}

// Short right-hand tag shown next to the label (replaces internal ids).
export function actionTagJa(state: BattleState, action: LegalAction): string {
  switch (action.type) {
    case "PLAY_BASIC":
      return "ベンチ";
    case "ATTACH_ENERGY":
      return "エネルギー";
    case "EVOLVE":
      return "進化";
    case "USE_TRAINER": {
      const kind = findCard(state, action.cardInstanceId)?.trainerKind ?? "item";
      return trainerKindLabel[kind];
    }
    case "ATTACH_TOOL":
      return "どうぐ";
    case "USE_ABILITY":
      return "特性";
    case "RETREAT":
      return "にげる";
    case "ATTACK":
      return `${action.attack.damage}ダメージ`;
    case "END_TURN":
      return "パス";
  }
}
