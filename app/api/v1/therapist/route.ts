import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { FREUD, buildContextBlock } from "@/lib/freud";
import { embedText } from "@/lib/embeddings";
import { toVectorLiteral } from "@/lib/embeddings";
import type { Entry } from "@/lib/types";
import { db, json, apiError, requireToken, mapDbError, preflight, plainTextToHtml, setRequestContext } from "@/lib/api/server";

/**
 * /api/v1/therapist
 *  POST — zadaje pytanie cyfrowemu psychoterapeucie. Wysyłasz i odbierasz tekst.
 *  Domyślnie kontekstem jest dzień dzisiejszy; pole 'date' pozwala wskazać inny dzień,
 *  by dać terapeucie kontekst konkretnego wpisu.
 * Uwierzytelnianie: Authorization: Bearer <token>.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EntryRow {
  id: string;
  date: string;
  content: string;
  photo_url: string | null;
}

interface SearchResultRow extends EntryRow {
  score?: number;
}

function rowToEntry(row: EntryRow | SearchResultRow): Entry {
  return { id: row.id, date: row.date, content: row.content, photoUrl: row.photo_url ?? undefined };
}

function parseDate(input: string | null | undefined): string {
  if (typeof input === "string") {
    const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return new Date().toISOString().slice(0, 10);
}

export async function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  setRequestContext(req);
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return apiError("server_error", "Brak konfiguracji modelu AI po stronie serwera.", 500);
  }

  const auth = requireToken(req);
  if ("response" in auth) return auth.response;

  let body: { message?: unknown; date?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Treść żądania musi być poprawnym JSON-em.", 400);
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return apiError("bad_request", "Pole 'message' jest wymagane (niepusty tekst).", 400);
  }
  if (body.date != null && typeof body.date !== "string") {
    return apiError("bad_request", "Pole 'date' musi być tekstem (YYYY-MM-DD).", 400);
  }

  const date = parseDate(body.date as string | undefined);

  // Pobierz kontekst: wpisy z danego dnia + tło z ostatnich 30 dni.
  const { data, error } = await db().rpc("api_therapist_context", {
    p_token_hash: auth.tokenHash,
    p_date: date,
    p_days: 30,
  });
  if (error) return mapDbError(error);

  const ctx = (data ?? { day: [], recent: [] }) as { day: EntryRow[]; recent: EntryRow[] };
  const dayEntries = (ctx.day ?? []).map(rowToEntry);
  const recentEntries = (ctx.recent ?? []).map(rowToEntry);

  // Wyszukiwanie hybrydowe: embedding zapytania + search_entries.
  let relevantEntries: Entry[] = [];
  let relevantCount = 0;
  try {
    const queryEmbedding = await embedText(body.message);
    const queryEmbeddingLit = toVectorLiteral(queryEmbedding);
    const { data: searchResults, error: searchError } = await db().rpc("api_search_entries", {
      p_token_hash: auth.tokenHash,
      p_query_text: body.message,
      p_query_embedding: queryEmbeddingLit,
      p_limit: 8,
    });
    if (!searchError && searchResults) {
      relevantEntries = (searchResults as SearchResultRow[]).map(rowToEntry);
      relevantCount = relevantEntries.length;
    }
  } catch (embedError) {
    // Embeddingi opcjonalne — jeśli się nie uda, kontynuujemy bez nich.
    console.warn("Embedding/search error:", embedError);
  }

  const xai = createXai({ apiKey });
  // Wszystkie wpisy danego dnia jako oś rozmowy; powiązane wpisy z wyszukiwania; reszta (30 dni) jako tło.
  const system = `${FREUD.systemPrompt}\n\n${buildContextBlock(dayEntries, recentEntries, relevantEntries)}`;

  try {
    const { text } = await generateText({
      model: xai("grok-4-1-fast-reasoning"),
      system,
      prompt: body.message,
    });
    return json({
      reply: text,
      contextDate: date,
      contextEntries: dayEntries.length,
      relevantCount,
    });
  } catch {
    return apiError("ai_error", "Nie udało się uzyskać odpowiedzi od modelu AI.", 502);
  }
}
