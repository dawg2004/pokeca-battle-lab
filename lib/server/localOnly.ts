import { NextResponse } from "next/server";
import { isKnownPublicHostingEnvironment } from "@/lib/deck/officialFetch";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

// Routes that read/write local files or call third-party data sources are only for this machine's own pages.
// Returns an error response to send, or null when the request may proceed.
export function localOnlyGuard(request: Request, hostingMessage: string, hostMessage: string): NextResponse | null {
  if (isKnownPublicHostingEnvironment()) {
    return NextResponse.json({ ok: false, error: hostingMessage }, { status: 403 });
  }
  const hostHeader = request.headers.get("host") ?? "";
  if (!LOOPBACK.has(hostHeader.replace(/:\d+$/, ""))) {
    return NextResponse.json({ ok: false, error: hostMessage }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== hostHeader) {
    return NextResponse.json({ ok: false, error: "不正なリクエストです。" }, { status: 403 });
  }
  return null;
}
