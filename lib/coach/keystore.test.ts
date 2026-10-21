import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearCoachKey, isValidKeyFormat, saveCoachKey } from "./keystore";

const KEY = "AIzaSyTESTTESTTESTTESTTESTTESTTESTTEST12";
let dir: string;
let previous: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "coach-key-"));
  previous = process.env.GEMINI_API_KEY;
});

afterEach(async () => {
  if (previous === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previous;
  await rm(dir, { recursive: true, force: true });
});

describe("coach key store", () => {
  it("writes the key to .env.local with owner-only permissions and updates process.env", async () => {
    await saveCoachKey(KEY, dir);
    const file = path.join(dir, ".env.local");
    expect(await readFile(file, "utf8")).toBe(`GEMINI_API_KEY=${KEY}\n`);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    expect(process.env.GEMINI_API_KEY).toBe(KEY);
  });

  it("replaces an existing key and keeps unrelated lines", async () => {
    await writeFile(path.join(dir, ".env.local"), "FOO=bar\nGEMINI_API_KEY=old\n");
    await saveCoachKey(KEY, dir);
    expect(await readFile(path.join(dir, ".env.local"), "utf8")).toBe(`FOO=bar\nGEMINI_API_KEY=${KEY}\n`);
  });

  it("rejects malformed keys, including ones that could inject extra env lines", async () => {
    expect(isValidKeyFormat("short")).toBe(false);
    expect(isValidKeyFormat(`${KEY}\nOTHER=1`)).toBe(false);
    await expect(saveCoachKey("bad key with spaces and more than twenty chars", dir)).rejects.toThrow();
  });

  it("clears only the key line", async () => {
    await writeFile(path.join(dir, ".env.local"), `FOO=bar\nGEMINI_API_KEY=${KEY}\n`);
    await clearCoachKey(dir);
    expect(await readFile(path.join(dir, ".env.local"), "utf8")).toBe("FOO=bar\n");
  });
});
