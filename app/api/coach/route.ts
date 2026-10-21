import { NextResponse } from "next/server";
import { generateLegalActions } from "@/lib/battle/engine";
import type { BattleState } from "@/lib/battle/types";
import { askCoach, CoachError } from "@/lib/coach/coach";
import { geminiProvider, isCoachConfigured } from "@/lib/coach/gemini";
import { summarizeForCoach } from "@/lib/coach/summarize";

export async function POST(request: Request) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      { ok: false, code: "NO_KEY", error: "AI Coach は未設定です。.env.local に GEMINI_API_KEY を設定してください。" },
      { status: 200 }
    );
  }

  let state: BattleState;
  try {
    state = (await request.json()) as BattleState;
    if (!state?.zones?.player || !state?.zones?.opponent) throw new Error("bad state");
  } catch {
    return NextResponse.json({ ok: false, error: "局面データが不正です。" }, { status: 400 });
  }

  const actions = generateLegalActions(state);
  if (actions.length === 0) {
    return NextResponse.json({ ok: false, error: "選べる手がありません（試合終了）。" }, { status: 200 });
  }

  try {
    const advice = await askCoach(summarizeForCoach(state, actions), geminiProvider);
    return NextResponse.json({ ok: true, advice });
  } catch (error) {
    const message = error instanceof CoachError ? error.message : "AI Coach で不明なエラーが発生しました。";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
