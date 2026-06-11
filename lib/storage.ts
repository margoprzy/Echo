import { supabase } from "./supabase";
import type { Entry } from "./types";

interface EntryRow {
  id: string;
  user_id: string;
  date: string;
  content: string;
  photo_url: string | null;
}

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    content: row.content,
    photoUrl: row.photo_url ?? undefined,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("id, user_id, date, content, photo_url")
    .order("date", { ascending: false });
  if (error) {
    console.error("getEntries failed", error);
    return [];
  }
  return (data ?? []).map(rowToEntry);
}

export async function saveEntry(entry: Entry): Promise<void> {
  const userId = await currentUserId();
  if (!userId) {
    console.error("saveEntry: no user");
    return;
  }
  const row: EntryRow = {
    id: entry.id,
    user_id: userId,
    date: entry.date,
    content: entry.content,
    photo_url: entry.photoUrl ?? null,
  };
  const { error } = await supabase.from("entries").upsert(row);
  if (error) console.error("saveEntry failed", error);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) console.error("deleteEntry failed", error);
}

// --- Rozmowy z AI (Freud) ---

export type ChatRole = "user" | "assistant";

export interface StoredMessage {
  id: string;
  role: ChatRole;
  content: string;
}

/**
 * Znajduje istniejącą rozmowę dla danego trybu (wątek wpisu lub wątek ogólny)
 * albo tworzy nową. Zwraca id rozmowy lub null, gdy brak zalogowanego użytkownika.
 */
export async function getOrCreateConversation(
  mode: "entry" | "general",
  entryId?: string | null
): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) {
    console.error("getOrCreateConversation: no user");
    return null;
  }

  let query = supabase
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("mode", mode);
  query = mode === "entry" && entryId ? query.eq("entry_id", entryId) : query.is("entry_id", null);

  const { data: existing, error: selectError } = await query.limit(1).maybeSingle();
  if (selectError) {
    console.error("getOrCreateConversation select failed", selectError);
    return null;
  }
  if (existing) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      mode,
      entry_id: mode === "entry" ? entryId ?? null : null,
    })
    .select("id")
    .single();
  if (insertError) {
    console.error("getOrCreateConversation insert failed", insertError);
    return null;
  }
  return created.id as string;
}

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getMessages failed", error);
    return [];
  }
  return (data ?? []) as StoredMessage[];
}

export async function appendMessage(
  conversationId: string,
  role: ChatRole,
  content: string
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) {
    console.error("appendMessage: no user");
    return;
  }
  const { error } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
  });
  if (error) {
    console.error("appendMessage failed", error);
    return;
  }
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
