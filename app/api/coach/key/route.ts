import { NextResponse } from "next/server";
import { clearCoachKey, isValidKeyFormat, saveCoachKey } from "@/lib/coach/keystore";
import { isCoachConfigured } from "@/lib/coach/gemini";
import { localOnlyGuard } from "@/lib/server/localOnly";

const PREVIEW_LENGTH = 10;
function guard(request: Request): NextResponse | null {
  return localOnlyGuard(
    request,
    "公開ホスティング環境ではキーを保存できません。",
    "キーの保存は localhost で開いた画面からのみ可能です。"
  );
}

// Only the first characters of the key are ever returned, and only to localhost.
function previewOf(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key ? key.slice(0, PREVIEW_LENGTH) : null;
}

export async function GET(request: Request) {
  const configured = isCoachConfigured();
  return NextResponse.json({ configured, prefix: configured && !guard(request) ? previewOf() : null });
}

export async function POST(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;

  let key = "";
  try {
    const body = (await request.json()) as { key?: unknown };
    key = typeof body.key === "string" ? body.key.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "リクエストが不正です。" }, { status: 400 });
  }
  if (!isValidKeyFormat(key)) {
    return NextResponse.json({ ok: false, error: "APIキーの形式が正しくありません。コピーし直してください。" }, { status: 400 });
  }

  try {
    await saveCoachKey(key);
    return NextResponse.json({ ok: true, configured: true, prefix: previewOf() });
  } catch {
    return NextResponse.json({ ok: false, error: "キーを保存できませんでした。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  await clearCoachKey();
  return NextResponse.json({ ok: true, configured: false });
}
