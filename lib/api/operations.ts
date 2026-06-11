import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { FREUD, buildContextBlock, htmlToPlainText } from "@/lib/freud";
import type { Entry } from "@/lib/types";
import { db, plainTextToHtml } from "@/lib/api/server";
import { cleanEnv } from "@/lib/env";

/**
 * Współdzielona logika operacji Echo (token → RPC SECURITY DEFINER).
 * Używana przez serwer MCP; mapuje błędy na czytelne wyjątki.
 */

export class ApiOpError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

interface EntryRow {
  id: string;
  date: string;
  content: string;
  title: string | null;
  photo_url: string | null;
  created_at: string;
}

function toDto(row: EntryRow) {
  return {
    id: row.id,
    date: row.date,
    title: row.title ?? null,
    content: row.content,
    text: htmlToPlainText(row.content),
    createdAt: row.created_at,
  };
}

function rowToEntry(row: { id: string; date: string; content: string; photo_url?: string | null }): Entry {
  return { id: row.id, date: row.date, content: row.content, photoUrl: row.photo_url ?? undefined };
}

function dayPart(input?: string | null): string | null {
  if (!input) return null;
  const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function handleDbError(error: { message?: string; code?: string }): never {
  const msg = error.message ?? "";
  if (msg.includes("invalid_api_key") || error.code === "28000") {
    throw new ApiOpError("invalid_token", "Nieprawidłowy lub odwołany token API.");
  }
  throw new ApiOpError("server_error", "Błąd serwera podczas przetwarzania żądania.");
}

export async function addEntry(
  tokenHash: string,
  input: { content: string; title?: string | null; date?: string | null }
) {
  if (!input.content || !input.content.trim()) {
    throw new ApiOpError("bad_request", "Pole 'content' jest wymagane (niepusty tekst).");
  }
  let dateIso: string;
  if (input.date && input.date.trim()) {
    const onlyDate = dayPart(input.date);
    dateIso = input.date.includes("T")
      ? new Date(input.date).toISOString()
      : new Date(`${onlyDate}T12:00:00.000Z`).toISOString();
    if (Number.isNaN(Date.parse(dateIso))) {
      throw new ApiOpError("bad_request", "Pole 'date' ma nieprawidłowy format.");
    }
  } else {
    dateIso = new Date().toISOString();
  }

  const { data, error } = await db().rpc("api_add_entry", {
    p_token_hash: tokenHash,
    p_content: plainTextToHtml(input.content),
    p_title: input.title ?? null,
    p_date: dateIso,
  });
  if (error) handleDbError(error);
  return toDto(data as EntryRow);
}

export async function getEntriesByDate(tokenHash: string, date?: string | null) {
  const day = dayPart(date) ?? todayISODate();
  const { data, error } = await db().rpc("api_get_entries_by_date", {
    p_token_hash: tokenHash,
    p_date: day,
  });
  if (error) handleDbError(error);
  const rows = (data ?? []) as EntryRow[];
  return { date: day, count: rows.length, entries: rows.map(toDto) };
}

export async function askTherapist(
  tokenHash: string,
  input: { message: string; date?: string | null }
) {
  if (!input.message || !input.message.trim()) {
    throw new ApiOpError("bad_request", "Pole 'message' jest wymagane (niepusty tekst).");
  }
  const apiKey = cleanEnv(process.env.XAI_API_KEY);
  if (!apiKey) {
    throw new ApiOpError("server_error", "Brak konfiguracji modelu AI po stronie serwera.");
  }
  const date = dayPart(input.date) ?? todayISODate();

  const { data, error } = await db().rpc("api_therapist_context", {
    p_token_hash: tokenHash,
    p_date: date,
    p_days: 30,
  });
  if (error) handleDbError(error);

  const ctx = (data ?? { day: [], recent: [] }) as {
    day: { id: string; date: string; content: string; photo_url?: string | null }[];
    recent: { id: string; date: string; content: string; photo_url?: string | null }[];
  };
  const dayEntries = (ctx.day ?? []).map(rowToEntry);
  const recentEntries = (ctx.recent ?? []).map(rowToEntry);

  const xai = createXai({ apiKey });
  // Wszystkie wpisy danego dnia jako oś rozmowy; reszta (30 dni) jako tło.
  const system = `${FREUD.systemPrompt}\n\n${buildContextBlock(dayEntries, recentEntries)}`;

  try {
    const { text } = await generateText({
      model: xai("grok-4-1-fast-reasoning"),
      system,
      prompt: input.message,
    });
    return { reply: text, contextDate: date, contextEntries: dayEntries.length };
  } catch {
    throw new ApiOpError("ai_error", "Nie udało się uzyskać odpowiedzi od modelu AI.");
  }
}
