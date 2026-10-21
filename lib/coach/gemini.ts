import { CoachError, type CoachProvider } from "./coach";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function isCoachConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export const geminiProvider: CoachProvider = async (systemPrompt, userPrompt) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new CoachError("GEMINI_API_KEY が未設定です（.env.local に設定してください）。");

  const model = process.env.COACH_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
      })
    });

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        detail = body.error?.message ? ` ${body.error.message.slice(0, 160)}` : "";
      } catch {
        // body was not JSON; the status code alone is reported
      }
      throw new CoachError(`Gemini APIがエラーを返しました (HTTP ${response.status}).${detail}`);
    }
    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    if (!text) throw new CoachError("Geminiの返答が空でした。");
    return text;
  } catch (error) {
    if (error instanceof CoachError) throw error;
    throw new CoachError("Gemini APIに接続できませんでした。");
  } finally {
    clearTimeout(timeout);
  }
};
