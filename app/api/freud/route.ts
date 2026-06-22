import { createXai } from "@ai-sdk/xai";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { FREUD, buildContextBlock } from "@/lib/freud";
import { embedText, toVectorLiteral } from "@/lib/embeddings";
import { cleanEnv } from "@/lib/env";
import type { Entry } from "@/lib/types";
import { db } from "@/lib/api/server";
import { createClient } from "@supabase/supabase-js";

// Strumieniowanie odpowiedzi reasoning-modelu bywa dłuższe niż domyślny limit.
export const maxDuration = 60;

interface FreudRequest {
  messages: UIMessage[];
  dayEntries?: Entry[]; // wszystkie wpisy z analizowanego dnia
  contextEntry?: Entry | null; // kompatybilność wsteczna (pojedynczy wpis)
  recentEntries?: Entry[];
  sessionToken?: string; // token sesji Supabase (opcjonalny, dla retrievalu)
}

interface SearchResultRow {
  id: string;
  date: string;
  content: string;
  score?: number;
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

  const { messages, dayEntries, contextEntry = null, recentEntries = [], sessionToken } = body;
  if (!Array.isArray(messages)) {
    return Response.json({ error: "Brak wiadomości." }, { status: 400 });
  }

  // Wpisy dnia: preferuj pełną listę; fallback do pojedynczego wpisu (stare klienty).
  const focalDay = Array.isArray(dayEntries) && dayEntries.length > 0
    ? dayEntries
    : contextEntry
    ? [contextEntry]
    : [];

  // Klient Supabase z tożsamością użytkownika (auth.uid() z sesji) — do RPC poniżej.
  const supabaseAuthed = sessionToken
    ? createClient(
        cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
        cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        { global: { headers: { Authorization: `Bearer ${sessionToken}` } } }
      )
    : null;

  // Prompt systemowy = aktywny terapeusta (jeśli kupiony/darmowy), inaczej fallback do Freuda.
  let systemPrompt = FREUD.systemPrompt;
  if (supabaseAuthed) {
    try {
      const { data, error } = await supabaseAuthed.rpc("get_active_therapist_prompt");
      const row = Array.isArray(data) ? data[0] : null;
      if (!error && row?.system_prompt) {
        systemPrompt = row.system_prompt as string;
      }
    } catch (err) {
      console.warn("get_active_therapist_prompt error:", err);
    }
  }

  // Wyszukiwanie hybrydowe: embedding ostatniej wiadomości użytkownika + search_entries.
  let relevantEntries: Entry[] = [];
  if (supabaseAuthed) {
    try {
      const lastUserMessage = messages
        .slice()
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMessage) {
        const userText = lastUserMessage.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("");

        if (userText) {
          const queryEmbedding = await embedText(userText);
          const queryEmbeddingLit = toVectorLiteral(queryEmbedding);

          // Woła search_entries z auth.uid() — tożsamość z sesji.
          const { data: searchResults, error: searchError } = await supabaseAuthed.rpc("search_entries", {
            p_query_text: userText,
            p_query_embedding: queryEmbeddingLit,
            p_limit: 8,
          });
          if (!searchError && searchResults) {
            relevantEntries = (searchResults as SearchResultRow[]).map((r) => ({
              id: r.id,
              date: r.date,
              content: r.content,
            }));
          }
        }
      }
    } catch (err) {
      // Retrieval opcjonalny — jeśli się nie uda, kontynuujemy bez niego.
      console.warn("Search error in /api/freud:", err);
    }
  }

  const xai = createXai({ apiKey });
  const system = `${systemPrompt}\n\n${buildContextBlock(focalDay, recentEntries, relevantEntries)}`;

  const result = streamText({
    model: xai("grok-4-1-fast-reasoning"),
    system,
    messages: await convertToModelMessages(messages),
  });

  // Nie wysyłamy toku rozumowania modelu do przeglądarki — pokazujemy tylko gotową odpowiedź.
  return result.toUIMessageStreamResponse({ sendReasoning: false });
}
