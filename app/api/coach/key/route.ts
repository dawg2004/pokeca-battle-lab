import { NextResponse } from "next/server";
import { clearCoachKey, isValidKeyFormat, saveCoachKey } from "@/lib/coach/keystore";
import { isCoachConfigured } from "@/lib/coach/gemini";
import { isKnownPublicHostingEnvironment } from "@/lib/deck/officialFetch";

const PREVIEW_LENGTH = 10;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

// The key file is only writable from this machine, by this app's own pages.
function guard(request: Request): NextResponse | null {
  if (isKnownPublicHostingEnvironment()) {
    return NextResponse.json({ ok: false, error: "公開ホスティング環境ではキーを保存できません。" }, { status: 403 });
  }
  const hostHeader = request.headers.get("host") ?? "";
  const host = hostHeader.replace(/:\d+$/, "");
  if (!LOOPBACK.has(host)) {
    return NextResponse.json(
      { ok: false, error: "キーの保存は localhost で開いた画面からのみ可能です。" },
      { status: 403 }
    );
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== hostHeader) {
    return NextResponse.json({ ok: false, error: "不正なリクエストです。" }, { status: 403 });
  }
  return null;
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
