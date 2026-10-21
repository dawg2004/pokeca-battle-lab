import { parseOfficialDeckHtml } from "./officialParser";
import type { DeckList } from "./types";

const deckCodePattern = /^[A-Za-z0-9]{6}-[A-Za-z0-9]{6}-[A-Za-z0-9]{6}$/;

// POKECA BATTLE LAB is personal, local-use software. pokemon-card.com's terms of use
// (confirmed 2026-08-28, https://www.pokemon-card.com/policy.html) restrict its data to
// "personal enjoyment" and forbid using it on another public network. These environment
// variables are set automatically by well-known public hosting platforms, never on a
// developer's own machine, so they are a reliable signal that this code is no longer
// running as personal local software.
export function isKnownPublicHostingEnvironment(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.RENDER ||
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.FLY_APP_NAME ||
      process.env.CF_PAGES
  );
}

export function isOfficialFetchEnabled(): boolean {
  if (isKnownPublicHostingEnvironment()) return false;
  if (process.env.ENABLE_OFFICIAL_DECK_FETCH === "true") return true;
  if (process.env.NODE_ENV !== "production" && process.env.ENABLE_OFFICIAL_DECK_FETCH !== "false") return true;
  return false;
}

export async function fetchOfficialDeck(code: string): Promise<DeckList> {
  const normalized = code.trim();
  if (!deckCodePattern.test(normalized)) {
    throw new Error("Deck code format must be xxxxxx-xxxxxx-xxxxxx.");
  }

  if (isKnownPublicHostingEnvironment()) {
    throw new Error(
      "Official deck fetching is blocked on public hosting platforms. POKECA BATTLE LAB is personal, local-use software: pokemon-card.com's terms limit use of its data to personal enjoyment on a non-public network. Run this app locally instead."
    );
  }

  if (!isOfficialFetchEnabled()) {
    throw new Error("Official deck fetching is disabled. Set ENABLE_OFFICIAL_DECK_FETCH=true on the server (local use only).");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://www.pokemon-card.com/deck/confirm.html/deckID/${encodeURIComponent(normalized)}/`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "POKECA-BATTLE-LAB/0.1 personal deck-code verifier",
        Accept: "text/html,application/xhtml+xml"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Official site responded with HTTP ${response.status}.`);
    }

    return parseOfficialDeckHtml(normalized, await response.text());
  } finally {
    clearTimeout(timeout);
  }
}
