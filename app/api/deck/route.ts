import { NextResponse } from "next/server";
import { fetchOfficialDeck, isOfficialFetchEnabled } from "@/lib/deck/officialFetch";
import { resolveDeckCode } from "@/lib/deck/resolveDeck";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ ok: false, error: "Deck code is required." }, { status: 400 });
  }

  try {
    const deck = await fetchOfficialDeck(code);
    return NextResponse.json({ ok: true, deck, officialFetchEnabled: isOfficialFetchEnabled() });
  } catch (error) {
    const fallback = resolveDeckCode(code);
    const message = error instanceof Error ? error.message : "Unknown official deck fetch error.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        deck: {
          ...fallback,
          notes: [message, ...fallback.notes]
        },
        officialFetchEnabled: isOfficialFetchEnabled()
      },
      { status: 200 }
    );
  }
}
