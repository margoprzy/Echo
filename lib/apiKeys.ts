import { supabase } from "./supabase";

/**
 * Zarządzanie kluczami API po stronie przeglądarki (zalogowany użytkownik).
 * Surowy token pokazujemy tylko raz — w bazie ląduje wyłącznie jego SHA-256.
 */

export interface ApiKeyInfo {
  id: string;
  prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `echo_sk_${hex}`;
}

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, prefix, label, created_at, last_used_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listApiKeys failed", error);
    return [];
  }
  return (data ?? []) as ApiKeyInfo[];
}

/**
 * Tworzy nowy klucz. Zwraca SUROWY token (do pokazania raz) — nie da się go odzyskać później.
 */
export async function createApiKey(label?: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    console.error("createApiKey: brak zalogowanego użytkownika");
    return null;
  }
  const token = randomToken();
  const token_hash = await sha256Hex(token);
  const prefix = token.slice(0, 16); // echo_sk_ + 8 znaków

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    token_hash,
    prefix,
    label: label?.trim() || null,
  });
  if (error) {
    console.error("createApiKey failed", error);
    return null;
  }
  return token;
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) {
    console.error("deleteApiKey failed", error);
    return false;
  }
  return true;
}
