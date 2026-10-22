import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isKnownPublicHostingEnvironment } from "@/lib/deck/officialFetch";
import type { TcgdexCard } from "./types";

const BASE = "https://api.tcgdex.net/v2/ja";
const CACHE_DIR = () => path.join(process.cwd(), ".cache", "tcgdex");

export type CardFetcher = {
  byId(id: string): Promise<TcgdexCard | null>;
  byName(name: string): Promise<{ id: string; name: string }[]>;
};

async function cached<T>(key: string, load: () => Promise<T | null>): Promise<T | null> {
  const file = path.join(CACHE_DIR(), `${createHash("sha1").update(key).digest("hex")}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    // cache miss
  }
  const value = await load();
  if (value !== null) {
    await mkdir(CACHE_DIR(), { recursive: true });
    await writeFile(file, JSON.stringify(value), "utf8");
  }
  return value;
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "POKECA-BATTLE-LAB/0.1 personal local use" } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`TCGdex responded with HTTP ${response.status}.`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// Personal, local use only, like the official deck fetch: results are cached on this machine (git-ignored) and never redistributed.
export function createTcgdexFetcher(): CardFetcher {
  if (isKnownPublicHostingEnvironment()) {
    throw new Error("Card data fetching is blocked on public hosting platforms. Run this app locally.");
  }
  const pause = () => new Promise((resolve) => setTimeout(resolve, 150));
  return {
    byId: (id) =>
      cached(`id:${id}`, async () => {
        await pause();
        return getJson<TcgdexCard>(`${BASE}/cards/${encodeURIComponent(id)}`);
      }),
    byName: async (name) =>
      (await cached(`name:${name}`, async () => {
        await pause();
        return getJson<{ id: string; name: string }[]>(`${BASE}/cards?name=${encodeURIComponent(name)}`);
      })) ?? []
  };
}
