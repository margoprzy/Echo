import { createXai } from "@ai-sdk/xai";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { FREUD, buildContextBlock } from "@/lib/freud";
import { cleanEnv } from "@/lib/env";
import type { Entry } from "@/lib/types";

// Strumieniowanie odpowiedzi reasoning-modelu bywa dłuższe niż domyślny limit.
export const maxDuration = 60;

interface FreudRequest {
  messages: UIMessage[];
  dayEntries?: Entry[]; // wszystkie wpisy z analizowanego dnia
  contextEntry?: Entry | null; // kompatybilność wsteczna (pojedynczy wpis)
  recentEntries?: Entry[];
}

export async function POST(req: Request) {
  const apiKey = cleanEnv(process.env.XAI_API_KEY);
  if (!apiKey) {
    return Response.json(
      { error: "Brak klucza XAI_API_KEY po stronie serwera." },
      { status: 500 }
    );
  }

  let body: FreudRequest;
  try {
    body = (await req.json()) as FreudRequest;
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const { messages, dayEntries, contextEntry = null, recentEntries = [] } = body;
  if (!Array.isArray(messages)) {
    return Response.json({ error: "Brak wiadomości." }, { status: 400 });
  }

  // Wpisy dnia: preferuj pełną listę; fallback do pojedynczego wpisu (stare klienty).
  const focalDay = Array.isArray(dayEntries) && dayEntries.length > 0
    ? dayEntries
    : contextEntry
    ? [contextEntry]
    : [];

  const xai = createXai({ apiKey });
  const system = `${FREUD.systemPrompt}\n\n${buildContextBlock(focalDay, recentEntries)}`;

  const result = streamText({
    model: xai("grok-4-1-fast-reasoning"),
    system,
    messages: await convertToModelMessages(messages),
  });

  // Nie wysyłamy toku rozumowania modelu do przeglądarki — pokazujemy tylko gotową odpowiedź.
  return result.toUIMessageStreamResponse({ sendReasoning: false });
}
