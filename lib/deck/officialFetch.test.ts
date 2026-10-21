import { afterEach, describe, expect, it } from "vitest";
import { fetchOfficialDeck, isOfficialFetchEnabled } from "./officialFetch";

const ENV_KEYS = [
  "VERCEL",
  "NETLIFY",
  "RENDER",
  "RAILWAY_ENVIRONMENT",
  "FLY_APP_NAME",
  "CF_PAGES",
  "ENABLE_OFFICIAL_DECK_FETCH"
] as const;

let snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function snapshotEnv(): void {
  snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
  }
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("official fetch public-hosting guard", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("disables official fetch when a known public hosting environment variable is present", () => {
    snapshotEnv();
    process.env.ENABLE_OFFICIAL_DECK_FETCH = "true";
    process.env.VERCEL = "1";

    expect(isOfficialFetchEnabled()).toBe(false);
  });

  it("rejects fetchOfficialDeck with a clear message when deployed to a public host", async () => {
    snapshotEnv();
    process.env.ENABLE_OFFICIAL_DECK_FETCH = "true";
    process.env.VERCEL = "1";

    await expect(fetchOfficialDeck("aaaaaa-bbbbbb-cccccc")).rejects.toThrow(/public hosting/i);
  });

  it("stays enabled locally when the flag is on and no public hosting variables are present", () => {
    snapshotEnv();
    process.env.ENABLE_OFFICIAL_DECK_FETCH = "true";
    delete process.env.VERCEL;
    delete process.env.NETLIFY;
    delete process.env.RENDER;
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.FLY_APP_NAME;
    delete process.env.CF_PAGES;

    expect(isOfficialFetchEnabled()).toBe(true);
  });
});
