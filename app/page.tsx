"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Cards,
  Database,
  Flask,
  Key,
  Lightbulb,
  Lightning,
  Play,
  ShieldCheck,
  Sword,
  Warning
} from "@phosphor-icons/react";
import { applyAction, createInitialBattle, generateLegalActions } from "@/lib/battle/engine";
import { describeAction, heuristicDecisionEngine } from "@/lib/battle/decision";
import type { BattleState, LegalAction, PlayerId } from "@/lib/battle/types";
import { resolveDeckCode, summarizeDeck } from "@/lib/deck/resolveDeck";
import { sampleDeck } from "@/lib/deck/sampleDecks";
import type { DeckList } from "@/lib/deck/types";
import type { CoachAdvice } from "@/lib/coach/coach";

const initialCode = "xx4cGx-D0BtE3-8cGaGK";

const categoryLabel = {
  pokemon: "Pokemon",
  trainer: "Trainers",
  energy: "Energy"
};

const categoryColor = {
  pokemon: "text-[var(--blue)]",
  trainer: "text-[var(--purple)]",
  energy: "text-[var(--danger)]"
};

function ZonePanel({
  title,
  state,
  player,
  tone
}: {
  title: string;
  state: BattleState;
  player: PlayerId;
  tone: "self" | "rival";
}) {
  const zone = state.zones[player];
  const activeHp = zone.active?.hp ?? 0;
  const remainingHp = Math.max(0, activeHp - (zone.active?.damage ?? 0));
  const hpPercent = activeHp > 0 ? Math.round((remainingHp / activeHp) * 100) : 0;
  const hpBarColor = hpPercent <= 25 ? "var(--danger)" : hpPercent <= 55 ? "var(--accent)" : "var(--good)";
  const toneBorder = tone === "self" ? "border-l-[var(--blue)]" : "border-l-[var(--danger)]";
  const toneText = tone === "self" ? "text-[var(--blue)]" : "text-[var(--danger)]";
  const toneGlow = tone === "self" ? "79, 163, 255" : "239, 111, 108";

  return (
    <section
      className={`rounded-lg border border-[var(--line)] ${toneBorder} border-l-[3px] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.2)]`}
      style={{
        backgroundImage: `radial-gradient(120% 160% at 0% 0%, rgba(${toneGlow}, 0.16), transparent 60%)`,
        backgroundColor: "rgba(23, 25, 29, 0.82)"
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <span className="font-mono text-xs text-[var(--muted)]">{zone.prizeTaken}/6 prizes</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Active</p>
          <p className="mt-2 min-h-10 font-semibold">{zone.active?.name ?? "None"}</p>
          <p className={`mt-1 font-mono text-xs ${toneText}`}>
            {zone.active ? `${remainingHp}/${activeHp} HP` : "0 HP"}
          </p>
          {zone.active ? (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
              <div
                key={remainingHp}
                className="hp-bar-fill h-full rounded-full"
                style={{ width: `${hpPercent}%`, backgroundColor: hpBarColor }}
              />
            </div>
          ) : null}
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Bench</p>
          <p className="mt-2 text-2xl font-semibold">{zone.bench.length}</p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">max 5</p>
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Hand</p>
          <p className="mt-2 text-2xl font-semibold">{zone.hand.length}</p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">hidden info later</p>
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Deck</p>
          <p className="mt-2 text-2xl font-semibold">{zone.deck.length}</p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">{zone.discard.length} discard</p>
        </div>
      </div>
    </section>
  );
}

function DeckTable({ deck }: { deck: DeckList }) {
  const summary = summarizeDeck(deck);
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-[rgba(23,25,29,0.78)]">
      <div
        className="h-[3px] w-full"
        style={{ backgroundImage: "linear-gradient(90deg, var(--blue), var(--purple), var(--danger))" }}
      />
      <div className="p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{deck.name}</h2>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">{deck.code}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
          <span className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2">{summary.total} total</span>
          <span className="rounded-md border border-[var(--blue)]/40 bg-[var(--surface-strong)] px-3 py-2 text-[var(--blue)]">
            {summary.pokemon} P
          </span>
          <span className="rounded-md border border-[var(--purple)]/40 bg-[var(--surface-strong)] px-3 py-2 text-[var(--purple)]">
            {summary.trainers} T
          </span>
          <span className="rounded-md border border-[var(--danger)]/40 bg-[var(--surface-strong)] px-3 py-2 text-[var(--danger)]">
            {summary.energy} E
          </span>
        </div>
      </div>
      <div className="max-h-[360px] overflow-auto rounded-md border border-[var(--line)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[var(--surface-strong)] text-xs text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Count</th>
              <th className="px-3 py-2">Card</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Set</th>
            </tr>
          </thead>
          <tbody>
            {deck.entries.map((entry) => (
              <tr key={entry.card.id} className="border-t border-[var(--line)]">
                <td className="px-3 py-2 font-mono text-[var(--accent)]">x{entry.count}</td>
                <td className="px-3 py-2 font-medium">{entry.card.name}</td>
                <td className={`px-3 py-2 font-medium ${categoryColor[entry.card.category]}`}>
                  {categoryLabel[entry.card.category]}
                </td>
                <td className="px-3 py-2 text-[var(--muted)]">{entry.card.setName ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
        {deck.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
      </div>
    </section>
  );
}

function actionDetail(action: LegalAction): string {
  if (action.type === "ATTACK") return `${action.attack.damage} damage`;
  if (action.type === "END_TURN") return "pass priority";
  return action.id.split("-").slice(0, 3).join("-");
}

export default function Home() {
  const [deckCode, setDeckCode] = useState(initialCode);
  const [deck, setDeck] = useState<DeckList>(() => resolveDeckCode(initialCode));
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [deckStatus, setDeckStatus] = useState<"idle" | "loading" | "error">("idle");
  const [deckError, setDeckError] = useState<string | null>(null);
  const [savedLogs, setSavedLogs] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return JSON.parse(window.localStorage.getItem("pokeca-battle-logs") ?? "[]").length;
  });

  const [coach, setCoach] = useState<
    { status: "idle" } | { status: "loading" } | { status: "error"; message: string; needsKey?: boolean } | { status: "ok"; advice: CoachAdvice }
  >({ status: "idle" });

  const [keyInput, setKeyInput] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [keyNotice, setKeyNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coach/key")
      .then((response) => response.json() as Promise<{ configured: boolean; prefix?: string | null }>)
      .then((payload) => {
        setKeyConfigured(payload.configured);
        setKeyPrefix(payload.prefix ?? null);
      })
      .catch(() => setKeyConfigured(null));
  }, []);

  const legalActions = useMemo(() => (battle ? generateLegalActions(battle) : []), [battle]);

  const loadDeck = async () => {
    setDeckStatus("loading");
    setDeckError(null);
    setBattle(null);

    try {
      const response = await fetch(`/api/deck?code=${encodeURIComponent(deckCode)}`);
      const payload = (await response.json()) as { ok: boolean; deck: DeckList; error?: string };
      setDeck(payload.deck);
      setDeckStatus(payload.ok ? "idle" : "error");
      setDeckError(payload.error ?? null);
    } catch {
      setDeck(resolveDeckCode(deckCode));
      setDeckStatus("error");
      setDeckError("Deck API request failed. Falling back to the local fixture.");
    }
  };

  const startBattle = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    setCoach({ status: "idle" });
    setBattle(createInitialBattle({ playerDeck: deck, opponentDeck: sampleDeck, seed }));
  };

  const apply = (action: LegalAction) => {
    setCoach({ status: "idle" });
    setBattle((current) => (current ? applyAction(current, action) : current));
  };

  const saveCoachKey = async () => {
    setKeyBusy(true);
    setKeyError(null);
    try {
      const response = await fetch("/api/coach/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput })
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; prefix?: string | null };
      if (!payload.ok) {
        setKeyError(payload.error ?? "キーを保存できませんでした。");
        return;
      }
      setKeyInput("");
      setKeyConfigured(true);
      setKeyPrefix(payload.prefix ?? null);
      const wasWaitingForKey = coach.status === "error" && Boolean(coach.needsKey);
      setKeyPanelOpen(false);
      if (wasWaitingForKey) {
        await askCoachApi();
      } else {
        setCoach({ status: "idle" });
        setKeyNotice("APIキーを保存しました。");
      }
    } catch {
      setKeyError("キーを保存できませんでした。");
    } finally {
      setKeyBusy(false);
    }
  };

  const deleteCoachKey = async () => {
    setKeyBusy(true);
    setKeyError(null);
    try {
      const response = await fetch("/api/coach/key", { method: "DELETE" });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setKeyError(payload.error ?? "キーを削除できませんでした。");
        return;
      }
      setKeyConfigured(false);
      setKeyPrefix(null);
      setCoach({ status: "idle" });
      setKeyNotice("APIキーを削除しました。");
    } catch {
      setKeyError("キーを削除できませんでした。");
    } finally {
      setKeyBusy(false);
    }
  };

  const askCoachApi = async () => {
    if (!battle || legalActions.length === 0) return;
    setCoach({ status: "loading" });
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(battle)
      });
      const payload = (await response.json()) as { ok: boolean; advice?: CoachAdvice; error?: string; code?: string };
      setCoach(
        payload.ok && payload.advice
          ? { status: "ok", advice: payload.advice }
          : {
              status: "error",
              message: payload.error ?? "AI Coach から返答がありませんでした。",
              needsKey: payload.code === "NO_KEY"
            }
      );
    } catch {
      setCoach({ status: "error", message: "AI Coach に接続できませんでした。" });
    }
  };

  const askAi = () => {
    if (!battle || legalActions.length === 0) return;
    apply(heuristicDecisionEngine(battle, legalActions));
  };

  const saveLog = () => {
    if (!battle) return;
    const existing = JSON.parse(window.localStorage.getItem("pokeca-battle-logs") ?? "[]");
    window.localStorage.setItem(
      "pokeca-battle-logs",
      JSON.stringify([{ id: battle.id, winner: battle.winner, log: battle.log, savedAt: new Date().toISOString() }, ...existing])
    );
    setSavedLogs(existing.length + 1);
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[1480px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--accent)]">
            <Flask size={22} weight="duotone" />
            <span className="font-mono text-xs uppercase tracking-[0.14em]">Tactical simulator</span>
          </div>
          <h1
            className="text-2xl font-bold tracking-normal sm:text-4xl"
            style={{
              fontFamily: "'Montserrat Subrayada', var(--font-geist), sans-serif",
              backgroundImage: "linear-gradient(180deg, #fff3d6, var(--accent) 55%, #c9962c)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 2px 0 rgba(0, 0, 0, 0.4))"
            }}
          >
            POKÉCA BATTLE LAB
          </h1>
          <p className="mt-2 max-w-[62ch] text-sm text-[var(--muted)]">
            デッキコードから研究用リストを読み込み、合法手だけをAIが選ぶバトルを進めます。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 font-mono text-xs text-[var(--muted)]">
          <span className="rounded-md border border-[var(--line)] px-3 py-2">engine v0.1</span>
          <span className="rounded-md border border-[var(--purple)]/40 px-3 py-2 text-[var(--purple)]">rule AI</span>
          <span className="rounded-md border border-[var(--line)] px-3 py-2">{savedLogs} logs</span>
        </div>
      </header>

      {!battle ? (
      <section key="setup" className="animate-screen-in grid gap-4 lg:grid-cols-[420px_1fr]">
        <div
          className="rounded-lg border border-[var(--line)] border-l-[3px] border-l-[var(--blue)] p-4"
          style={{
            backgroundImage: "radial-gradient(140% 100% at 0% 0%, rgba(79, 163, 255, 0.14), transparent 62%)",
            backgroundColor: "rgba(23, 25, 29, 0.88)"
          }}
        >
          <label className="mb-2 block text-sm font-semibold" htmlFor="deck-code">
            Deck code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <input
              id="deck-code"
              value={deckCode}
              onChange={(event) => setDeckCode(event.target.value)}
              className="min-h-11 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-3 font-mono text-sm text-slate-100 outline-none transition focus:border-[var(--accent)]"
            />
            <button
              onClick={loadDeck}
              disabled={deckStatus === "loading"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-bold text-zinc-950 transition active:translate-y-px"
            >
              <Database size={18} weight="bold" />
              {deckStatus === "loading" ? "LOADING" : "LOAD DECK"}
            </button>
          </div>
          <div className="mt-4 rounded-md border border-[rgba(245,200,75,0.35)] bg-[rgba(245,200,75,0.08)] p-3 text-xs leading-5 text-[var(--muted)]">
            <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--accent)]">
              <Warning size={16} weight="bold" />
              Official adapter policy
            </div>
            公式取得はサーバー側の実験機能です。Vercelでは `ENABLE_OFFICIAL_DECK_FETCH=true` を設定したときだけ動きます。
          </div>
          {deckError ? (
            <div className="mt-3 rounded-md border border-[rgba(239,111,108,0.45)] bg-[rgba(239,111,108,0.1)] p-3 text-xs leading-5 text-[var(--danger)]">
              {deckError}
            </div>
          ) : null}
          <button
            onClick={startBattle}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--accent)] px-4 text-sm font-bold text-[var(--accent)] transition hover:bg-[rgba(245,200,75,0.1)] active:translate-y-px"
          >
            <Play size={18} weight="bold" />
            バトル準備
          </button>
        </div>
        <DeckTable deck={deck} />
      </section>
      ) : (
      <section key="battle" className="animate-screen-in grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <button
              onClick={() => {
                setCoach({ status: "idle" });
                setBattle(null);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
            >
              ← デッキ選択に戻る
            </button>
            <ZonePanel title="Opponent" state={battle} player="opponent" tone="rival" />
            <section
              className="rounded-lg border border-[var(--line)] p-4"
              style={{
                backgroundImage:
                  "radial-gradient(120% 220% at 100% 0%, rgba(178, 107, 255, 0.14), transparent 60%)",
                backgroundColor: "rgba(32, 36, 42, 0.86)"
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-[var(--muted)]">Turn {battle.turn}</p>
                  <h2 className="text-xl font-bold">
                    {battle.winner ? `Winner: ${battle.winner}` : `Current: ${battle.currentPlayer}`}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={askAi}
                    disabled={legalActions.length === 0 || Boolean(battle.winner)}
                    className="animate-glow-pulse inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--good)] px-4 text-sm font-bold text-zinc-950 disabled:animate-none disabled:opacity-45"
                  >
                    <Brain size={18} weight="bold" />
                    AIに相談
                  </button>
                  <button
                    onClick={askCoachApi}
                    disabled={legalActions.length === 0 || Boolean(battle.winner) || coach.status === "loading"}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--purple)] px-4 text-sm font-bold text-[var(--purple)] transition hover:bg-[rgba(178,107,255,0.12)] disabled:opacity-45"
                  >
                    <Lightbulb size={18} weight="bold" />
                    {coach.status === "loading" ? "考え中…" : "コーチに聞く"}
                  </button>
                  <button
                    onClick={() => {
                      setKeyNotice(null);
                      setKeyError(null);
                      setKeyPanelOpen((open) => !open);
                    }}
                    aria-expanded={keyPanelOpen}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--purple)] hover:text-[var(--purple)]"
                  >
                    <Key size={18} weight="bold" />
                    APIキー
                  </button>
                  <button
                    onClick={saveLog}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm font-bold text-slate-100"
                  >
                    <ShieldCheck size={18} weight="bold" />
                    Save log
                  </button>
                </div>
              </div>
            </section>
            <ZonePanel title="Player" state={battle} player="player" tone="self" />
          </div>

          <aside className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
            <section
              className="rounded-lg border border-[var(--line)] border-t-[3px] border-t-[var(--blue)] p-4"
              style={{
                backgroundImage: "radial-gradient(100% 140% at 100% 0%, rgba(79, 163, 255, 0.12), transparent 60%)",
                backgroundColor: "rgba(23, 25, 29, 0.86)"
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Lightning className="text-[var(--blue)]" size={20} weight="duotone" />
                <h2 className="font-semibold">Legal actions</h2>
              </div>
              {keyNotice ? (
                <div className="mb-3 rounded-md border border-[var(--good)]/40 bg-[rgba(95,208,155,0.1)] p-3 text-xs text-[var(--good)]">
                  {keyNotice}
                </div>
              ) : null}
              {coach.status === "error" ? (
                <div className="mb-3 rounded-md border border-[rgba(239,111,108,0.45)] bg-[rgba(239,111,108,0.1)] p-3 text-xs leading-5 text-[var(--danger)]">
                  {coach.message}
                </div>
              ) : null}
              {keyPanelOpen || (coach.status === "error" && coach.needsKey) ? (
                <div className="mb-3 space-y-2 rounded-md border border-[var(--purple)]/40 bg-[rgba(178,107,255,0.08)] p-3 text-xs leading-5 text-[var(--muted)]">
                  <p className="flex items-center gap-1.5 font-bold text-[var(--purple)]">
                    <Key size={14} weight="bold" />
                    Gemini APIキー
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        keyConfigured ? "bg-[rgba(95,208,155,0.18)] text-[var(--good)]" : "bg-[rgba(239,111,108,0.18)] text-[var(--danger)]"
                      }`}
                    >
                      {keyConfigured === null ? "確認中" : keyConfigured ? "設定済み" : "未設定"}
                    </span>
                    {keyConfigured && keyPrefix ? (
                      <code className="font-mono text-[11px] font-normal text-[var(--muted)]">{keyPrefix}…</code>
                    ) : null}
                  </p>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-[var(--purple)] px-3 py-1.5 font-bold text-zinc-950 transition hover:brightness-110"
                  >
                    <Key size={14} weight="bold" />
                    Gemini APIキーを作る（無料枠あり）
                  </a>
                  <p>{keyConfigured ? "新しいキーを貼り付けて保存すると、今のキーを置き換えます。" : "作ったキーをここに貼り付けて保存してください。"}</p>
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveCoachKey();
                    }}
                  >
                    <input
                      id="gemini-key"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={keyInput}
                      onChange={(event) => setKeyInput(event.target.value)}
                      placeholder="AIza... / AQ...."
                      className="min-h-9 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-2 font-mono text-xs text-slate-100 outline-none focus:border-[var(--purple)]"
                    />
                    <button
                      type="submit"
                      disabled={keyBusy || keyInput.trim() === ""}
                      className="min-h-9 rounded-md border border-[var(--purple)] px-3 font-bold text-[var(--purple)] transition hover:bg-[rgba(178,107,255,0.12)] disabled:opacity-45"
                    >
                      {keyBusy ? "保存中…" : keyConfigured ? "変更" : "保存"}
                    </button>
                  </form>
                  {keyError ? <p className="text-[var(--danger)]">{keyError}</p> : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>キーはこのPC内の <code className="font-mono">.env.local</code> に保存されます。画面に出すのは先頭10文字だけで、全体は再表示されません。</p>
                    {keyConfigured ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("保存済みのAPIキーを削除しますか？（Google側のキーは削除されません）")) {
                            void deleteCoachKey();
                          }
                        }}
                        disabled={keyBusy}
                        className="rounded-md border border-[var(--danger)]/60 px-2 py-1 font-bold text-[var(--danger)] transition hover:bg-[rgba(239,111,108,0.12)] disabled:opacity-45"
                      >
                        キーを削除
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {coach.status === "ok" ? (
                <div className="animate-log-in mb-3 rounded-md border border-[var(--purple)]/50 bg-[rgba(178,107,255,0.1)] p-3 text-xs leading-5">
                  <p className="mb-1 flex items-center gap-1.5 font-bold text-[var(--purple)]">
                    <Lightbulb size={14} weight="bold" />
                    コーチのおすすめ
                  </p>
                  <p>{coach.advice.reason}</p>
                  {coach.advice.risk ? <p className="mt-1 text-[var(--muted)]">リスク: {coach.advice.risk}</p> : null}
                </div>
              ) : null}
              <div className="max-h-[330px] space-y-2 overflow-auto">
                {legalActions.map((action) => {
                  const recommended = coach.status === "ok" && coach.advice.recommendedActionId === action.id;
                  const alternative = coach.status === "ok" && coach.advice.alternativeActionId === action.id;
                  return (
                  <button
                    key={action.id}
                    onClick={() => apply(action)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md border bg-[var(--surface-strong)] px-3 py-2 text-left text-sm transition hover:border-[var(--blue)] active:translate-y-px ${
                      recommended
                        ? "border-[var(--purple)] shadow-[0_0_0_1px_var(--purple)]"
                        : alternative
                          ? "border-[var(--purple)]/50"
                          : "border-[var(--line)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Sword size={16} className="text-[var(--accent)]" />
                      {describeAction(action)}
                      {recommended ? (
                        <span className="rounded bg-[var(--purple)] px-1.5 py-0.5 text-[10px] font-bold text-zinc-950">おすすめ</span>
                      ) : alternative ? (
                        <span className="rounded border border-[var(--purple)]/60 px-1.5 py-0.5 text-[10px] font-bold text-[var(--purple)]">次点</span>
                      ) : null}
                    </span>
                    <span className="font-mono text-xs text-[var(--muted)]">{actionDetail(action)}</span>
                  </button>
                  );
                })}
              </div>
            </section>

            <section
              className="rounded-lg border border-[var(--line)] border-t-[3px] border-t-[var(--purple)] p-4"
              style={{
                backgroundImage: "radial-gradient(100% 140% at 100% 0%, rgba(178, 107, 255, 0.12), transparent 60%)",
                backgroundColor: "rgba(23, 25, 29, 0.86)"
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Cards className="text-[var(--purple)]" size={20} weight="duotone" />
                <h2 className="font-semibold">Game log</h2>
              </div>
              <div className="max-h-[330px] space-y-2 overflow-auto">
                {battle.log.map((entry) => (
                  <div
                    key={entry.id}
                    className="animate-log-in rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-3"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      Turn {entry.turn} / {entry.actor}
                    </p>
                    <p className="mt-1 text-sm">{entry.message}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
      </section>
      )}
    </main>
  );
}
