import { chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY_NAME = "GEMINI_API_KEY";
// Google issues both `AIza...` and newer dotted `AQ.xxx` keys. No whitespace, quotes or `#`, so nothing can leak into other env lines.
const KEY_PATTERN = /^[A-Za-z0-9._-]{20,256}$/;

export function isValidKeyFormat(key: string): boolean {
  return KEY_PATTERN.test(key);
}

function envPath(dir: string): string {
  return path.join(dir, ".env.local");
}

async function readLines(file: string): Promise<string[]> {
  try {
    const text = await readFile(file, "utf8");
    return text.split("\n").filter((line, i, all) => !(i === all.length - 1 && line === ""));
  } catch {
    return [];
  }
}

async function writeLines(file: string, lines: string[]): Promise<void> {
  await writeFile(file, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(file, 0o600);
}

export async function saveCoachKey(key: string, dir = process.cwd()): Promise<void> {
  if (!isValidKeyFormat(key)) throw new Error("APIキーの形式が正しくありません。");
  const file = envPath(dir);
  const lines = (await readLines(file)).filter((line) => !line.startsWith(`${KEY_NAME}=`));
  lines.push(`${KEY_NAME}=${key}`);
  await writeLines(file, lines);
  process.env[KEY_NAME] = key;
}

export async function clearCoachKey(dir = process.cwd()): Promise<void> {
  const file = envPath(dir);
  const lines = (await readLines(file)).filter((line) => !line.startsWith(`${KEY_NAME}=`));
  await writeLines(file, lines);
  delete process.env[KEY_NAME];
}
